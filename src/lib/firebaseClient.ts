/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: Firebase → SQLite (via DatabaseService)
 * Firebase sudah tidak digunakan. Semua data via SQLite + Supabase.
 */

export const isFirebaseConfigured = false;
export const app = null as any;
export const db = null as any;
export const auth = null as any;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // No-op: Firebase tidak digunakan
  console.warn('⚠️ Firebase non-aktif. Tidak dapat menangani error Firestore.');
}