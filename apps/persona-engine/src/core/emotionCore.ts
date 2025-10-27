import type { EmotionState } from '../types/emotion.js';

export class EmotionCore {
  private state: EmotionState = {
    valence: 0.2,
    arousal: 0.5,
    dominance: 0.6,
    label: 'steady',
  };

  getState(): EmotionState {
    return this.state;
  }

  update(delta: Partial<EmotionState>): EmotionState {
    this.state = {
      ...this.state,
      ...delta,
      label: delta.label ?? this.state.label,
    };
    return this.state;
  }
}
