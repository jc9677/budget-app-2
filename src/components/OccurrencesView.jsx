import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { getAllTransactions, updateTransaction } from '../db/indexedDb';
import { generateAllOccurrences } from '../utils/recurrence';

export default function OccurrencesView({ accounts, transactions, onOccurrenceEdit }) {
  const [occurrences, setOccurrences] = React.useState([]);
  const [editDialog, setEditDialog] = React.useState({ open: false, occ: null });
  const [editForm, setEditForm] = React.useState({ amount: '', date: '', type: '', category: '' });
  const [editScope, setEditScope] = React.useState('single');

  React.useEffect(() => {
    // Show all occurrences for the next 3 months
    const today = new Date();
    const toDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    setOccurrences(generateAllOccurrences(transactions, today, toDate));
  }, [transactions]);

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
      // Update the base transaction for all future occurrences
      const tx = transactions.find(t => t.id === editDialog.occ.baseId);
      if (tx) {
        await updateTransaction({ ...tx, ...editForm });
        if (onOccurrenceEdit) onOccurrenceEdit();
      }
    } else {
      // For single occurrence, in a real app, store an override in a new table (not implemented here)
      alert('Editing a single occurrence is not yet implemented (would require storing overrides).');
    }
    setEditDialog({ open: false, occ: null });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        All Occurrences (Next 3 Months)
      </Typography>
      <List>
        {occurrences.map((occ, idx) => (
          <ListItem key={idx} secondaryAction={
            <IconButton edge="end" onClick={() => handleEditClick(occ)}>
              <EditIcon />
            </IconButton>
          }>
            <ListItemText
              primary={`${occ.date} | $${occ.amount} | ${occ.type} | ${occ.category}`}
              secondary={`Account: ${accounts.find(a => a.id === occ.accountId)?.name || ''}`}
            />
          </ListItem>
        ))}
      </List>
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, occ: null })}>
        <DialogTitle>Edit Occurrence</DialogTitle>
        <DialogContent>
          <TextField
            label="Amount"
            name="amount"
            value={editForm.amount}
            onChange={handleEditChange}
            type="number"
            fullWidth
            margin="dense"
          />
          <TextField
            label="Date"
            name="date"
            value={editForm.date}
            onChange={handleEditChange}
            type="date"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="Type"
            name="type"
            value={editForm.type}
            onChange={handleEditChange}
            fullWidth
            margin="dense"
          >
            <MenuItem value="income">Income</MenuItem>
            <MenuItem value="expense">Expense</MenuItem>
          </TextField>
          <TextField
            label="Category"
            name="category"
            value={editForm.category}
            onChange={handleEditChange}
            fullWidth
            margin="dense"
          />
          <TextField
            select
            label="Apply Change To"
            name="editScope"
            value={editScope}
            onChange={e => setEditScope(e.target.value)}
            fullWidth
            margin="dense"
          >
            <MenuItem value="single">Only this occurrence</MenuItem>
            <MenuItem value="future">This and all future occurrences</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, occ: null })}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
