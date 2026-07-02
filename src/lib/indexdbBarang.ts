/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 * File ini adalah wrapper agar kode lama tetap berfungsi
 * tanpa mengubah import di halaman-halaman.
 */

import { db } from './DatabaseService';
import type { DBProduct } from './DatabaseService';

class IndexDBBarang {
  async initDb(): Promise<void> {
    await db.init();
  }

  async addBarang(barang: any): Promise<number> {
    await db.init();
    const data: Partial<DBProduct> = {
      id: barang.id,
      name: barang.name,
      sku: barang.sku,
      barcode: barang.barcode,
      category: barang.category,
      price_retail: barang.priceRetail || barang.price || 0,
      price_wholesale: barang.priceWholesale || barang.wholesale_price || 0,
      price_cost: barang.priceCost || barang.cost_price || 0,
      stock: barang.stock || 0,
      min_stock: barang.min_stock || 0,
      supplier_id: barang.supplierId || '',
      supplier_name: barang.supplierName || '',
    };
    await db.createProduct(data);
    return 1;
  }

  async getBarang(id: string | number): Promise<any> {
    await db.init();
    const p = db.getProductById(String(id));
    if (!p) return null;
    return this.mapToLegacy(p);
  }

  async getAllBarang(): Promise<any[]> {
    await db.init();
    return db.getAllProducts().map(p => this.mapToLegacy(p));
  }

  async updateBarang(barang: any): Promise<void> {
    await db.init();

    const productId = String(barang.id || '');
    const payload: Partial<DBProduct> = {
      id: productId || undefined,
      name: barang.name,
      sku: barang.sku,
      barcode: barang.barcode,
      category: barang.category,
      price_retail: barang.priceRetail || barang.price || 0,
      price_wholesale: barang.priceWholesale || barang.wholesale_price || 0,
      price_cost: barang.priceCost || barang.cost_price || 0,
      stock: barang.stock || 0,
      min_stock: barang.min_stock || barang.minStock || 0,
      supplier_id: barang.supplierId || '',
      supplier_name: barang.supplierName || '',
    };

    if (productId && db.getProductById(productId)) {
      await db.updateProduct(payload);
    } else {
      await db.createProduct(payload);
    }
  }

  async deleteBarang(id: string | number): Promise<void> {
    await db.init();
    db.deleteProduct(String(id));
  }

  async count(): Promise<number> {
    await db.init();
    return db.getProductCount();
  }

  async getAllBarangLegacy(): Promise<any[]> {
    return this.getAllBarang();
  }

  async getPaged(offset: number, limit: number): Promise<any[]> {
    await db.init();
    const all = db.getAllProducts();
    return all.slice(offset, offset + limit).map(p => this.mapToLegacy(p));
  }

  async search(query: string): Promise<any[]> {
    await db.init();
    return db.searchProducts(query).map(p => this.mapToLegacy(p));
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.clearAll();
  }

  private mapToLegacy(p: DBProduct): any {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      priceRetail: p.price_retail,
      price: p.price_retail,
      priceWholesale: p.price_wholesale,
      wholesale_price: p.price_wholesale,
      priceCost: p.price_cost,
      cost_price: p.price_cost,
      stock: p.stock,
      min_stock: p.min_stock,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      created_at: p.created_at,
      updated_at: p.updated_at
    };
  }
}

export const indexdbBarang = new IndexDBBarang();