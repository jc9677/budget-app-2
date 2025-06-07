import * as React from 'react';
import Table from '@mui/material/Table';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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
  const [view, setView] = React.useState('detailed'); // 'detailed', 'monthly', 'annual'
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
      if (view === 'detailed') {
        setRows(forecastRows(acc, txs, from, to));
      } else {
        setRows(groupedForecastRows(acc, txs, from, to, view));
      }
    });
  }, [fromDate, toDate, view]);
  // Grouping logic for monthly/annual views
  function groupedForecastRows(accounts, transactions, fromDate, toDate, view) {
    // Generate all occurrences in range
    const allOccurrences = generateAllOccurrences(transactions, new Date('1900-01-01'), toDate)
      .filter(occ => {
        const d = new Date(occ.date);
        return d >= fromDate && d <= toDate;
      });
    // Group by month or year
    const groups = {};
    allOccurrences.forEach(occ => {
      const d = new Date(occ.date);
      let groupKey, groupLabel;
      if (view === 'monthly') {
        groupKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        groupLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else {
        groupKey = `${d.getFullYear()}`;
        groupLabel = d.getFullYear();
      }
      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, occurrences: [] };
      }
      groups[groupKey].occurrences.push(occ);
    });
    // For each group, sum by transaction/category
    const result = [];
    Object.values(groups).forEach(group => {
      // Map: { category|desc|type|accountId: { ...info, total, count } }
      const summary = {};
      group.occurrences.forEach(occ => {
        const key = `${occ.accountId}|${occ.category}|${occ.type}|${occ.baseId||occ.id}`;
        if (!summary[key]) {
          summary[key] = {
            account: accounts.find(a => a.id === occ.accountId)?.name || 'Unknown',
            category: occ.category,
            type: occ.type,
            total: 0,
            count: 0,
            label: occ.label || '',
            baseAmount: occ.amount,
          };
        }
        summary[key].total += occ.amount;
        summary[key].count += 1;
      });
      result.push({
        groupLabel: group.label,
        summary: Object.values(summary),
      });
    });
    return Array.isArray(result) ? result : [];
  }

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
      <ForecastLineChart rows={view === 'detailed' ? rows : []} accounts={accounts} />
      <Typography variant="h6" gutterBottom>
        Forecast Table
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(e, val) => val && setView(val)}
          size="small"
        >
          <ToggleButton value="detailed">Detailed</ToggleButton>
          <ToggleButton value="monthly">Monthly</ToggleButton>
          <ToggleButton value="annual">Annual</ToggleButton>
        </ToggleButtonGroup>
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
      {view === 'detailed' ? (
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
              {(Array.isArray(rows) ? rows : []).map((row, idx) => (
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
                  <TableCell align="right">{(typeof row.balance === 'number' && !isNaN(row.balance) ? row.balance : 0).toLocaleString()}</TableCell>
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
      ) : (
        (Array.isArray(rows) ? rows : []).map((group, idx) => (
          <Box key={idx} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
              {group.groupLabel}
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Total ($)</TableCell>
                    <TableCell align="right">Occurrences</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Array.isArray(group.summary) ? group.summary : []).map((item, j) => (
                    <TableRow key={j}>
                      <TableCell>{item.account}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell align="right">
                        <span style={{ color: item.type === 'income' ? 'green' : 'red', fontWeight: 500 }}>
                          {item.type === 'income' ? '+' : '-'}${Math.abs(item.total).toLocaleString()}
                        </span>
                        {item.count > 1 && (
                          <span style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>
                            ({item.count} x ${Math.abs(item.baseAmount)})
                          </span>
                        )}
                      </TableCell>
                      <TableCell align="right">{item.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))
      )}
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
