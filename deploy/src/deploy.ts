/**
 * Deploy the Night Desk contract to the Midnight Preview network.
 *
 * Follows the official Midnight guides:
 *  - Funding a wallet (https://docs.midnight.network/guides/acquire-tokens.md)
 *  - Deploying and operating a contract (https://docs.midnight.network/guides/deploy-and-operate.md)
 *
 * Prerequisites:
 *  1. A proof server running locally on port 6300 (see proof-server/).
 *  2. tNIGHT for the generated wallet — the script prints the unshielded
 *     address; send tokens from the Preview faucet when prompted.
 *
 * The wallet seed is generated once and persisted in deploy/.env
 * (git-ignored). Re-running reuses the same wallet.
 */

import { WebSocket } from 'ws';
(globalThis as any).WebSocket = WebSocket;

import { Buffer } from 'buffer';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import * as Rx from 'rxjs';
import { throttleTime, filter, map } from 'rxjs';

import {
  HDWallet,
  Roles,
  generateRandomSeed,
  WalletFacade,
  ShieldedWallet,
  DustWallet,
  UnshieldedWallet,
  createKeystore,
  PublicKey,
  NoOpTransactionHistoryStorage,
  DustAddress,
  MidnightBech32m,
} from '@midnightntwrk/wallet-sdk';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import type {
  CoinPublicKey,
  EncPublicKey,
  FinalizedTransaction,
  ZswapSecretKeys,
  DustSecretKey,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  WalletProvider,
  MidnightProvider,
  UnboundTransaction,
} from '@midnight-ntwrk/midnight-js-types';

import { CompiledNightDeskContract, createNightDeskPrivateState } from '../../contract/src/index.ts';

setNetworkId('preview');

const NETWORK = 'preview';
const CONFIG = {
  indexerHttpUrl: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWsUrl: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preview.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
  faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
};
const MANAGED_DIR = fileURLToPath(new URL('../../contract/managed/night-desk', import.meta.url));
const ENV_FILE = fileURLToPath(new URL('../.env', import.meta.url));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const formatNight = (raw: bigint) =>
  `${raw / 1_000_000n}.${(raw % 1_000_000n).toString().padStart(6, '0')}`;

const formatDust = (raw: bigint) =>
  `${raw / 1_000_000_000_000_000n}.${(raw % 1_000_000_000_000_000n).toString().padStart(15, '0')}`;

function loadEnv(): Record<string, string | undefined> {
  const vars: Record<string, string | undefined> = { ...process.env };
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return vars;
}

function saveEnv(patch: Record<string, string>): void {
  const existing: Record<string, string> = {};
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) existing[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const merged = { ...existing, ...patch };
  writeFileSync(ENV_FILE, Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
}

const deriveKeys = (seed: string) => {
  const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hd.type !== 'seedOk') throw new Error('Invalid seed');
  const result = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hd.hdWallet.clear();
  return result.keys;
};

class NightDeskWalletProvider implements WalletProvider, MidnightProvider {
  constructor(
    private readonly wallet: WalletFacade,
    private readonly zswapSecretKeys: ZswapSecretKeys,
    private readonly dustSecretKey: DustSecretKey,
  ) {}

  getCoinPublicKey(): CoinPublicKey {
    return this.zswapSecretKeys.coinPublicKey;
  }

  getEncryptionPublicKey(): EncPublicKey {
    return this.zswapSecretKeys.encryptionPublicKey;
  }

  async balanceTx(tx: UnboundTransaction, ttl: Date = ttlOneHour()): Promise<FinalizedTransaction> {
    const recipe = await this.wallet.balanceUnboundTransaction(
      tx,
      { shieldedSecretKeys: this.zswapSecretKeys, dustSecretKey: this.dustSecretKey },
      { ttl },
    );
    return await this.wallet.finalizeRecipe(recipe);
  }

  submitTx(tx: FinalizedTransaction): Promise<string> {
    return this.wallet.submitTransaction(tx);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const waitSeconds = args.length > 1 && args[0] === '--wait-funds'
    ? Number(args[1])
    : 600;
  const smoken = args.includes('--smoke');

  const env = loadEnv();

  // ── Wallet seed ──────────────────────────────────────────────────────
  let seed = env.WALLET_SEED;
  if (!seed) {
    seed = toHex(Buffer.from(generateRandomSeed()));
    saveEnv({ WALLET_SEED: seed });
    console.log(`\nGenerated a new wallet seed (saved to deploy/.env). Re-runs reuse it.\n`);
  }

  const keys = deriveKeys(seed);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  const unshieldedAddress = String(unshieldedKeystore.getBech32Address());

  console.log('==========================================================');
  console.log(`  Night Desk · deploy to Midnight ${NETWORK}`);
  console.log('==========================================================');
  console.log(`\nUnshielded wallet address:\n  ${unshieldedAddress}`);
  console.log(`\nFund it from the faucet:\n  ${CONFIG.faucet}\n  (paste the address above, complete the captcha, Request tokens)\n`);

  // ── Wallet facade ────────────────────────────────────────────────────
  const shieldedConfig = {
    networkId: getNetworkId(),
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexerHttpUrl,
      indexerWsUrl: CONFIG.indexerWsUrl,
    },
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, 'ws')),
  };
  const unshieldedConfig = {
    networkId: getNetworkId(),
    indexerClientConnection: {
      indexerHttpUrl: CONFIG.indexerHttpUrl,
      indexerWsUrl: CONFIG.indexerWsUrl,
    },
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
  };
  const dustConfig = {
    ...shieldedConfig,
    costParameters: {
      additionalFeeOverhead: 300_000_000_000_000n,
      feeBlocksMargin: 5,
    },
  };

  const wallet = await WalletFacade.init({
    configuration: { ...shieldedConfig, ...unshieldedConfig, ...dustConfig },
    shielded: (cfg: any) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (cfg: any) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
    dust: (cfg: any) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  try {
    // ── Wait for tNIGHT ────────────────────────────────────────────────
    console.log(`\nWaiting for tNIGHT (up to ${waitSeconds}s)...`);
    const started = Date.now();
    let nightBalance = 0n;
    while (Date.now() - started < waitSeconds * 1000) {
      const state = await Rx.firstValueFrom(wallet.state());
      nightBalance = state.unshielded?.balances?.[unshieldedToken().raw] ?? 0n;
      if (nightBalance > 0n) break;
      await sleep(10_000);
    }
    if (nightBalance <= 0n) {
      console.error(`\n✗ No tNIGHT received after ${waitSeconds}s.`);
      console.error(`  Fund ${unshieldedAddress} at ${CONFIG.faucet}, then re-run.`);
      process.exit(1);
    }
    console.log(`  tNIGHT received: ${formatNight(nightBalance)}`);

    // ── Sync + register for DUST ───────────────────────────────────────
    console.log('  Syncing wallet (first sync walks chain history, this takes a while)...');
    const synced = await wallet.waitForSyncedState();

    const unregistered = synced.unshielded.availableCoins.filter(
      (coin: any) => coin.meta?.registeredForDustGeneration !== true,
    );
    if (unregistered.length === 0) {
      console.log('  All tNIGHT is already registered for DUST generation.');
    } else {
      console.log(`  Registering ${unregistered.length} coin(s) for DUST generation...`);
      const target = String(DustAddress.encodePublicKey(getNetworkId(), synced.dust.publicKey));
      const dustReceiver = MidnightBech32m.parse(target).decode(DustAddress, getNetworkId());
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        unregistered,
        unshieldedKeystore.getPublicKey(),
        (payload) => unshieldedKeystore.signData(payload),
        dustReceiver,
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      await wallet.submitTransaction(finalized);
    }

    console.log('  Waiting for DUST to accrue...');
    const dustBalance = await Rx.firstValueFrom(
      wallet.state().pipe(
        throttleTime(5_000),
        filter((s: any) => s.isSynced && s.dust.balance(new Date()) > 0n),
        map((s: any) => s.dust.balance(new Date())),
      ),
    );
    console.log(`  DUST balance: ${formatDust(dustBalance)}`);

    // ── Providers ──────────────────────────────────────────────────────
    console.log('\n  Assembling Midnight providers...');
    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: 'night-desk-private-state',
        signingKeyStoreName: 'night-desk-signing-keys',
        privateStoragePasswordProvider: () => env.WALLET_STATE_PASSWORD ?? 'Night-Desk-2026-Ledger',
        accountId: unshieldedAddress,
      }),
      publicDataProvider: indexerPublicDataProvider(CONFIG.indexerHttpUrl, CONFIG.indexerWsUrl),
      zkConfigProvider: new NodeZkConfigProvider(MANAGED_DIR),
      proofProvider: httpClientProofProvider(CONFIG.proofServer, new NodeZkConfigProvider(MANAGED_DIR)),
      walletProvider: new NightDeskWalletProvider(wallet, shieldedSecretKeys, dustSecretKey),
      midnightProvider: new NightDeskWalletProvider(wallet, shieldedSecretKeys, dustSecretKey),
    } as any;

    // ── Deploy ─────────────────────────────────────────────────────────
    console.log('  Deploying contract (generating proof, balancing, submitting)...\n');
    const secretKey = randomBytes(32);
    const deployed = await deployContract(providers, {
      compiledContract: CompiledNightDeskContract,
      privateStateId: 'nightDeskPrivateState',
      initialPrivateState: createNightDeskPrivateState(secretKey),
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    console.log('==========================================================');
    console.log('  ✓ Contract deployed to Midnight Preview');
    console.log('==========================================================');
    console.log(`\n  Contract address: ${contractAddress}\n`);

    saveDeployOutputs(contractAddress);

    if (smoken) {
      const memo = new Uint8Array(32);
      memo.set(new TextEncoder().encode('first-invoice').slice(0, 32));
      const entryId = await deployed.callTx.createInvoice(100n, memo);
      console.log(`  Smoke test: created invoice #${entryId} on-chain (amount + memo stayed private).`);
      console.log(`  Verify: https://preview.midnightexplorer.com/addresses/${contractAddress}`);
    }
  } finally {
    await wallet.stop();
  }
}

function saveDeployOutputs(contractAddress: string): void {
  for (const file of ['../../frontend-landing/.env.preview', '../../frontend-landing/.env.local']) {
    const abs = fileURLToPath(new URL(file, import.meta.url));
    const lines = existsSync(abs) ? readFileSync(abs, 'utf8').split('\n') : [];
    const out = lines.filter((l) => !/^NEXT_PUBLIC_DEFAULT_CONTRACT=/.test(l));
    out.push(`NEXT_PUBLIC_DEFAULT_CONTRACT=${contractAddress}`);
    writeFileSync(abs, out.join('\n') + '\n');
  }
  saveEnv({ DEPLOYED_CONTRACT_ADDRESS: contractAddress });
  console.log(`  Written ${contractAddress} to frontend-landing/.env.preview and frontend-landing/.env.local (NEXT_PUBLIC_DEFAULT_CONTRACT).`);
}

main().catch((err) => {
  console.error('\nDeploy failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});