/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface RestockRecord {
  id: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  notes: string;
  items: Array<{
    product_id: string;
    product_name: string;
    sku: string;
    qty: number;
    unit_price: number;
    subtotal: number;
  }>;
  created_at: number;
  updated_at: number;
}

class IndexDBRestock {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<RestockRecord[]> {
    await db.init();
    const restocks = db.getAllRestocks();
    return restocks.map((r: any) => ({
      ...r,
      items: db.getRestockItems(r.id)
    })) as RestockRecord[];
  }

  async save(restock: RestockRecord): Promise<void> {
    await db.init();
    const id = restock.id || `restock_${Date.now()}`;
    const now = Date.now();
    
    db.transaction(() => {
      db.execute(
        `INSERT INTO restocks (id, supplier_id, supplier_name, total_amount, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, restock.supplier_id, restock.supplier_name, restock.total_amount, restock.notes, now, now]
      );

      for (const item of restock.items || []) {
        const itemId = `${id}_ITM${Math.random().toString(36).slice(2, 6)}`;
        db.execute(
          `INSERT INTO restock_items (id, restock_id, product_id, product_name, sku, qty, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, id, item.product_id, item.product_name, item.sku, item.qty, item.unit_price, item.subtotal]
        );
      }
    });
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.execute('DELETE FROM restock_items WHERE restock_id = ?', [id]);
    db.execute('DELETE FROM restocks WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.execute('DELETE FROM restock_items');
    db.execute('DELETE FROM restocks');
  }
}

export const indexdbRestock = new IndexDBRestock();