import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { 
  getAllAccounts, 
  addAccount, 
  updateAccount, 
  deleteAccount, 
  getTransactionsByAccountId,
  deleteTransactionsByAccountId 
} from '../db/indexedDb';

export default function AccountsView() {
  const [accounts, setAccounts] = React.useState([]);
  const [newAccountName, setNewAccountName] = React.useState('');
  const [newAccountBalance, setNewAccountBalance] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editForm, setEditForm] = React.useState({ name: '', balance: '' });
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, account: null, transactions: [] });
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });

  React.useEffect(() => {
    refreshAccounts();
  }, []);

  const refreshAccounts = async () => {
    const accountsData = await getAllAccounts();
    setAccounts(accountsData);
  };

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      showMessage('Account name is required', 'error');
      return;
    }
    
    try {
      const balance = parseFloat(newAccountBalance) || 0;
      await addAccount({ name: newAccountName.trim(), balance });
      await refreshAccounts();
      setNewAccountName('');
      setNewAccountBalance('');
      showMessage('Account added successfully!');
    } catch (error) {
      showMessage('Failed to add account: ' + error.message, 'error');
    }
  };

  const handleEditStart = (account) => {
    setEditingId(account.id);
    setEditForm({ name: account.name, balance: account.balance.toString() });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ name: '', balance: '' });
  };

  const handleEditSave = async (accountId) => {
    if (!editForm.name.trim()) {
      showMessage('Account name is required', 'error');
      return;
    }

    try {
      const balance = parseFloat(editForm.balance) || 0;
      await updateAccount({ 
        id: accountId, 
        name: editForm.name.trim(), 
        balance 
      });
      await refreshAccounts();
      setEditingId(null);
      setEditForm({ name: '', balance: '' });
      showMessage('Account updated successfully!');
    } catch (error) {
      showMessage('Failed to update account: ' + error.message, 'error');
    }
  };

  const handleDeleteClick = async (account) => {
    try {
      const associatedTransactions = await getTransactionsByAccountId(account.id);
      setDeleteDialog({ 
        open: true, 
        account, 
        transactions: associatedTransactions 
      });
    } catch (error) {
      showMessage('Failed to check account transactions: ' + error.message, 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    const { account, transactions } = deleteDialog;
    
    try {
      // Delete all associated transactions first
      if (transactions.length > 0) {
        await deleteTransactionsByAccountId(account.id);
      }
      
      // Then delete the account
      await deleteAccount(account.id);
      await refreshAccounts();
      
      const message = transactions.length > 0 
        ? `Account "${account.name}" and ${transactions.length} associated transaction(s) deleted successfully!`
        : `Account "${account.name}" deleted successfully!`;
      
      showMessage(message);
      setDeleteDialog({ open: false, account: null, transactions: [] });
    } catch (error) {
      showMessage('Failed to delete account: ' + error.message, 'error');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, account: null, transactions: [] });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Accounts
      </Typography>
      
      <List>
        {accounts.map((account) => (
          <ListItem 
            key={account.id}
            sx={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: 1, 
              mb: 1,
              bgcolor: editingId === account.id ? '#f5f5f5' : 'transparent'
            }}
          >
            {editingId === account.id ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <TextField
                  label="Account Name"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Balance"
                  value={editForm.balance}
                  onChange={e => setEditForm({ ...editForm, balance: e.target.value })}
                  size="small"
                  type="number"
                  sx={{ width: 120 }}
                />
                <IconButton 
                  color="primary" 
                  onClick={() => handleEditSave(account.id)}
                  title="Save changes"
                >
                  <SaveIcon />
                </IconButton>
                <IconButton 
                  onClick={handleEditCancel}
                  title="Cancel editing"
                >
                  <CancelIcon />
                </IconButton>
              </Box>
            ) : (
              <>
                <ListItemText
                  primary={account.name}
                  secondary={`Balance: $${account.balance.toLocaleString()}`}
                />
                <IconButton 
                  edge="end" 
                  onClick={() => handleEditStart(account)}
                  title="Edit account"
                  sx={{ mr: 1 }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  edge="end" 
                  onClick={() => handleDeleteClick(account)}
                  title="Delete account"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField
          label="Account Name"
          value={newAccountName}
          onChange={e => setNewAccountName(e.target.value)}
          size="small"
          onKeyPress={e => e.key === 'Enter' && handleAddAccount()}
        />
        <TextField
          label="Initial Balance"
          value={newAccountBalance}
          onChange={e => setNewAccountBalance(e.target.value)}
          size="small"
          type="number"
          onKeyPress={e => e.key === 'Enter' && handleAddAccount()}
        />
        <Button variant="contained" onClick={handleAddAccount}>
          Add Account
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the account "{deleteDialog.account?.name}"?
          </DialogContentText>
          
          {deleteDialog.transactions.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Warning:</strong> This account has {deleteDialog.transactions.length} 
              associated recurring transaction(s). Deleting this account will also permanently 
              delete all of these transactions:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                {deleteDialog.transactions.slice(0, 5).map((tx, index) => (
                  <li key={index}>{tx.name} (${tx.amount})</li>
                ))}
                {deleteDialog.transactions.length > 5 && (
                  <li>...and {deleteDialog.transactions.length - 5} more</li>
                )}
              </ul>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Delete {deleteDialog.transactions.length > 0 ? 'Account & Transactions' : 'Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
