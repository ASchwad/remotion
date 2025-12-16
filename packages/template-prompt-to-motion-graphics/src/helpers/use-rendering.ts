import { z } from "zod";
import { getProgress, renderVideo } from "../lambda/api";
import { CompositionProps } from "../../types/constants";

export type State =
  | {
      status: "init";
    }
  | {
      status: "invoking";
    }
  | {
      renderId: string;
      bucketName: string;
      progress: number;
      status: "rendering";
    }
  | {
      renderId: string | null;
      status: "error";
      error: Error;
    }
  | {
      url: string;
      size: number;
      status: "done";
    };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface UseRenderingProps {
  code: string;
  durationInFrames: number;
  fps: number;
  setState: (state: State) => void;
}

export const useRendering = ({
  code,
  durationInFrames,
  fps,
  setState,
}: UseRenderingProps) => {
  const renderMedia = async () => {
    const inputProps: z.infer<typeof CompositionProps> = { code, durationInFrames, fps };
    setState({ status: "invoking" });

    try {
      const { renderId, bucketName } = await renderVideo(inputProps);
      setState({
        status: "rendering",
        progress: 0,
        renderId,
        bucketName,
      });

      let pending = true;

      while (pending) {
        const result = await getProgress({ id: renderId, bucketName });

        switch (result.type) {
          case "error": {
            setState({
              status: "error",
              renderId,
              error: new Error(result.message),
            });
            pending = false;
            break;
          }
          case "done": {
            setState({
              size: result.size,
              url: result.url,
              status: "done",
            });
            pending = false;
            break;
          }
          case "progress": {
            setState({
              status: "rendering",
              bucketName,
              progress: result.progress,
              renderId,
            });
            await wait(2000);
          }
        }
      }
    } catch (err) {
      setState({
        status: "error",
        error: err as Error,
        renderId: null,
      });
    }
  };

  const undo = () => setState({ status: "init" });

  return { renderMedia, undo };
};
