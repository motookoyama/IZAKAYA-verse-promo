import type { MemoryEntry, MemoryState } from '../types/memory';

export class MemoryCore {
  private state: MemoryState = {
    shortTerm: [],
    longTerm: [],
  };

  getState(): MemoryState {
    return this.state;
  }

  appendShortTerm(entry: MemoryEntry): void {
    this.state.shortTerm.push(entry);
    if (this.state.shortTerm.length > 20) {
      this.state.shortTerm.shift();
    }
  }

  appendLongTerm(entry: MemoryEntry): void {
    this.state.longTerm.push(entry);
  }
}
