import * as React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

// Helper to generate chart data from forecast rows
function getChartData(rows, accounts) {
  if (!rows.length) return [];
  
  // Get all unique dates and sort them
  const allDates = [...new Set(rows.map(row => row.date))].sort();
  
  // Initialize starting balances for each account
  const accountBalances = {};
  accounts.forEach(acc => {
    accountBalances[acc.id] = acc.balance || 0;
  });
  
  // Process each date in chronological order
  const chartData = [];
  
  allDates.forEach(date => {
    const dataPoint = { date };
    
    // Get all transactions for this date, sorted by account
    const transactionsForDate = rows.filter(row => row.date === date);
    
    // Update balances based on transactions for this date
    transactionsForDate.forEach(row => {
      // The row.balance already contains the running balance calculated in ForecastTable
      accountBalances[row.accountId] = row.balance;
    });
    
    // Add current balance for each account to this data point
    accounts.forEach(acc => {
      dataPoint[acc.name] = accountBalances[acc.id];
    });
    
    chartData.push(dataPoint);
  });
  
  return chartData;
}

const COLORS = [
  '#1976d2', '#d32f2f', '#388e3c', '#fbc02d', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#303f9f'
];

export default function ForecastLineChart({ rows, accounts }) {
  const data = React.useMemo(() => getChartData(rows, accounts), [rows, accounts]);
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Account Balances Over Time
      </Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {accounts.map((acc, idx) => (
            <Line
              key={acc.id}
              type="monotone"
              dataKey={acc.name}
              stroke={COLORS[idx % COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
