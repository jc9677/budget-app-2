import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { getAllAccounts, getAllTransactions } from '../db/indexedDb';
import { generateAllOccurrences } from '../utils/recurrence';




// Forecast logic: show each occurrence as a row, with running balance for each account
function forecastRows(accounts, transactions, fromDate, toDate) {
  const occurrences = generateAllOccurrences(transactions, fromDate, toDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  // Map of accountId to running balance
  const balances = {};
  // Build rows: for each occurrence, show date, account, category, type, amount, and resulting balance
  return occurrences.map(occ => {
    if (!(occ.accountId in balances)) {
      const acc = accounts.find(a => a.id === occ.accountId);
      balances[occ.accountId] = acc ? acc.balance : 0;
    }
    if (occ.type === 'income') {
      balances[occ.accountId] += occ.amount;
    } else {
      balances[occ.accountId] -= occ.amount;
    }
    return {
      date: occ.date,
      account: accounts.find(a => a.id === occ.accountId)?.name || occ.accountId,
      category: occ.category,
      type: occ.type,
      amount: occ.amount,
      balance: balances[occ.accountId],
    };
  });
}




export default function ForecastTable() {
  const [accounts, setAccounts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [fromDate, setFromDate] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 29);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });

  React.useEffect(() => {
    Promise.all([getAllAccounts(), getAllTransactions()]).then(([acc, txs]) => {
      setAccounts(acc);
      setTransactions(txs);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      setRows(forecastRows(acc, txs, from, to));
    });
  }, [fromDate, toDate]);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Forecast Table
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="From"
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
        <TextField
          label="To"
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount ($)</TableCell>
              <TableCell align="right">Balance ($)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.account}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell align="right">{row.amount.toLocaleString()}</TableCell>
                <TableCell align="right">{row.balance.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
