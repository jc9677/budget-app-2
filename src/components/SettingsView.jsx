import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function SettingsView() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body1" gutterBottom>
        (Settings options will go here)
      </Typography>
      <Button variant="outlined" disabled>
        Example Setting
      </Button>
    </Box>
  );
}
