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




// Helper to build chart data for grouped (monthly/annual) views
function getGroupedChartData(rows, accounts) {
  if (!Array.isArray(rows) || !rows.length) return [];
  // We want a time series: for each group, the end-of-period balance for each account
  // We'll accumulate balances as we go, so the chart shows the progression
  const chartData = [];
  // Start with initial balances
  const running = {};
  accounts.forEach(acc => {
    running[acc.name] = acc.balance || 0;
  });
  rows.forEach(group => {
    const dataPoint = { date: group.groupLabel };
    // For each account, update running balance to this group's end-of-period balance if present
    (group.balances || []).forEach(bal => {
      if (typeof bal.balance === 'number' && !isNaN(bal.balance)) {
        running[bal.account] = bal.balance;
      }
    });
    // Copy current running balances for all accounts
    accounts.forEach(acc => {
      dataPoint[acc.name] = running[acc.name];
    });
    chartData.push(dataPoint);
  });
  return chartData;
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
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Build period boundaries
  const periods = [];
  let cursor = new Date(fromDate);
  let periodEnd;
  while (cursor <= toDate) {
    let groupKey, groupLabel;
    if (view === 'monthly') {
      groupKey = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`;
      groupLabel = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });
      periodEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      periodEnd.setHours(23,59,59,999);
      periods.push({ groupKey, groupLabel, endDate: new Date(periodEnd) });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    } else {
      groupKey = `${cursor.getFullYear()}`;
      groupLabel = cursor.getFullYear();
      periodEnd = new Date(cursor.getFullYear(), 11, 31);
      periodEnd.setHours(23,59,59,999);
      periods.push({ groupKey, groupLabel, endDate: new Date(periodEnd) });
      cursor = new Date(cursor.getFullYear() + 1, 0, 1);
    }
    if (periodEnd > toDate) break;
  }

  // Start with initial balances
  const balances = {};
  accounts.forEach(acc => {
    balances[acc.id] = acc.balance || 0;
  });

  // For each period, sum only the transactions in that period, and update balances
  let occIdx = 0;
  const result = [];
  periods.forEach(period => {
    // Gather occurrences in this period
    const periodStart = result.length === 0 ? new Date(fromDate) : periods[result.length-1].endDate;
    const periodEnd = period.endDate;
    const groupOccurrences = [];
    while (
      occIdx < allOccurrences.length &&
      new Date(allOccurrences[occIdx].date) <= periodEnd
    ) {
      if (new Date(allOccurrences[occIdx].date) > periodStart) {
        groupOccurrences.push(allOccurrences[occIdx]);
      }
      occIdx++;
    }
    // Build summary for this period
    const summary = {};
    groupOccurrences.forEach(occ => {
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
    // Update balances for this period
    const periodBalances = { ...balances };
    groupOccurrences.forEach(occ => {
      if (!(occ.accountId in periodBalances)) periodBalances[occ.accountId] = 0;
      if (occ.type === 'income') {
        periodBalances[occ.accountId] += occ.amount;
      } else {
        periodBalances[occ.accountId] -= occ.amount;
      }
    });
    // Save balances for chart and table
    const balancesArr = Object.entries(periodBalances).map(([accountId, balance]) => {
      const acc = accounts.find(a => String(a.id) === String(accountId));
      return {
        account: acc ? acc.name : 'Unknown',
        balance: typeof balance === 'number' && !isNaN(balance) ? balance : 0,
      };
    });
    // Update running balances for next period
    Object.assign(balances, periodBalances);
    result.push({
      groupLabel: period.groupLabel,
      summary: Object.values(summary),
      balances: balancesArr,
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

  // Prepare chart data for each view
  const chartData = React.useMemo(() => {
    if (view === 'detailed') return rows;
    return getGroupedChartData(rows, accounts);
  }, [rows, accounts, view]);

  return (
    <>
      <ForecastLineChart rows={chartData} accounts={accounts} />
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
                  {/* End-of-period balances row */}
                  {Array.isArray(group.balances) && group.balances.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} style={{ fontWeight: 600, color: '#1976d2' }}>
                        End-of-{view === 'monthly' ? 'month' : 'year'} balance
                      </TableCell>
                      <TableCell colSpan={2} align="right">
                        {group.balances.map((bal, k) => (
                          <span key={k} style={{ marginRight: 16 }}>
                            {bal.account}: <b>${bal.balance.toLocaleString()}</b>
                          </span>
                        ))}
                      </TableCell>
                    </TableRow>
                  )}
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
