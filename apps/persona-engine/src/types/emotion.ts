import { z } from 'zod';

export const EmotionStateSchema = z.object({
  valence: z.number().min(-1).max(1),
  arousal: z.number().min(0).max(1),
  dominance: z.number().min(0).max(1),
  label: z.string(),
});

export type EmotionState = z.infer<typeof EmotionStateSchema>;
