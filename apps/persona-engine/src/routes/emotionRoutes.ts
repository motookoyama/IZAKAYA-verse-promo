import { Router } from 'express';
import { EmotionCore } from '../core/emotionCore';

const emotionCore = new EmotionCore();
export const emotionRoutes = Router();

emotionRoutes.get('/emotion', (_req, res) => {
  res.json(emotionCore.getState());
});
