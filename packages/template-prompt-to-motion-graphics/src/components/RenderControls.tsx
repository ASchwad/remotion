import { Film, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRendering } from "../helpers/use-rendering";
import { useRenderingContext } from "../context/RenderingContext";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface RenderControlsProps {
  code: string;
  durationInFrames: number;
  fps: number;
  disabled?: boolean;
}

export function RenderControls({
  code,
  durationInFrames,
  fps,
  disabled = false,
}: RenderControlsProps) {
  const { renderingState, setRenderingState } = useRenderingContext();

  const { renderMedia, undo } = useRendering({
    code,
    durationInFrames,
    fps,
    setState: setRenderingState,
  });

  const state = renderingState;

  const isIdle = state.status === "init";
  const isInvoking = state.status === "invoking";
  const isRendering = state.status === "rendering";
  const isDone = state.status === "done";
  const isError = state.status === "error";

  return (
    <div className="flex items-center gap-3">
      {(isIdle || isInvoking || isError) && (
        <>
          <Button
            onClick={renderMedia}
            disabled={disabled || !code || isInvoking}
            loading={isInvoking}
            variant="default"
            size="sm"
          >
            <Film className="size-4" />
            Render Video
          </Button>
          {isError && (
            <span className="text-sm text-destructive truncate max-w-[300px]">
              {state.error.message}
            </span>
          )}
        </>
      )}

      {isRendering && (
        <div className="flex items-center gap-3 flex-1">
          <div className="w-[200px] h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground min-w-[40px]">
            {Math.round(state.progress * 100)}%
          </span>
        </div>
      )}

      {isDone && (
        <div className="flex items-center gap-3">
          <a href={state.url} download>
            <Button variant="default" size="sm">
              <Download className="size-4" />
              Download Video
            </Button>
          </a>
          <span className="text-sm text-muted-foreground">
            {formatSize(state.size)}
          </span>
          <Button variant="ghost" size="sm" onClick={undo}>
            <RotateCcw className="size-4" />
            Render Again
          </Button>
        </div>
      )}
    </div>
  );
}
