/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface ReturRecord {
  id: string;
  retur_type: string;
  reference_id: string;
  total_amount: number;
  reason: string;
  notes: string;
  items: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    unit_price: number;
    subtotal: number;
  }>;
  created_at: number;
  updated_at: number;
}

class IndexDBRetur {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<ReturRecord[]> {
    await db.init();
    const returs = db.getAllReturs();
    return returs.map((r: any) => ({
      ...r,
      items: db.getReturItems(r.id)
    })) as ReturRecord[];
  }

  async save(retur: ReturRecord): Promise<void> {
    await db.init();
    const id = retur.id || `retur_${Date.now()}`;
    const now = Date.now();

    db.transaction(() => {
      db.execute(
        `INSERT INTO returs (id, retur_type, reference_id, total_amount, reason, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, retur.retur_type, retur.reference_id, retur.total_amount, retur.reason, retur.notes, now, now]
      );

      for (const item of retur.items || []) {
        const itemId = `${id}_ITM${Math.random().toString(36).slice(2, 6)}`;
        db.execute(
          `INSERT INTO retur_items (id, retur_id, product_id, product_name, qty, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.product_id, item.product_name, item.qty, item.unit_price, item.subtotal]
        );
      }
    });
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.execute('DELETE FROM retur_items WHERE retur_id = ?', [id]);
    db.execute('DELETE FROM returs WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.execute('DELETE FROM retur_items');
    db.execute('DELETE FROM returs');
  }
}

export const indexdbRetur = new IndexDBRetur();