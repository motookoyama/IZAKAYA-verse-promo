import type { Persona } from '../types/persona.js';

const seedPersonas: Persona[] = [
  {
    id: 'dr-orb',
    name: 'Dr. Orb',
    archetype: 'Archivist Alchemist',
    traits: ['curious', 'witty', 'mentor'],
    goals: ['guide guests', 'collect stories'],
    tone: {
      default: 'Gentle academic register',
      excited: 'Warm and enthusiastic',
    },
  },
  {
    id: 'miss-madi',
    name: 'Miss Madi',
    archetype: 'Mystic Host',
    traits: ['playful', 'insightful', 'empathic'],
    goals: ['entertain guests', 'maintain harmony'],
    tone: {
      default: 'Soft, melodic cadence',
      calm: 'Hushed, reflective',
    },
  },
];

export class PersonaLoader {
  private personas = new Map<string, Persona>();

  constructor() {
    for (const persona of seedPersonas) {
      this.personas.set(persona.id, persona);
    }
  }

  getPersona(id: string): Persona | undefined {
    return this.personas.get(id);
  }

  listPersonas(): Persona[] {
    return Array.from(this.personas.values());
  }
}
