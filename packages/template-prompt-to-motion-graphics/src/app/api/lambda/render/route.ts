import { AwsRegion, RenderMediaOnLambdaOutput } from "@remotion/lambda/client";
import { renderMediaOnLambda } from "@remotion/lambda/client";
import { Resource } from "sst";
import { RenderRequest } from "../../../../../types/schema";
import { executeApi } from "../../../../helpers/api-response";

const COMPOSITION_ID = "DynamicComp";

export const POST = executeApi<RenderMediaOnLambdaOutput, typeof RenderRequest>(
  RenderRequest,
  async (req, body) => {
    const result = await renderMediaOnLambda({
      codec: "h264",
      functionName: Resource.Remotion.functionName,
      region: Resource.Remotion.region as AwsRegion,
      serveUrl: Resource.Remotion.siteUrl,
      forceBucketName: Resource.Remotion.bucketName,
      composition: COMPOSITION_ID,
      inputProps: body.inputProps,
      framesPerLambda: 60,
      downloadBehavior: {
        type: "download",
        fileName: "video.mp4",
      },
    });

    return result;
  },
);
