import { describe, it, expect } from 'vitest';
import { createNightDeskPrivateState } from './witnesses.js';
import { CompiledNightDeskContract } from './index.js';

describe('Night Desk Contract', () => {
  it('should create private state correctly', () => {
    const secretKey = new Uint8Array(32).fill(1);
    const privateState = createNightDeskPrivateState(secretKey);
    expect(privateState).toBeDefined();
  });

  it('should have compiled contract defined', () => {
    expect(CompiledNightDeskContract).toBeDefined();
  });
});
