/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  credit_limit: number;
  credit_used: number;
  notes: string;
  created_at: number;
  updated_at: number;
}

class IndexDBCustomer {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<Customer[]> {
    await db.init();
    return db.getAllCustomers() as Customer[];
  }

  async getById(id: string): Promise<Customer | undefined> {
    await db.init();
    const c = db.getCustomerById(id);
    return c || undefined;
  }

  async save(customer: Customer): Promise<void> {
    await db.init();
    const existing = db.getCustomerById(customer.id);
    if (existing) {
      db.updateCustomer(customer);
    } else {
      await db.createCustomer(customer);
    }
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.deleteCustomer(id);
  }

  async count(): Promise<number> {
    await db.init();
    return db.getAllCustomers().length;
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.clearAll();
  }
}

export const indexdbCustomer = new IndexDBCustomer();