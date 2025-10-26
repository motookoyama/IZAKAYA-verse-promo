import express from 'express';
import { personaRoutes } from './routes/personaRoutes';
import { emotionRoutes } from './routes/emotionRoutes';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'persona-engine' });
});

app.use('/api', personaRoutes);
app.use('/api', emotionRoutes);

const PORT = process.env.PORT || 4105;
app.listen(PORT, () => {
  console.log(`Persona Engine listening on port ${PORT}`);
});
