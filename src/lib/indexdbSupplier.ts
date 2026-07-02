/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  contactPerson: string;
  npwp: string;
  notes: string;
  productCount: number;
  totalPurchases: number;
  created_at: number;
  updated_at: number;
}

class IndexDBSupplier {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<Supplier[]> {
    await db.init();
    const suppliers = db.getAllSuppliers();
    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      contactPerson: s.contact_person,
      npwp: s.npwp,
      notes: s.notes,
      productCount: s.product_count,
      totalPurchases: s.total_purchases,
      created_at: s.created_at,
      updated_at: s.updated_at,
    })) as Supplier[];
  }

  async getById(id: string): Promise<Supplier | undefined> {
    await db.init();
    const s = db.getSupplierById(id);
    if (!s) return undefined;
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      contactPerson: s.contact_person,
      npwp: s.npwp,
      notes: s.notes,
      productCount: s.product_count,
      totalPurchases: s.total_purchases,
      created_at: s.created_at,
      updated_at: s.updated_at,
    } as Supplier;
  }

  async save(supplier: Supplier): Promise<void> {
    await db.init();
    await db.createSupplier({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      contact_person: supplier.contactPerson,
      npwp: supplier.npwp,
      notes: supplier.notes,
      product_count: supplier.productCount,
      total_purchases: supplier.totalPurchases,
    });
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.deleteSupplier(id);
  }

  async search(query: string): Promise<Supplier[]> {
    await db.init();
    return db.searchSuppliers(query).map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      contactPerson: s.contact_person,
      npwp: s.npwp,
      notes: s.notes,
      productCount: s.product_count,
      totalPurchases: s.total_purchases,
      created_at: s.created_at,
      updated_at: s.updated_at,
    })) as Supplier[];
  }

  async count(): Promise<number> {
    await db.init();
    return db.getAllSuppliers().length;
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.clearAll();
  }
}

export const indexdbSupplier = new IndexDBSupplier();