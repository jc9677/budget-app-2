import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

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
  
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };
  
  const [form, setForm] = React.useState({
    name: '',
    amount: '',
    frequency: 'Monthly',
    type: 'expense',
    accountId: '',
    startDate: getCurrentDate(),
    endDate: '',
    category: defaultCategories[0],
    newCategory: '',
    indefinitely: true,
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
      // Remove id and UI-only fields to avoid IndexedDB constraint errors
      const { id, newCategory, indefinitely, ...txData } = form;
      
      // If indefinitely is true, don't include endDate
      if (indefinitely) {
        delete txData.endDate;
      }
      
      await addTransaction({ ...txData, amount: parseFloat(form.amount) });
      await refreshData();
      setForm({
        name: '',
        amount: '',
        frequency: 'Monthly',
        type: 'expense',
        accountId: '',
        startDate: getCurrentDate(),
        endDate: '',
        category: categories[0],
        newCategory: '',
        indefinitely: true,
      });
    } catch (e) {
      alert('Error adding transaction: ' + (e?.message || e));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Recurring Transactions
      </Typography>
      
      {/* Add New Transaction Section */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        border: '2px dashed #e0e0e0', 
        borderRadius: 2,
        bgcolor: '#fafafa'
      }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
          Add New Transaction
        </Typography>
        
        {/* Basic Information Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          <TextField
            label="Transaction Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            size="small"
            fullWidth
            placeholder="e.g., Monthly Rent, Grocery Shopping"
          />
          <TextField
            label="Amount"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            size="small"
            type="number"
            fullWidth
            InputProps={{
              startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>
            }}
          />
          <TextField
            select
            label="Type"
            name="type"
            value={form.type}
            onChange={handleChange}
            size="small"
            fullWidth
          >
            <MenuItem value="expense">💸 Expense</MenuItem>
            <MenuItem value="income">💰 Income</MenuItem>
          </TextField>
        </Box>

        {/* Account and Frequency Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
          <TextField
            select
            label="Account"
            name="accountId"
            value={form.accountId}
            onChange={handleChange}
            size="small"
            fullWidth
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
            fullWidth
          >
            {frequencies.map((f) => (
              <MenuItem key={f} value={f}>{f}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              label="Start Date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              size="small"
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.indefinitely}
                  onChange={(e) => setForm({ ...form, indefinitely: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
                  size="small"
                />
              }
              label="Continues indefinitely"
              sx={{ mt: 0.5 }}
            />
            {!form.indefinitely && (
              <TextField
                label="End Date"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                size="small"
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            )}
          </Box>
        </Box>

        {/* Category Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            label="Category"
            name="category"
            value={form.category}
            onChange={handleChange}
            size="small"
            sx={{ minWidth: 200, flex: 1 }}
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
          <Typography sx={{ color: 'text.secondary' }}>or</Typography>
          <TextField
            label="Add New Category"
            name="newCategory"
            value={form.newCategory}
            onChange={handleChange}
            size="small"
            sx={{ minWidth: 200 }}
            placeholder="Enter custom category"
          />
          <Button 
            variant="outlined" 
            onClick={handleAddCategory} 
            disabled={!form.newCategory}
            size="small"
          >
            Add Category
          </Button>
        </Box>

        {/* Add Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            onClick={handleAdd}
            size="large"
            sx={{ px: 4 }}
            disabled={!form.name || !form.amount || !form.accountId}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>

      {/* Transactions List */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Your Recurring Transactions ({transactions.length})
      </Typography>
      
      {transactions.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 6, 
          color: 'text.secondary',
          border: '1px solid #e0e0e0',
          borderRadius: 2,
          bgcolor: '#fafafa'
        }}>
          <Typography variant="h6" gutterBottom>
            No recurring transactions yet
          </Typography>
          <Typography>
            Add your first recurring transaction above to start tracking your budget.
          </Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {transactions.map((tx) => (
            <ListItem 
              key={tx.id} 
              sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                mb: 2,
                bgcolor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transform: 'translateY(-1px)'
                }
              }}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton 
                    onClick={() => {
                      setEditForm({ ...tx, indefinitely: !tx.endDate });
                      setEditDialog({ open: true, tx });
                    }}
                    title="Edit transaction"
                    sx={{ 
                      bgcolor: 'primary.50', 
                      color: 'primary.main',
                      '&:hover': { bgcolor: 'primary.100' }
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to delete "${tx.name}"?`)) {
                        await deleteTransaction(tx.id);
                        await refreshData();
                      }
                    }}
                    title="Delete transaction"
                    sx={{ 
                      bgcolor: 'error.50', 
                      color: 'error.main',
                      '&:hover': { bgcolor: 'error.100' }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                      {tx.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1, 
                        bgcolor: tx.type === 'income' ? 'success.100' : 'error.100',
                        color: tx.type === 'income' ? 'success.dark' : 'error.dark',
                        fontWeight: 'bold'
                      }}
                    >
                      {tx.type === 'income' ? '💰 Income' : '💸 Expense'}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body1" sx={{ 
                      color: tx.type === 'income' ? 'success.main' : 'error.main', 
                      fontWeight: 'bold', 
                      fontSize: '1.1rem' 
                    }}>
                      ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • {tx.frequency}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {tx.category && `${tx.category} • `}
                      Account: {accounts.find(a => a.id === tx.accountId)?.name || 'Unknown'}
                      {tx.startDate && ` • Starts: ${new Date(tx.startDate).toLocaleDateString()}`}
                      {tx.endDate && ` • Ends: ${new Date(tx.endDate).toLocaleDateString()}`}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, tx: null })}
        maxWidth="md"
        fullWidth
        scroll="body"
        PaperProps={{
          sx: { maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6">Edit Transaction</Typography>
        </DialogTitle>
        <DialogContent sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: 3, 
          pt: 3,
          pb: 2,
          minHeight: 'auto',
          overflow: 'visible'
        }}>
          <TextField 
            label="Transaction Name" 
            name="name" 
            value={editForm.name || ''} 
            onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
            size="small" 
            sx={{ gridColumn: '1 / -1' }}
            fullWidth
          />
          <TextField 
            label="Amount" 
            name="amount" 
            value={editForm.amount || ''} 
            onChange={e => setEditForm({ ...editForm, amount: e.target.value })} 
            size="small" 
            type="number" 
            fullWidth
            InputProps={{
              startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>
            }}
          />
          <TextField 
            select 
            label="Type" 
            name="type" 
            value={editForm.type || ''} 
            onChange={e => setEditForm({ ...editForm, type: e.target.value })} 
            size="small"
            fullWidth
          >
            <MenuItem value="expense">💸 Expense</MenuItem>
            <MenuItem value="income">💰 Income</MenuItem>
          </TextField>
          <TextField 
            select 
            label="Account" 
            name="accountId" 
            value={editForm.accountId || ''} 
            onChange={e => setEditForm({ ...editForm, accountId: e.target.value })} 
            size="small"
            fullWidth
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
            fullWidth
          >
            {frequencies.map((f) => (
              <MenuItem key={f} value={f}>{f}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField 
              label="Start Date" 
              name="startDate" 
              type="date" 
              value={editForm.startDate || ''} 
              onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} 
              size="small" 
              InputLabelProps={{ shrink: true }} 
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={editForm.indefinitely || false}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    indefinitely: e.target.checked, 
                    endDate: e.target.checked ? '' : editForm.endDate 
                  })}
                  size="small"
                />
              }
              label="Continues indefinitely"
              sx={{ mt: 0.5 }}
            />
            {!editForm.indefinitely && (
              <TextField 
                label="End Date" 
                name="endDate" 
                type="date" 
                value={editForm.endDate || ''} 
                onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} 
                size="small" 
                InputLabelProps={{ shrink: true }} 
                fullWidth
              />
            )}
          </Box>
          <TextField 
            select 
            label="Category" 
            name="category" 
            value={editForm.category || ''} 
            onChange={e => setEditForm({ ...editForm, category: e.target.value })} 
            size="small"
            fullWidth
          >
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setEditDialog({ open: false, tx: null })} size="large">
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              // Remove UI-only fields and handle indefinitely checkbox
              const { indefinitely, ...txData } = editForm;
              
              // If indefinitely is true, don't include endDate
              if (indefinitely) {
                delete txData.endDate;
              }
              
              await updateTransaction({ ...txData, amount: parseFloat(editForm.amount) });
              await refreshData();
              setEditDialog({ open: false, tx: null });
            }}
            size="large"
            sx={{ px: 4 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
