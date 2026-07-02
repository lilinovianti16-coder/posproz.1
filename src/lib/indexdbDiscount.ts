/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface Discount {
  id: string;
  name: string;
  type: string;
  value: number;
  min_purchase: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export type ActiveDiscount = Discount;

class IndexDBDiscount {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<Discount[]> {
    await db.init();
    return db.getAllDiscounts() as Discount[];
  }

  async save(discount: Discount): Promise<void> {
    await db.init();
    db.createDiscount(discount);
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.execute('DELETE FROM discounts WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.execute('DELETE FROM discounts');
  }
}

export const indexdbDiscount = new IndexDBDiscount();