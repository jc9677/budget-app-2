// src/utils/recurrence.js
// Utility functions for generating occurrences of recurring transactions

/**
 * Generate all occurrences of a recurring transaction between two dates.
 * @param {Object} tx - The transaction object (must have frequency, startDate, endDate, amount, type, accountId, category)
 * @param {Date} fromDate - Start of forecast window
 * @param {Date} toDate - End of forecast window
 * @returns {Array} Array of occurrence objects {date, amount, type, accountId, category, baseId}
 */
export function generateOccurrences(tx, fromDate, toDate) {
  const occurrences = [];
  if (!tx.startDate) return occurrences;
  const freq = tx.frequency;
  let current = new Date(tx.startDate);
  const end = tx.endDate ? new Date(tx.endDate) : toDate;
  while (current <= end && current <= toDate) {
    if (current >= fromDate) {
      occurrences.push({
        date: current.toISOString().slice(0, 10),
        amount: tx.amount,
        type: tx.type,
        accountId: tx.accountId,
        category: tx.category,
        baseId: tx.id,
      });
    }
    // Advance to next occurrence
    switch (freq) {
      case 'Once':
        current = new Date(end.getTime() + 1); // break loop
        break;
      case 'Daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'Weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'Biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'Monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'Bimonthly':
        current.setMonth(current.getMonth() + 2);
        break;
      case 'Annually':
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        current = new Date(end.getTime() + 1); // break loop
    }
  }
  return occurrences;
}

/**
 * Generate all occurrences for a list of transactions
 */
export function generateAllOccurrences(transactions, fromDate, toDate) {
  return transactions.flatMap(tx => generateOccurrences(tx, fromDate, toDate));
}
