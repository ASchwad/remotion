import { Composition, registerRoot } from "remotion";
import { DynamicComp } from "./DynamicComp";
import { CompositionProps } from "../../types/constants";

const defaultCode = `import { AbsoluteFill } from "remotion";
export const MyAnimation = () => <AbsoluteFill style={{ backgroundColor: "#000" }} />;`;

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicComp"
        component={DynamicComp}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        schema={CompositionProps}
        defaultProps={{
          code: defaultCode,
          durationInFrames: 180,
          fps: 30,
        }}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: props.durationInFrames,
            fps: props.fps,
          };
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
