/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  notes: string;
  created_at: number;
  updated_at: number;
}

export const EXPENSE_CATEGORIES = [
  'Operasional', 'Listrik', 'Air', 'Sewa', 'Gaji', 'Transportasi',
  'Makanan', 'Perlengkapan', 'Perbaikan', 'Lainnya'
];

class IndexDBExpense {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<Expense[]> {
    await db.init();
    return db.getAllExpenses() as Expense[];
  }

  async save(expense: Expense): Promise<void> {
    await db.init();
    db.createExpense(expense);
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.execute('DELETE FROM expenses WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.execute('DELETE FROM expenses');
  }
}

export const indexdbExpense = new IndexDBExpense();