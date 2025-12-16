"use client";

import React, { useEffect } from "react";
import { Player, type ErrorFallback } from "@remotion/player";
import { RenderControls } from "./RenderControls";
import { SettingsModal } from "./SettingsModal";
import { useRenderingContext } from "../context/RenderingContext";

const renderErrorFallback: ErrorFallback = ({ error }) => {
  return (
    <div className="w-full h-full flex justify-center items-center bg-background-error p-10">
      <div className="text-center max-w-[80%]">
        <div className="text-destructive text-3xl font-bold mb-4 font-sans">
          Runtime Error
        </div>
        <div className="text-destructive-foreground text-xl font-mono whitespace-pre-wrap break-words">
          {error.message || "An error occurred while rendering"}
        </div>
      </div>
    </div>
  );
};

interface AnimationPlayerProps {
  Component: React.ComponentType | null;
  durationInFrames: number;
  fps: number;
  onDurationChange: (duration: number) => void;
  onFpsChange: (fps: number) => void;
  isCompiling: boolean;
  isStreaming: boolean;
  error: string | null;
  errorType?: "compilation" | "api";
  code: string;
}

export const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  Component,
  durationInFrames: durationInFramesProp,
  fps: fpsProp,
  onDurationChange,
  onFpsChange,
  isCompiling,
  isStreaming,
  error,
  errorType = "compilation",
  code,
}) => {
  const { resetRenderingState } = useRenderingContext();

  // Reset rendering state when code changes
  useEffect(() => {
    resetRenderingState();
  }, [code, resetRenderingState]);

  // Ensure we never pass NaN or invalid values to the Player
  const durationInFrames = !Number.isFinite(durationInFramesProp) || durationInFramesProp < 1
    ? 150
    : Math.round(durationInFramesProp);
  const fps = !Number.isFinite(fpsProp) || fpsProp < 1
    ? 30
    : Math.round(fpsProp);

  // Wrap callbacks to ensure we never propagate invalid values
  const handleDurationChange = (value: number) => {
    if (!Number.isNaN(value) && value >= 1) {
      onDurationChange(value);
    }
  };

  const handleFpsChange = (value: number) => {
    if (!Number.isNaN(value) && value >= 1) {
      onFpsChange(value);
    }
  };

  const canRender = Boolean(Component) && !isCompiling && !isStreaming && !error;
  if (isStreaming) {
    return (
      <div className="flex flex-3 flex-col items-center bg-background min-w-0">
        <div className="w-full max-w-[1200px]">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Video Preview
          </h2>
          <div className="w-full aspect-video flex flex-col justify-center items-center gap-4 bg-background-elevated rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">
              Waiting for code generation to finish...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isCompiling) {
    return (
      <div className="flex flex-3 flex-col items-center bg-background min-w-0">
        <div className="w-full max-w-[1200px]">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Video Preview
          </h2>
          <div className="w-full aspect-video flex justify-center items-center bg-background-elevated rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-12 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const errorTitle = errorType === "api" ? "API Error" : "Compilation Error";
    return (
      <div className="flex flex-3 flex-col items-center bg-background min-w-0">
        <div className="w-full max-w-[1200px]">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Video Preview
          </h2>
          <div className="w-full aspect-video flex justify-center items-center bg-background-error rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-destructive">
            <div className="text-center max-w-[80%]">
              <div className="text-destructive text-base font-semibold mb-2 font-sans">
                {errorTitle}
              </div>
              <div className="text-destructive-foreground text-sm font-mono whitespace-pre-wrap break-words">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex flex-3 flex-col items-center bg-background min-w-0">
        <div className="w-full max-w-[1200px]">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Video Preview
          </h2>
          <div className="w-full aspect-video flex justify-center items-center bg-background-elevated rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] text-muted-foreground-dim text-lg font-sans">
            Select an example to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-3 flex-col items-center bg-background min-w-0">
      <div className="w-full max-w-[1200px]">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Video Preview</h2>
        <div className="w-full aspect-video rounded-lg overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)]">
          <Player
            key={`${Component.toString()}-${durationInFrames}-${fps}`}
            component={Component}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionHeight={1080}
            compositionWidth={1920}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "transparent",
            }}
            controls
            autoPlay
            loop
            errorFallback={renderErrorFallback}
            spaceKeyToPlayOrPause={false}
            clickToPlay={false}
          />
        </div>
        <div className="flex items-center justify-between mt-4">
          <RenderControls
            code={code}
            durationInFrames={durationInFrames}
            fps={fps}
            disabled={!canRender}
          />
          <SettingsModal
            durationInFrames={durationInFrames}
            onDurationChange={handleDurationChange}
            fps={fps}
            onFpsChange={handleFpsChange}
          />
        </div>
      </div>
    </div>
  );
};
