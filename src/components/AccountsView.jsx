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
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Accounts
      </Typography>
      
      {/* Add New Account Section */}
      <Box sx={{ 
        mb: 4, 
        p: 3, 
        border: '2px dashed #e0e0e0', 
        borderRadius: 2,
        bgcolor: '#fafafa'
      }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Add New Account
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Account Name"
            value={newAccountName}
            onChange={e => setNewAccountName(e.target.value)}
            size="small"
            sx={{ minWidth: 200, flex: 1 }}
            onKeyPress={e => e.key === 'Enter' && handleAddAccount()}
          />
          <TextField
            label="Initial Balance"
            value={newAccountBalance}
            onChange={e => setNewAccountBalance(e.target.value)}
            size="small"
            type="number"
            sx={{ minWidth: 150 }}
            onKeyPress={e => e.key === 'Enter' && handleAddAccount()}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>
            }}
          />
          <Button 
            variant="contained" 
            onClick={handleAddAccount}
            sx={{ height: 40 }}
            size="large"
          >
            Add Account
          </Button>
        </Box>
      </Box>

      {/* Accounts List */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Your Accounts ({accounts.length})
      </Typography>
      
      {accounts.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 6, 
          color: 'text.secondary',
          border: '1px solid #e0e0e0',
          borderRadius: 2,
          bgcolor: '#fafafa'
        }}>
          <Typography variant="h6" gutterBottom>
            No accounts yet
          </Typography>
          <Typography>
            Add your first account above to get started with tracking your budget.
          </Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
          {accounts.map((account, index) => (
            <ListItem 
              key={account.id}
              sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                mb: 2,
                bgcolor: editingId === account.id ? '#f0f7ff' : 'white',
                boxShadow: editingId === account.id ? '0 2px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transform: editingId === account.id ? 'none' : 'translateY(-1px)'
                }
              }}
            >
              {editingId === account.id ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', py: 1 }}>
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
                    sx={{ width: 150 }}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 0.5, color: 'text.secondary' }}>$</Typography>
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleEditSave(account.id)}
                      title="Save changes"
                      sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                    >
                      <SaveIcon />
                    </IconButton>
                    <IconButton 
                      onClick={handleEditCancel}
                      title="Cancel editing"
                      sx={{ bgcolor: 'grey.300', '&:hover': { bgcolor: 'grey.400' } }}
                    >
                      <CancelIcon />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                        {account.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body1" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: '1.1rem' }}>
                        Balance: ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      onClick={() => handleEditStart(account)}
                      title="Edit account"
                      sx={{ 
                        bgcolor: 'primary.50', 
                        color: 'primary.main',
                        '&:hover': { bgcolor: 'primary.100' }
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteClick(account)}
                      title="Delete account"
                      sx={{ 
                        bgcolor: 'error.50', 
                        color: 'error.main',
                        '&:hover': { bgcolor: 'error.100' }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </>
              )}
            </ListItem>
          ))}
        </List>
      )}

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
