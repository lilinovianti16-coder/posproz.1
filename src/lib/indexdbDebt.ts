/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface Debt {
  id: string;
  customer_id: string;
  customer_name: string;
  transaction_id: string;
  amount: number;
  paid_amount: number;
  remaining: number;
  due_date: number;
  status: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

class IndexDBDebt {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<Debt[]> {
    await db.init();
    return db.getAllDebts() as Debt[];
  }

  async save(debt: Debt): Promise<void> {
    await db.init();
    db.createDebt(debt);
  }

  async delete(id: string): Promise<void> {
    await db.init();
    // Hapus via query langsung karena tidak ada method spesifik
    db.execute('DELETE FROM debts WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.execute('DELETE FROM debts');
  }
}

export const indexdbDebt = new IndexDBDebt();