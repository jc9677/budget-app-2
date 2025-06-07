import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { getAllAccounts, getAllTransactions, addAccount, addTransaction, deleteAllData } from '../db/indexedDb';

export default function SettingsView() {
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });
  const [isLoading, setIsLoading] = React.useState(false);

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const [accounts, transactions] = await Promise.all([
        getAllAccounts(),
        getAllTransactions()
      ]);

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        accounts,
        transactions
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `budget-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export data: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate the import data structure
      if (!importData.accounts || !importData.transactions || !importData.version) {
        throw new Error('Invalid backup file format');
      }

      // Confirm with user before clearing existing data
      const confirmed = window.confirm(
        'This will replace ALL existing data with the imported data. Are you sure you want to continue?'
      );
      
      if (!confirmed) {
        setIsLoading(false);
        return;
      }

      // Clear existing data
      await deleteAllData();

      // Import accounts and build ID mapping
      const accountIdMapping = {};
      for (const account of importData.accounts) {
        const { id: oldId, ...accountData } = account;
        const newId = await addAccount(accountData);
        accountIdMapping[oldId] = newId;
      }

      // Import transactions with updated account IDs
      for (const transaction of importData.transactions) {
        const { id, accountId, ...transactionData } = transaction;
        const newAccountId = accountIdMapping[accountId];
        if (newAccountId) {
          await addTransaction({ ...transactionData, accountId: newAccountId });
        } else {
          console.warn(`Skipping transaction with invalid accountId: ${accountId}`);
        }
      }

      showMessage(`Successfully imported ${importData.accounts.length} accounts and ${importData.transactions.length} transactions!`);
      
      // Refresh the page to reload all data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      showMessage('Failed to import data: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Settings
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Backup & Restore
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Export your data to create a backup file, or import a previously exported backup to restore your data.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            onClick={handleExportData}
            disabled={isLoading}
          >
            Export Data
          </Button>
          
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            disabled={isLoading}
          >
            Import Data
            <input
              type="file"
              accept=".json"
              hidden
              onChange={handleImportData}
            />
          </Button>
        </Box>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Important:</strong> Importing data will replace all existing accounts and transactions. 
          Make sure to export your current data first if you want to keep it.
        </Alert>
      </Paper>

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
