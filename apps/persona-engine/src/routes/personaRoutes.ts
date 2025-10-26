import { Router } from 'express';
import { PersonaLoader } from '../core/personaLoader';

const loader = new PersonaLoader();

export const personaRoutes = Router();

personaRoutes.get('/personas', (_req, res) => {
  res.json({ personas: loader.listPersonas() });
});

personaRoutes.get('/personas/:id', (req, res) => {
  const persona = loader.getPersona(req.params.id);
  if (!persona) {
    return res.status(404).json({ error: 'Persona not found' });
  }
  res.json(persona);
});
