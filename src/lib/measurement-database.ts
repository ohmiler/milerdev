import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '@/lib/db';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const measurementTransaction = new AsyncLocalStorage<Transaction>();

// Receipt validation and measurement writes share a connection and transaction.
export function getMeasurementDatabase() {
  return measurementTransaction.getStore() ?? db;
}
