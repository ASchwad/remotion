# template-code-generation

AI-powered code generation template for Remotion.

## Adding examples and capabilities

When adding new capabilities to the assistant, we have to first create some examples to let the system know what we can do. So first we add the example to the template, tweak it a bit more to get it right with our taste and then add it as an example potentially to the system prompt of the assistant.

## Model Selection

GPT5.1 Low reasoning seems to be a good middle ground between generation speed and output quality.

## Usage

```bash
npx create-video@latest --template code-generation
```

## Development

```bash
bun install
bun dev
```

## Rendering

We deploy a "shell" composition to S3 that doesn't contain any actual animation logic. Instead, it receives the AI-generated code as a string via inputProps, compiles it on the fly using Babel (which runs right in Lambda's headless browser), and then renders whatever component that code produces. So the flow is: our Next.js app sends the raw code to Lambda, Lambda opens our shell site from S3, the shell compiles and executes the code, Remotion takes screenshots frame by frame, FFmpeg stitches them into a video, done. The neat thing is we only deploy the shell once. After that, any animation code can be rendered without redeploying - it all just flows through inputProps.

Deploy:

cd packages/template-prompt-to-motion-graphics && bunx sst deploy
Destroy (remove all resources):

cd packages/template-prompt-to-motion-graphics && bunx sst remove
You can also specify a stage if you want different environments:

bunx sst deploy --stage production
bunx sst remove --stage production

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
