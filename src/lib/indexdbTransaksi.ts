/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';
import type { DBTransaction, DBTransactionItem } from './DatabaseService';

class IndexDBTransaksi {
  async initDb(): Promise<void> {
    await db.init();
  }

  async create(total: number, items: any[], customerName?: string, paymentMethod?: string, paidAmount?: number, subtotal?: number, discountAmount?: number): Promise<string> {
    await db.init();
    const mappedItems = items.map((item: any) => ({
      product_id: item.product_id || item.id || '',
      product_name: item.product_name || item.name || item.nama || '',
      sku: item.sku || '',
      qty: item.qty || item.quantity || 1,
      price_at_sale: item.price_at_sale || item.price || item.harga || 0,
      price_cost: item.price_at_cost || item.price_cost || item.priceCost || 0,
    }));
    return db.createTransaction(total, mappedItems, customerName, paymentMethod, paidAmount, subtotal, discountAmount);
  }

  async getAll(): Promise<any[]> {
    await db.init();
    const transactions = db.getAllTransactions();
    return transactions.map((t: DBTransaction) => ({
      id: t.id,
      total: t.total,
      subtotal: t.subtotal,
      discountAmount: t.discount_amount,
      customerName: t.customer_name,
      paymentMethod: t.payment_method,
      paidAmount: t.paid_amount,
      changeAmount: t.change_amount,
      created_at: t.created_at,
      is_synced: 1,
      items: db.getTransactionItems(t.id)
    }));
  }

  async getById(id: string): Promise<any> {
    await db.init();
    const t = db.getTransactionById(id);
    if (!t) return null;
    return {
      id: t.id,
      total: t.total,
      subtotal: t.subtotal,
      discountAmount: t.discount_amount,
      customerName: t.customer_name,
      paymentMethod: t.payment_method,
      paidAmount: t.paid_amount,
      changeAmount: t.change_amount,
      created_at: t.created_at,
      is_synced: 1,
      items: db.getTransactionItems(t.id)
    };
  }

  async count(): Promise<number> {
    await db.init();
    return db.getTransactionCount();
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.deleteTransaction(id);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.clearAll();
  }

  async createRaw(transaksi: any): Promise<void> {
    await db.init();
    await db.createTransaction(
      transaksi.total,
      (transaksi.items || []).map((i: any) => ({
        product_id: i.product_id || i.id || '',
        product_name: i.product_name || i.name || '',
        sku: i.sku || '',
        qty: i.qty || i.quantity || 1,
        price_at_sale: i.price_at_sale || i.price || 0,
        price_cost: i.price_cost || 0,
      })),
      transaksi.customerName,
      transaksi.paymentMethod,
      transaksi.paidAmount,
      transaksi.subtotal,
      transaksi.discountAmount
    );
  }
}

export const indexdbTransaksi = new IndexDBTransaksi();