/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 🔄 BRIDGE: IndexedDB → SQLite (via DatabaseService)
 * 
 * Manajemen user: login, logout, CRUD akun
 * Mendukung role: super_admin, admin, kasir, gudang
 */

import { db } from './DatabaseService';

export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Global state untuk user yang sedang login
let currentUser: User | null = null;

class IndexDBUser {
  async initDb(): Promise<void> {
    await db.init();
  }

  /**
   * Login dengan username & password
   * Return { success, user, error } untuk memudahkan handling di UI
   */
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      await db.init();
      const user = db.getUserByUsername(username);
      
      if (!user) {
        return { success: false, error: 'Username tidak ditemukan' };
      }
      
      if (user.password !== password) {
        return { success: false, error: 'Password salah' };
      }
      
      if (!user.is_active) {
        return { success: false, error: 'Akun ini telah dinonaktifkan. Hubungi Super Admin.' };
      }
      
      currentUser = user;
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Terjadi kesalahan sistem saat login' };
    }
  }

  logout(): void {
    currentUser = null;
  }

  getCurrentUser(): User | null {
    return currentUser;
  }

  isLoggedIn(): boolean {
    return currentUser !== null;
  }

  isAdmin(): boolean {
    return currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  }

  isSuperAdmin(): boolean {
    return currentUser?.role === 'super_admin';
  }

  async getAll(): Promise<User[]> {
    await db.init();
    return db.getAllUsers() as User[];
  }

  async getById(id: string): Promise<User | undefined> {
    await db.init();
    const u = db.getUserById(id);
    return u || undefined;
  }

  async save(user: User): Promise<void> {
    await db.init();
    const now = Date.now();
    db.execute(
      `INSERT OR REPLACE INTO users (id, username, password, role, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM users WHERE id = ?), ?), ?)`,
      [user.id, user.username, user.password, user.role, user.name, user.is_active, user.id, now, now]
    );
  }

  async delete(id: string): Promise<void> {
    await db.init();
    db.execute('DELETE FROM users WHERE id = ?', [id]);
  }

  async clearAll(): Promise<void> {
    await db.init();
    db.execute('DELETE FROM users');
    // Re-seed admin & super_admin
    db.execute(
      `INSERT OR IGNORE INTO users (id, username, password, role, name, is_active, created_at, updated_at)
       VALUES ('user_admin', 'admin', 'admin123', 'admin', 'Administrator', 1, ?, ?)`,
      [Date.now(), Date.now()]
    );
    db.execute(
      `INSERT OR IGNORE INTO users (id, username, password, role, name, is_active, created_at, updated_at)
       VALUES ('user_super', 'superadmin', 'superadmin123', 'super_admin', 'Super Administrator', 1, ?, ?)`,
      [Date.now(), Date.now()]
    );
  }

  /**
   * Generate ID unik untuk user baru
   */
  generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const indexdbUser = new IndexDBUser();