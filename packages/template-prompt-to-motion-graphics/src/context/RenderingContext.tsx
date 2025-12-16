"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type State as RenderingState } from "../helpers/use-rendering";

interface RenderingContextValue {
  renderingState: RenderingState;
  setRenderingState: (state: RenderingState) => void;
  resetRenderingState: () => void;
}

const initialState: RenderingState = { status: "init" };

const RenderingContext = createContext<RenderingContextValue | null>(null);

export function RenderingProvider({ children }: { children: ReactNode }) {
  const [renderingState, setRenderingState] = useState<RenderingState>(initialState);

  const resetRenderingState = useCallback(() => {
    setRenderingState(initialState);
  }, []);

  return (
    <RenderingContext.Provider
      value={{ renderingState, setRenderingState, resetRenderingState }}
    >
      {children}
    </RenderingContext.Provider>
  );
}

export function useRenderingContext() {
  const context = useContext(RenderingContext);
  if (!context) {
    throw new Error("useRenderingContext must be used within a RenderingProvider");
  }
  return context;
}
