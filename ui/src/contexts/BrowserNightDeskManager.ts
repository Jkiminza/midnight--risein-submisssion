/**
 * Browser-side provider initialization for the Night Desk DApp.
 * Connects to the Lace wallet via DApp Connector API and bridges
 * wallet operations to the InvoiceAPI.
 */

import { InvoiceAPI, type NightDeskCircuitKeys, type NightDeskProviders } from '../../../api/src/index';
import { type ContractAddress, fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { BehaviorSubject, catchError, concatMap, filter, firstValueFrom, interval, map, type Observable, take, throwError, timeout } from 'rxjs';
import { pipe as fnPipe } from 'fp-ts/function';
import { type Logger } from 'pino';
import { type ConnectedAPI, type InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import semver from 'semver';
import { Binding, type FinalizedTransaction, Proof, SignatureEnabled, Transaction, type TransactionId } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { type NightDeskPrivateState } from 'night-desk-contract';
import { inMemoryPrivateStateProvider } from '../in-memory-private-state-provider';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { UnboundTransaction } from '@midnight-ntwrk/midnight-js-types';

export type NightDeskDeployment =
  | { readonly status: 'in-progress' }
  | { readonly status: 'deployed'; readonly api: InvoiceAPI }
  | { readonly status: 'failed'; readonly error: Error };

/**
 * Manages Night Desk contract connections in a browser setting.
 * Connects to Lace, initializes providers, delegates to InvoiceAPI.
 */
export class BrowserNightDeskManager {
  readonly #deploymentsSubject = new BehaviorSubject<Array<BehaviorSubject<NightDeskDeployment>>>([]);
  #initializedProviders: Promise<NightDeskProviders> | undefined;

  constructor(private readonly logger: Logger) {}

  readonly deployments$: Observable<Array<Observable<NightDeskDeployment>>> = this.#deploymentsSubject;

  disconnect(): void {
    this.#initializedProviders = undefined;
    this.#deploymentsSubject.next([]);
  }

  resolve(contractAddress?: ContractAddress): Observable<NightDeskDeployment> {
    const deployments = this.#deploymentsSubject.value;
    const existing = deployments.find(
      (d) => d.value.status === 'deployed' && d.value.api.deployedContractAddress === contractAddress,
    );
    if (existing) return existing;

    const secretKey = this.getSecretKey();
    const deployment = new BehaviorSubject<NightDeskDeployment>({ status: 'in-progress' });
    if (contractAddress) {
      void this.run(deployment, (providers) => InvoiceAPI.join(providers, contractAddress, secretKey, this.logger));
    } else {
      void this.run(deployment, (providers) => InvoiceAPI.deploy(providers, secretKey, this.logger));
    }
    this.#deploymentsSubject.next([...deployments, deployment]);
    return deployment;
  }

  private getSecretKey(): Uint8Array {
    const storageKey = 'night-desk-secret';
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    }
    const secret = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem(storageKey, btoa(String.fromCharCode(...secret)));
    return secret;
  }

  private getProviders(): Promise<NightDeskProviders> {
    if (!this.#initializedProviders) {
      this.#initializedProviders = initializeProviders(this.logger).catch((error) => {
        this.#initializedProviders = undefined;
        throw error;
      });
    }
    return this.#initializedProviders;
  }

  private async run(
    deployment: BehaviorSubject<NightDeskDeployment>,
    factory: (providers: NightDeskProviders) => Promise<InvoiceAPI>,
  ): Promise<void> {
    try {
      const providers = await this.getProviders();
      const api = await factory(providers);
      deployment.next({ status: 'deployed', api });
    } catch (error: unknown) {
      console.error('Contract operation failed:', error);
      let err: Error;
      if (error instanceof Error) {
        err = error;
      } else if (typeof error === 'string') {
        err = new Error(error);
      } else {
        err = new Error(JSON.stringify(error) || 'Unknown error during contract operation');
      }
      deployment.next({ status: 'failed', error: err });
    }
  }
}

// ── Provider initialization ────────────────────────────────────────────

const COMPATIBLE_CONNECTOR_API_VERSION = '4.x';

const isChannelDown = (e: unknown): boolean => {
  if (!e) return false;
  const msg = typeof e === 'string' ? e : (e as { message?: unknown })?.message ?? String(e);
  const s = String(msg);
  return s.includes('shutdown') || s.includes('Remote API') || s.includes('channel');
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const connectWithRetry = async (logger: Logger, networkId: string, attempts = 3): Promise<ConnectedAPI> => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await connectToWallet(logger, networkId);
    } catch (error: unknown) {
      if (i === attempts - 1) throw error;
      logger.warn(`wallet connect attempt ${i + 1} failed; retrying…`);
      await sleep(1_500 * (i + 1));
    }
  }
  throw new Error('Could not connect to Midnight Lace wallet.');
};

const initializeProviders = async (logger: Logger): Promise<NightDeskProviders> => {
  const networkId = import.meta.env.VITE_NETWORK_ID as NetworkId;
  setNetworkId(networkId);

  let connectedAPI = await connectWithRetry(logger, networkId);

  const reconnect = async (): Promise<void> => {
    logger.warn('Lace connection lost; reconnecting…');
    connectedAPI = await connectToWallet(logger, networkId);
  };

  const callWithReconnect = async <T>(fn: () => Promise<T>, retries = 2): Promise<T> => {
    try {
      return await fn();
    } catch (error: unknown) {
      if (retries > 0 && isChannelDown(error)) {
        try { await reconnect(); } catch { /* keep original error */ }
        return callWithReconnect(fn, retries - 1);
      }
      throw error;
    }
  };

  const config = await callWithReconnect(() => connectedAPI.getConfiguration());
  const proofServerUri = config.proverServerUri!;
  const shieldedAddresses = await callWithReconnect(() => connectedAPI.getShieldedAddresses());
  const zkConfigProvider = new FetchZkConfigProvider<NightDeskCircuitKeys>(window.location.origin, fetch.bind(window));

  return {
    privateStateProvider: inMemoryPrivateStateProvider<string, NightDeskPrivateState>(),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfigProvider),
    publicDataProvider: indexerPublicDataProvider(config.indexerUri, config.indexerWsUri),
    walletProvider: {
      getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
      getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const received = await callWithReconnect(() => connectedAPI.balanceUnsealedTransaction(toHex(tx.serialize())));
        return Transaction.deserialize<SignatureEnabled, Proof, Binding>('signature', 'proof', 'binding', fromHex(received.tx));
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await callWithReconnect(() => connectedAPI.submitTransaction(toHex(tx.serialize())));
        return tx.identifiers()[0];
      },
    },
  };
};

// ── Wallet detection ───────────────────────────────────────────────────

const getFirstCompatibleWallet = (): InitialAPI | undefined => {
  if (!window.midnight) return undefined;
  const wallets = Object.values(window.midnight).filter(
    (wallet): wallet is InitialAPI =>
      !!wallet && typeof wallet === 'object' && 'apiVersion' in wallet && typeof (wallet as InitialAPI).connect === 'function',
  );
  return (
    wallets.find((wallet) => semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)) ??
    wallets[0]
  );
};

const connectToWallet = (logger: Logger, networkId: string): Promise<ConnectedAPI> =>
  firstValueFrom(
    fnPipe(
      interval(100),
      map(() => getFirstCompatibleWallet()),
      filter((api): api is InitialAPI => !!api),
      take(1),
      timeout({ first: 3_500, with: () => throwError(() => new Error('Could not find Midnight Lace wallet.')) }),
      concatMap(async (initialAPI) => initialAPI.connect(networkId)),
      timeout({ first: 12_000, with: () => throwError(() => new Error('Lace wallet failed to respond.')) }),
      catchError((error) => throwError(() => error instanceof Error ? error : new Error('Wallet not authorized'))),
    ),
  );