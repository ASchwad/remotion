import { z } from "zod";

export const CompositionProps = z.object({
  code: z.string(),
  durationInFrames: z.number().min(1).default(150),
  fps: z.number().min(1).max(60).default(30),
});
