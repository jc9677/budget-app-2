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

// Data management
export async function deleteAllData() {
  const db = await getDb();
  const tx = db.transaction(['accounts', 'transactions', 'settings'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('accounts').clear(),
    tx.objectStore('transactions').clear(),
    tx.objectStore('settings').clear(),
  ]);
  
  await tx.done;
}

// Check if account has associated transactions
export async function getTransactionsByAccountId(accountId) {
  const db = await getDb();
  const allTransactions = await db.getAll('transactions');
  return allTransactions.filter(tx => tx.accountId === accountId);
}

// Delete all transactions for a specific account
export async function deleteTransactionsByAccountId(accountId) {
  const db = await getDb();
  const allTransactions = await db.getAll('transactions');
  const transactionsToDelete = allTransactions.filter(tx => tx.accountId === accountId);
  
  const tx = db.transaction(['transactions'], 'readwrite');
  const store = tx.objectStore('transactions');
  
  for (const transaction of transactionsToDelete) {
    await store.delete(transaction.id);
  }
  
  await tx.done;
  return transactionsToDelete.length;
}
