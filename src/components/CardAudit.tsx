import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const companyTheme = createTheme({
  palette: {
    primary: { main: '#007dba', contrastText: '#fff' }, // Company blue
    secondary: { main: '#B20838', contrastText: '#fff' }, // Company red
    warning: { main: '#ffb300', contrastText: '#000' },   // Accent yellow
    background: { default: '#f5f7fa', paper: '#fff' },
    text: { primary: '#222', secondary: '#007dba' },
  },
  typography: {
    fontFamily: 'Segoe UI, Arial, sans-serif',
    h4: { color: '#007dba', fontWeight: 700 },
    h6: { color: '#b00135', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { 
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});

const CardAudit: React.FC = () => {
    return (
        <ThemeProvider theme={companyTheme}>
            <Card>
                <CardContent>
                    <Typography variant="h4">Audit Report</Typography>
                    <Typography variant="body1">Details of the audit...</Typography>
                </CardContent>
            </Card>
        </ThemeProvider>
    );
};

export default CardAudit;
