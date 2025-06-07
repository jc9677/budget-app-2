import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ForecastLineChart from './ForecastLineChart';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import { getAllAccounts, getAllTransactions, updateTransaction } from '../db/indexedDb';
import { generateAllOccurrences } from '../utils/recurrence';




// Forecast logic: show each occurrence as a row, with running balance for each account
function forecastRows(accounts, transactions, fromDate, toDate) {
  // 1. Compute starting balance for each account as of fromDate
  const allOccurrences = generateAllOccurrences(transactions, new Date('1900-01-01'), toDate)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const startBalances = {};
  accounts.forEach(acc => {
    startBalances[acc.id] = acc.balance || 0;
  });
  allOccurrences.forEach(occ => {
    if (new Date(occ.date) < fromDate) {
      if (occ.type === 'income') {
        startBalances[occ.accountId] += occ.amount;
      } else {
        startBalances[occ.accountId] -= occ.amount;
      }
    }
  });
  // 2. Now generate occurrences within the range, and use the computed starting balance
  const rangeOccurrences = allOccurrences.filter(occ => {
    const d = new Date(occ.date);
    return d >= fromDate && d <= toDate;
  });
  const balances = { ...startBalances };
  return rangeOccurrences.map(occ => {
    if (!(occ.accountId in balances)) {
      // Should not happen, but fallback to 0
      console.warn(`Account ID ${occ.accountId} not found in balances, using 0`);
      balances[occ.accountId] = 0;
    }
    if (occ.type === 'income') {
      balances[occ.accountId] += occ.amount;
    } else {
      balances[occ.accountId] -= occ.amount;
    }
    
    const account = accounts.find(a => a.id === occ.accountId);
    
    return {
      ...occ,
      date: occ.date,
      account: account?.name || `Unknown Account (${occ.accountId})`,
      category: occ.category,
      type: occ.type,
      amount: occ.amount,
      balance: isNaN(balances[occ.accountId]) ? 0 : balances[occ.accountId],
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
  const [editDialog, setEditDialog] = React.useState({ open: false, occ: null });
  const [editForm, setEditForm] = React.useState({ amount: '', date: '', type: '', category: '' });
  const [editScope, setEditScope] = React.useState('single');

  React.useEffect(() => {
    Promise.all([getAllAccounts(), getAllTransactions()]).then(([acc, txs]) => {
      setAccounts(acc);
      setTransactions(txs);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      setRows(forecastRows(acc, txs, from, to));
    });
  }, [fromDate, toDate]);

  const handleEditClick = (occ) => {
    setEditForm({
      amount: occ.amount,
      date: occ.date,
      type: occ.type,
      category: occ.category,
    });
    setEditDialog({ open: true, occ });
    setEditScope('single');
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    if (!editDialog.occ) return;
    // For demo: only support editing the base transaction (future: store overrides for single occurrence)
    if (editScope === 'future') {
      const tx = transactions.find(t => t.id === editDialog.occ.baseId);
      if (tx) {
        await updateTransaction({ ...tx, ...editForm, amount: parseFloat(editForm.amount) });
        // Refresh
        Promise.all([getAllAccounts(), getAllTransactions()]).then(([acc, txs]) => {
          setAccounts(acc);
          setTransactions(txs);
          const from = new Date(fromDate);
          const to = new Date(toDate);
          setRows(forecastRows(acc, txs, from, to));
        });
      }
    } else {
      alert('Editing a single occurrence is not yet implemented (would require storing overrides).');
    }
    setEditDialog({ open: false, occ: null });
  };

  return (
    <>
      <ForecastLineChart rows={rows} accounts={accounts} />
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
              <TableCell align="center">Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.account}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell align="right">
                  <span style={{ color: row.type === 'income' ? 'green' : 'red', fontWeight: 500 }}>
                    {row.type === 'income' ? '+' : '-'}${Math.abs(row.amount).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell align="right">{row.balance.toLocaleString()}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleEditClick(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, occ: null })} 
        maxWidth="sm" 
        fullWidth
        scroll="body"
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>Edit Occurrence</DialogTitle>
        <DialogContent sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 2, 
          pt: 3,
          pb: 2,
          minHeight: 'auto',
          overflow: 'visible'
        }}>
          <TextField 
            label="Amount" 
            name="amount" 
            value={editForm.amount} 
            onChange={handleEditChange} 
            size="small" 
            type="number" 
          />
          <TextField 
            label="Date" 
            name="date" 
            value={editForm.date} 
            onChange={handleEditChange} 
            size="small" 
            type="date" 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            select 
            label="Type" 
            name="type" 
            value={editForm.type} 
            onChange={handleEditChange} 
            size="small"
          >
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="income">Income</MenuItem>
          </TextField>
          <TextField 
            label="Category" 
            name="category" 
            value={editForm.category} 
            onChange={handleEditChange} 
            size="small" 
          />
          <Box sx={{ gridColumn: '1 / -1', mt: 1 }}>
            <Typography variant="caption" display="block" gutterBottom>Apply changes to:</Typography>
            <TextField 
              select 
              fullWidth 
              size="small" 
              value={editScope} 
              onChange={e => setEditScope(e.target.value)}
            >
              <MenuItem value="single">This occurrence only</MenuItem>
              <MenuItem value="future">All future occurrences</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, occ: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
