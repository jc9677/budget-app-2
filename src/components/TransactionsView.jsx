import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

import { getAllAccounts } from '../db/indexedDb';
import { getAllTransactions, addTransaction, updateTransaction, deleteTransaction } from '../db/indexedDb';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';


const frequencies = [
  'Once',
  'Daily',
  'Weekly',
  'Biweekly',
  'Monthly',
  'Bimonthly',
  'Annually',
];

const defaultCategories = [
  'Mortgage', 'Property taxes', 'Natural Gas', 'Electricity', 'Water', 'Pet food', 'Vet', 'Groceries', 'Coffee', 'Cell phone', 'Home maintenance', 'Home insurance', 'Car repair', 'Auto insurance', 'Fuel', 'Gifts', 'Internet', 'Clothing', 'Dining out / takeout', 'Online Subscriptions', 'Lawn care / landscaping', 'Medical / dental expenses', 'Travel / vacations', 'Savings', 'Entertainment', 'Hobbies', 'Charitable donations', 'Other/Miscellaneous', 'Haircuts / personal grooming', 'Gym membership or fitness classes', 'Health insurance premiums', 'Life insurance', 'Childcare or school tuition', 'School supplies / kids’ activities', 'House cleaning service', 'HOA fees', 'Parking / tolls', 'Loan payments', 'Business expenses', 'Postage / shipping', 'Home security / alarm system', 'Banking fees', 'Legal / accounting services'
];

export default function TransactionsView() {
  const [transactions, setTransactions] = React.useState([]);
  const [accounts, setAccounts] = React.useState([]);
  const [categories, setCategories] = React.useState(defaultCategories);
  const [form, setForm] = React.useState({
    name: '',
    amount: '',
    frequency: 'Monthly',
    type: 'expense',
    accountId: '',
    startDate: '',
    endDate: '',
    category: defaultCategories[0],
    newCategory: '',
  });
  const [editDialog, setEditDialog] = React.useState({ open: false, tx: null });
  const [editForm, setEditForm] = React.useState({});

  const refreshData = async () => {
    const [txs, accs] = await Promise.all([getAllTransactions(), getAllAccounts()]);
    setTransactions(txs);
    setAccounts(accs);
    
    // Extract unique categories from existing transactions and merge with defaults
    const existingCategories = [...new Set(txs.map(tx => tx.category).filter(Boolean))];
    const allCategories = [...new Set([...defaultCategories, ...existingCategories])];
    setCategories(allCategories);
  };

  React.useEffect(() => {
    refreshData();
  }, []);


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddCategory = () => {
    if (form.newCategory && !categories.includes(form.newCategory)) {
      setCategories([...categories, form.newCategory]);
      setForm({ ...form, category: form.newCategory, newCategory: '' });
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.accountId) return;
    try {
      // Remove id if present to avoid IndexedDB constraint errors
      const { id, newCategory, ...txData } = form;
      await addTransaction({ ...txData, amount: parseFloat(form.amount) });
      await refreshData();
      setForm({
        name: '',
        amount: '',
        frequency: 'Monthly',
        type: 'expense',
        accountId: '',
        startDate: '',
        endDate: '',
        category: categories[0],
        newCategory: '',
      });
    } catch (e) {
      alert('Error adding transaction: ' + (e?.message || e));
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Transactions (Income & Expenses)
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <TextField
          select
          label="Category"
          name="category"
          value={form.category}
          onChange={handleChange}
          size="small"
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Add Category"
          name="newCategory"
          value={form.newCategory}
          onChange={handleChange}
          size="small"
        />
        <Button variant="outlined" onClick={handleAddCategory} disabled={!form.newCategory}>
          Add Category
        </Button>
        <TextField
          label="Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          size="small"
        />
        <TextField
          label="Amount"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          size="small"
          type="number"
        />
        <TextField
          select
          label="Type"
          name="type"
          value={form.type}
          onChange={handleChange}
          size="small"
        >
          <MenuItem value="expense">Expense</MenuItem>
          <MenuItem value="income">Income</MenuItem>
        </TextField>
        <TextField
          select
          label="Account"
          name="accountId"
          value={form.accountId}
          onChange={handleChange}
          size="small"
        >
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Frequency"
          name="frequency"
          value={form.frequency}
          onChange={handleChange}
          size="small"
        >
          {frequencies.map((f) => (
            <MenuItem key={f} value={f}>{f}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Start Date"
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={handleChange}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          name="endDate"
          type="date"
          value={form.endDate}
          onChange={handleChange}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </Box>
      <List>
        {transactions.map((tx) => (
          <ListItem key={tx.id} secondaryAction={
            <>
              <IconButton edge="end" aria-label="edit" onClick={() => {
                setEditForm(tx);
                setEditDialog({ open: true, tx });
              }}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={async () => {
                await deleteTransaction(tx.id);
                await refreshData();
              }}>
                <DeleteIcon />
              </IconButton>
            </>
          }>
            <ListItemText
              primary={`${tx.name} (${tx.type})`}
              secondary={`$${tx.amount} | ${tx.frequency} | ${tx.category || ''} | Account: ${accounts.find(a => a.id === tx.accountId)?.name || ''}`}
            />
          </ListItem>
        ))}
      </List>
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, tx: null })}
        maxWidth="sm"
        fullWidth
        scroll="body"
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle>Edit Transaction</DialogTitle>
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
            label="Name" 
            name="name" 
            value={editForm.name || ''} 
            onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
            size="small" 
            sx={{ gridColumn: '1 / -1' }}
          />
          <TextField 
            label="Amount" 
            name="amount" 
            value={editForm.amount || ''} 
            onChange={e => setEditForm({ ...editForm, amount: e.target.value })} 
            size="small" 
            type="number" 
          />
          <TextField 
            select 
            label="Type" 
            name="type" 
            value={editForm.type || ''} 
            onChange={e => setEditForm({ ...editForm, type: e.target.value })} 
            size="small"
          >
            <MenuItem value="expense">Expense</MenuItem>
            <MenuItem value="income">Income</MenuItem>
          </TextField>
          <TextField 
            select 
            label="Account" 
            name="accountId" 
            value={editForm.accountId || ''} 
            onChange={e => setEditForm({ ...editForm, accountId: e.target.value })} 
            size="small"
          >
            {accounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
            ))}
          </TextField>
          <TextField 
            select 
            label="Frequency" 
            name="frequency" 
            value={editForm.frequency || ''} 
            onChange={e => setEditForm({ ...editForm, frequency: e.target.value })} 
            size="small"
          >
            {frequencies.map((f) => (
              <MenuItem key={f} value={f}>{f}</MenuItem>
            ))}
          </TextField>
          <TextField 
            label="Start Date" 
            name="startDate" 
            type="date" 
            value={editForm.startDate || ''} 
            onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} 
            size="small" 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            label="End Date" 
            name="endDate" 
            type="date" 
            value={editForm.endDate || ''} 
            onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} 
            size="small" 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            select 
            label="Category" 
            name="category" 
            value={editForm.category || ''} 
            onChange={e => setEditForm({ ...editForm, category: e.target.value })} 
            size="small"
            sx={{ gridColumn: '1 / -1' }}
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, tx: null })}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            await updateTransaction({ ...editForm, amount: parseFloat(editForm.amount) });
            await refreshData();
            setEditDialog({ open: false, tx: null });
          }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
