// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

// Hosted layers from Remotion - these are region-specific Lambda layers
const hostedLayers: Record<string, { layerArn: string; version: number }[]> = {
  "eu-central-1": [
    {
      layerArn:
        "arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-fonts-arm64",
      version: 17,
    },
    {
      layerArn:
        "arn:aws:lambda:eu-central-1:678892195805:layer:remotion-binaries-chromium-arm64",
      version: 18,
    },
  ],
  "us-east-1": [
    {
      layerArn:
        "arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-fonts-arm64",
      version: 13,
    },
    {
      layerArn:
        "arn:aws:lambda:us-east-1:678892195805:layer:remotion-binaries-chromium-arm64",
      version: 21,
    },
  ],
};

export default $config({
  app(input) {
    return {
      name: "prompt-to-motion",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "eu-central-1",
        },
        command: true,
      },
    };
  },
  async run() {
    const aws = await import("@pulumi/aws");
    const command = await import("@pulumi/command");
    const pulumi = await import("@pulumi/pulumi");
    const path = await import("path");
    const { execSync } = await import("child_process");

    const region = "eu-central-1";
    const name = "Remotion";

    // 1. Create S3 bucket for site content and renders
    const bucket = new aws.s3.Bucket(`${name}Bucket`, {
      forceDestroy: true,
      website: { indexDocument: "index.html" },
    });

    const bucketOwnershipControls = new aws.s3.BucketOwnershipControls(
      `${name}BucketOwnershipControls`,
      {
        bucket: bucket.id,
        rule: { objectOwnership: "BucketOwnerPreferred" },
      },
      { dependsOn: [bucket] },
    );

    const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}BucketPublicAccessBlock`,
      {
        bucket: bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      { dependsOn: [bucket, bucketOwnershipControls] },
    );

    const bucketAclV2 = new aws.s3.BucketAclV2(
      `${name}BucketAclV2`,
      { bucket: bucket.id, acl: "public-read" },
      { dependsOn: [bucket, bucketOwnershipControls, bucketPublicAccessBlock] },
    );

    // Lifecycle rules for auto-deleting renders
    const getDeleteAfterFilter = (days: number) => ({
      id: `DELETE_AFTER_${days}_DAYS`,
      filter: { prefix: `renders/${days}-day` },
      status: "Enabled" as const,
      expiration: { days },
    });

    new aws.s3.BucketLifecycleConfigurationV2(
      `${name}LifecycleConfigV2`,
      {
        bucket: bucket.id,
        rules: [
          getDeleteAfterFilter(1),
          getDeleteAfterFilter(3),
          getDeleteAfterFilter(7),
          getDeleteAfterFilter(30),
        ],
      },
      { dependsOn: [bucket] },
    );

    // 2. Bundle the Remotion site locally (synchronous, before deploy)
    const buildDir = path.join(process.cwd(), "build");
    console.log("Bundling Remotion site...");
    execSync(
      "rm -rf build && bunx remotion bundle --out-dir=build src/remotion/index.tsx",
      {
        cwd: process.cwd(),
        stdio: "inherit",
      },
    );

    // 3. Sync build folder to S3 AFTER bucket is ready using pulumi/command
    // This runs as part of the deployment, ensuring proper ordering
    new command.local.Command(
      `${name}SyncToS3`,
      {
        create: pulumi.interpolate`aws s3 sync ${buildDir} s3://${bucket.bucket}/ --acl public-read --delete`,
        // Re-run sync on every deploy by using a trigger
        triggers: [Date.now().toString()],
      },
      { dependsOn: [bucket, bucketAclV2, bucketPublicAccessBlock] },
    );

    // 4. Create IAM role for Lambda
    const role = new aws.iam.Role(`${name}Role`, {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "lambda.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });

    // 5. Create Lambda function
    const zipPath = path.join(
      process.cwd(),
      "node_modules",
      "@remotion/lambda",
      "remotionlambda-arm64.zip",
    );

    const layers = hostedLayers[region];
    if (!layers) {
      throw new Error(`No hosted layers found for region ${region}`);
    }

    const lambdaFunction = new aws.lambda.Function(`${name}Function`, {
      role: role.arn,
      runtime: "nodejs18.x",
      handler: "index.handler",
      architectures: ["arm64"],
      code: new pulumi.asset.FileArchive(zipPath),
      description: "Renders a Remotion video",
      timeout: 240,
      memorySize: 2048,
      layers: layers.map(({ layerArn, version }) => `${layerArn}:${version}`),
      ephemeralStorage: { size: 10240 },
    });

    // 6. Create IAM policy and attach to role
    const policy = new aws.iam.Policy(`${name}Policy`, {
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["s3:*"],
            Resource: [pulumi.interpolate`${bucket.arn}/*`, bucket.arn],
            Effect: "Allow",
          },
          {
            Action: ["lambda:*"],
            Resource: [lambdaFunction.arn],
            Effect: "Allow",
          },
          {
            Effect: "Allow",
            Action: ["logs:CreateLogGroup"],
            Resource: ["arn:aws:logs:*:*:log-group:/aws/lambda-insights"],
          },
          {
            Effect: "Allow",
            Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
            Resource: [
              pulumi.interpolate`arn:aws:logs:*:*:log-group:/aws/lambda/${lambdaFunction.name}`,
              "arn:aws:logs:*:*:log-group:/aws/lambda-insights:*",
            ],
          },
        ],
      },
    });

    new aws.iam.PolicyAttachment(`${name}RolePolicyAttachment`, {
      policyArn: policy.arn,
      roles: [role.name],
    });

    const siteUrl = pulumi.interpolate`https://${bucket.bucket}.s3.${region}.amazonaws.com/index.html`;

    // Create a linkable resource for the Remotion infrastructure
    const Remotion = new sst.Linkable("Remotion", {
      properties: {
        functionName: lambdaFunction.name,
        siteUrl,
        bucketName: bucket.bucket,
        region,
      },
    });

    return {
      functionName: lambdaFunction.name,
      siteUrl,
      bucketName: bucket.bucket,
      region,
      Remotion,
    };
  },
});
