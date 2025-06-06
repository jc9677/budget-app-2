
import * as React from 'react';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TableChartIcon from '@mui/icons-material/TableChart';
import SettingsIcon from '@mui/icons-material/Settings';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';


const AccountsView = React.lazy(() => import('./components/AccountsView.jsx'));
const TransactionsView = React.lazy(() => import('./components/TransactionsView.jsx'));
const ForecastTable = React.lazy(() => import('./components/ForecastTable.jsx'));
const SettingsView = React.lazy(() => import('./components/SettingsView.jsx'));
const OccurrencesView = React.lazy(() => import('./components/OccurrencesView.jsx'));

const drawerWidth = 220;

const navItems = [
  { text: 'Accounts', icon: <AccountBalanceIcon /> },
  { text: 'Transactions', icon: <ReceiptLongIcon /> },
  { text: 'Forecast', icon: <TableChartIcon /> },
  { text: 'Settings', icon: <SettingsIcon /> },
];

function App() {
  const [selected, setSelected] = React.useState('Forecast');

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Budget Tracker
          </Typography>
        </Toolbar>
        <List>
          {navItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={selected === item.text}
                onClick={() => setSelected(item.text)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Toolbar />
        {/* Main content area */}
        <React.Suspense fallback={<div>Loading...</div>}>
          {selected === 'Forecast' && (
            <>
              <Typography variant="h4" gutterBottom>
                Account Balance Forecast
              </Typography>
              <ForecastTable />
            </>
          )}
          {selected === 'Transactions' && <TransactionsView />}
          {selected === 'Accounts' && <AccountsView />}
          {selected === 'Settings' && <SettingsView />}
        </React.Suspense>
      </Box>
    </Box>
  );
}

export default App;

// Wrapper to provide accounts and transactions to OccurrencesView
function OccurrencesViewWrapper() {
  const [accounts, setAccounts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const refresh = React.useCallback(() => {
    import('./db/indexedDb').then(db => {
      db.getAllAccounts().then(setAccounts);
      db.getAllTransactions().then(setTransactions);
    });
  }, []);
  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line
  }, [refresh]);
  return <OccurrencesView accounts={accounts} transactions={transactions} onOccurrenceEdit={refresh} />;
}
