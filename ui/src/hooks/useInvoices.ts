/**
 * useInvoices — reads on-chain invoice state from the indexer.
 *
 * Uses the same GraphQL query as midnight-js-indexer-public-data-provider
 * but via a simple fetch() so it works in the browser without Apollo.
 * Parses the state with the compiled contract's ledger() function.
 */

import { useState, useEffect, useCallback } from 'react';
import { ContractState } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { NightDesk, type NightDeskPrivateState as _PS } from 'night-desk-contract';
import { statusLabel } from '../../../api/src/utils/index.js';
import { type InvoiceStatus } from '../../../api/src/common-types.js';

const INDEXER_URL = import.meta.env.VITE_INDEXER_URL ?? 'https://indexer.preview.midnight.network/api/v4/graphql';

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      state
    }
  }
`;

export interface InvoiceView {
  id: number;
  status: InvoiceStatus;
  statusLabel: string;
  creatorHash: string;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export function useInvoices(contractAddress: string | null, refreshInterval = 15_000) {
  const [invoices, setInvoices] = useState<InvoiceView[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!contractAddress || !/^[0-9a-fA-F]{64}$/.test(contractAddress)) return;

    try {
      setLoading(true);
      const res = await fetch(INDEXER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: CONTRACT_STATE_QUERY, variables: { address: contractAddress } }),
      });

      const gql = await res.json();
      if (gql.errors) {
        throw new Error(gql.errors[0]?.message ?? 'Indexer query failed');
      }

      const stateHex = gql.data?.contractAction?.state;
      if (!stateHex) {
        throw new Error('Contract not found');
      }

      const contractState = ContractState.deserialize(hexToBytes(stateHex));
      const ledgerState = NightDesk.ledger(contractState.data);

      const parsed: InvoiceView[] = [];
      for (const [key, entry] of ledgerState.invoices) {
        parsed.push({
          id: Number(key),
          status: Number(entry.status) as InvoiceStatus,
          statusLabel: statusLabel(Number(entry.status)),
          creatorHash: entry.creatorHash.toString(),
        });
      }
      parsed.sort((a, b) => a.id - b.id);

      setInvoices(parsed);
      setInvoiceCount(Number(ledgerState.nextId));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (!contractAddress) return;
    const interval = setInterval(fetchInvoices, refreshInterval);
    return () => clearInterval(interval);
  }, [contractAddress, refreshInterval, fetchInvoices]);

  return { invoices, invoiceCount, loading, error, refresh: fetchInvoices };
}