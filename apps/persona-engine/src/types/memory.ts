import { z } from 'zod';

export const MemoryEntrySchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  tags: z.array(z.string()).optional(),
  timestamp: z.string(),
});

export const MemoryStateSchema = z.object({
  shortTerm: z.array(MemoryEntrySchema),
  longTerm: z.array(MemoryEntrySchema),
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;
