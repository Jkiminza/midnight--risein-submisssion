import { describe, it, expect } from 'vitest';
import { createNightDeskPrivateState, createWitnesses } from './witnesses.js';
import { CompiledNightDeskContract } from './index.js';

describe('Night Desk Contract', () => {
  it('should create private state correctly', () => {
    const secretKey = new Uint8Array(32).fill(1);
    const privateState = createNightDeskPrivateState(secretKey);
    expect(privateState).toBeDefined();
    expect(privateState.secretKey).toEqual(secretKey);
  });

  it('should create witnesses and return local secret key', () => {
    const secretKey = new Uint8Array(32).fill(7);
    const privateState = createNightDeskPrivateState(secretKey);
    const witnesses = createWitnesses();
    const [newState, returnedKey] = witnesses.localSecretKey({ privateState });
    expect(newState).toEqual(privateState);
    expect(returnedKey).toEqual(secretKey);
  });

  it('should have compiled contract defined as an object', () => {
    expect(CompiledNightDeskContract).toBeDefined();
    expect(typeof CompiledNightDeskContract).toBe('object');
  });
});
