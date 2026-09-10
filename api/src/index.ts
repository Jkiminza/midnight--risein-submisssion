/**
 * Shared business logic for the Night Desk contract.
 *
 * Platform-agnostic — works from browser (Lace) or CLI (wallet-sdk).
 * Each platform provides its own provider implementations.
 *
 * @packageDocumentation
 */

import * as NightDesk from '../../contract/managed/night-desk/contract/index.js';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type NightDeskDerivedState,
  type InvoiceEntry,
  type NightDeskProviders,
  type DeployedNightDeskContract,
  nightDeskPrivateStateKey,
} from './common-types.js';
import {
  CompiledNightDeskContract,
  createNightDeskPrivateState,
  type NightDeskPrivateState,
} from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { map, type Observable } from 'rxjs';

/**
 * API for a deployed Night Desk contract.
 *
 * Created via `InvoiceAPI.deploy()` (admin) or `InvoiceAPI.join()` (participant).
 */
export class InvoiceAPI {
  private constructor(
    public readonly deployedContract: DeployedNightDeskContract,
    providers: NightDeskProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);

    this.state$ = providers.publicDataProvider
      .contractStateObservable(this.deployedContractAddress, { type: 'latest' })
      .pipe(
        map((contractState) => NightDesk.ledger(contractState.data)),
        map((ledgerState): NightDeskDerivedState => {
          const invoices: InvoiceEntry[] = [];
          for (const [key, entry] of ledgerState.invoices) {
            invoices.push({
              id: Number(key),
              status: Number(entry.status) as InvoiceEntry['status'],
              creatorHash: entry.creatorHash.toString(),
            });
          }
          invoices.sort((a, b) => a.id - b.id);
          return { invoiceCount: Number(ledgerState.nextId), invoices };
        }),
      );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<NightDeskDerivedState>;

  /** Create an invoice. Amount and memo are private — they never reach the ledger. */
  async createInvoice(amount: bigint, memoBytes: Uint8Array): Promise<bigint> {
    const result = await (this.deployedContract as any).callTx.createInvoice(amount, memoBytes);
    return result.public.returnValue as bigint;
  }

  /** Accept an open invoice. Only the payee should do this. */
  async acceptInvoice(id: number): Promise<void> {
    await (this.deployedContract as any).callTx.acceptInvoice(BigInt(id));
  }

  /** Settle an accepted invoice. */
  async settleInvoice(id: number): Promise<void> {
    await (this.deployedContract as any).callTx.settleInvoice(BigInt(id));
  }

  /** Cancel an open invoice. On-chain, only the creator can cancel. */
  async cancelInvoice(id: number): Promise<void> {
    await (this.deployedContract as any).callTx.cancelInvoice(BigInt(id));
  }

  /** Deploy a new Night Desk contract (admin operation). */
  static async deploy(providers: NightDeskProviders, secretKey: Uint8Array, logger?: Logger): Promise<InvoiceAPI> {
    const deployedContract = await deployContract(providers as any, {
      compiledContract: CompiledNightDeskContract,
      privateStateId: nightDeskPrivateStateKey,
      initialPrivateState: createNightDeskPrivateState(secretKey),
    });
    return new InvoiceAPI(deployedContract, providers, logger);
  }

  /** Join an existing Night Desk contract (participant operation). */
  static async join(
    providers: NightDeskProviders,
    contractAddress: ContractAddress,
    secretKey: Uint8Array,
    logger?: Logger,
  ): Promise<InvoiceAPI> {
    const deployedContract = await findDeployedContract(providers as any, {
      contractAddress,
      compiledContract: CompiledNightDeskContract,
      privateStateId: nightDeskPrivateStateKey,
      initialPrivateState: createNightDeskPrivateState(secretKey),
    });
    return new InvoiceAPI(deployedContract, providers, logger);
  }
}

export * as utils from './utils/index.js';
export * from './common-types.js';