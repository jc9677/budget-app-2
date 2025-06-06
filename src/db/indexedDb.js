// src/db/indexedDb.js
import { openDB } from 'idb';

const DB_NAME = 'budgetApp';
const DB_VERSION = 1;

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
}

export async function getAllAccounts() {
  const db = await getDb();
  return db.getAll('accounts');
}

export async function addAccount(account) {
  const db = await getDb();
  return db.add('accounts', account);
}

export async function updateAccount(account) {
  const db = await getDb();
  return db.put('accounts', account);
}

export async function deleteAccount(id) {
  const db = await getDb();
  return db.delete('accounts', id);
}

// Transactions
export async function getAllTransactions() {
  const db = await getDb();
  return db.getAll('transactions');
}

export async function addTransaction(tx) {
  const db = await getDb();
  return db.add('transactions', tx);
}

export async function updateTransaction(tx) {
  const db = await getDb();
  return db.put('transactions', tx);
}

export async function deleteTransaction(id) {
  const db = await getDb();
  return db.delete('transactions', id);
}

// Settings
export async function getSetting(key) {
  const db = await getDb();
  return db.get('settings', key);
}

export async function setSetting(key, value) {
  const db = await getDb();
  return db.put('settings', { key, value });
}
