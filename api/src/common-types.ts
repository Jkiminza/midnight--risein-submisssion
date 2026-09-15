/**
 * Night Desk common types and abstractions.
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { type NightDeskPrivateState } from 'night-desk-contract';

export const nightDeskPrivateStateKey = 'nightDeskPrivateState';
export type PrivateStateId = typeof nightDeskPrivateStateKey;

export type NightDeskCircuitKeys = 'createInvoice' | 'acceptInvoice' | 'settleInvoice' | 'cancelInvoice';
export type NightDeskProviders = MidnightProviders<NightDeskCircuitKeys, PrivateStateId, NightDeskPrivateState>;
export type DeployedNightDeskContract = FoundContract<any>;

export const INVOICE_STATUS = {
  OPEN: 0,
  ACCEPTED: 1,
  SETTLED: 2,
  CANCELLED: 3,
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export interface InvoiceEntry {
  readonly id: number;
  readonly status: InvoiceStatus;
  readonly creatorHash: string;
}

export interface NightDeskDerivedState {
  readonly invoiceCount: number;
  readonly invoices: InvoiceEntry[];
}