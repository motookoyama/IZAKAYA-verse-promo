import { z } from 'zod';

export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.string(),
  traits: z.array(z.string()),
  goals: z.array(z.string()),
  tone: z.object({
    default: z.string(),
    excited: z.string().optional(),
    calm: z.string().optional(),
  }),
});

export type Persona = z.infer<typeof PersonaSchema>;
