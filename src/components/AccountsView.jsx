import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { getAllAccounts, addAccount } from '../db/indexedDb';

export default function AccountsView() {
  const [accounts, setAccounts] = React.useState([]);
  const [newAccountName, setNewAccountName] = React.useState('');
  const [newAccountBalance, setNewAccountBalance] = React.useState('');

  React.useEffect(() => {
    getAllAccounts().then(setAccounts);
  }, []);

  const handleAddAccount = async () => {
    if (!newAccountName) return;
    const balance = parseFloat(newAccountBalance) || 0;
    const id = await addAccount({ name: newAccountName, balance });
    setAccounts(await getAllAccounts());
    setNewAccountName('');
    setNewAccountBalance('');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Accounts
      </Typography>
      <List>
        {accounts.map((account) => (
          <ListItem key={account.id}>
            <ListItemText
              primary={account.name}
              secondary={`Balance: $${account.balance.toLocaleString()}`}
            />
          </ListItem>
        ))}
      </List>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField
          label="Account Name"
          value={newAccountName}
          onChange={e => setNewAccountName(e.target.value)}
          size="small"
        />
        <TextField
          label="Initial Balance"
          value={newAccountBalance}
          onChange={e => setNewAccountBalance(e.target.value)}
          size="small"
          type="number"
        />
        <Button variant="contained" onClick={handleAddAccount}>
          Add Account
        </Button>
      </Box>
    </Box>
  );
}
