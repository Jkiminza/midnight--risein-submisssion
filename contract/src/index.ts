import { CompiledContract } from '@midnight-ntwrk/compact-js';

export * as NightDesk from '../managed/night-desk/contract/index.js';
export { createWitnesses, createNightDeskPrivateState } from './witnesses.js';
export type { NightDeskPrivateState } from './witnesses.js';

import * as NightDeskContract from '../managed/night-desk/contract/index.js';
import { createWitnesses } from './witnesses.js';

export const CompiledNightDeskContract = CompiledContract.make(
  'night-desk',
  NightDeskContract.Contract,
).pipe(
  CompiledContract.withWitnesses(createWitnesses()),
  CompiledContract.withCompiledFileAssets('./managed/night-desk'),
);