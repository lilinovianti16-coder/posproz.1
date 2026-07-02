/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 */

import { db } from './DatabaseService';

class IndexDBCategory {
  async initDb(): Promise<void> {
    await db.init();
  }

  async getAll(): Promise<string[]> {
    await db.init();
    return db.getAllCategories().map(c => c.name);
  }

  async add(name: string): Promise<void> {
    await db.init();
    db.createCategory(name);
  }

  async delete(name: string): Promise<void> {
    await db.init();
    const cats = db.getAllCategories();
    const found = cats.find(c => c.name === name);
    if (found) db.deleteCategory(found.id);
  }
}

export const indexdbCategory = new IndexDBCategory();