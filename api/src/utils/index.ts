/**
 * Utility functions for the Night Desk API.
 * @module
 */

export const STATUS_LABELS: Record<number, string> = {
  0: 'Open',
  1: 'Accepted',
  2: 'Settled',
  3: 'Cancelled',
};

export const statusLabel = (status: number): string => STATUS_LABELS[status] ?? `Status ${status}`;