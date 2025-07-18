import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Stack,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Box 
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { ParkingCard } from '../types/ParkingCard';

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


const SOAP_ENDPOINT = 'https://int1aa.azurewebsites.net/integrations/monthly.asmx';
const SOAP_ACTION = 'http://kleverlogic.com/webservices/GetAllMonthlies';

function buildSoapBody({ securityToken, locationId, includeValid, includeInvalid, includeDeleted }) {
return `
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetAllMonthlies xmlns="http://kleverlogic.com/webservices/">
        <securityToken>${securityToken}</securityToken>
        <locationId>${locationId}</locationId>
        <includeValid>${includeValid}</includeValid>
        <includeInvalid>${includeInvalid}</includeInvalid>
        <includeDeleted>${includeDeleted}</includeDeleted>
        </GetAllMonthlies>
    </soap:Body>
    </soap:Envelope>
`;
}

const CardAudit: React.FC = () => {
    const [formData, setFormData] = useState<ParkingCard>({
        id: '',
        securityToken: 'C2278FFBCB774B26B7D1A1D54DE3A64C',
        locationId: '340108',
        includeValid: 'True',
        includeInvalid: 'False',
        includeDeleted: 'False',
        Date: new Date(),
        ParkerStatus: 'Active',
        CredentialNumber: ''
    });
    const [data, setData] = useState<string | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (field: keyof ParkingCard) => (event: any) => {
        const value = event.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: field === 'Date' ? new Date(value) : value
        }));
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const body = buildSoapBody({
                securityToken: formData.securityToken,
                locationId: formData.locationId,
                includeValid: formData.includeValid === 'True',
                includeInvalid: formData.includeInvalid === 'True',
                includeDeleted: formData.includeDeleted === 'True',
            });

            const response = await fetch(SOAP_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'SOAPAction': SOAP_ACTION,
                },
                body,
            });

            const text = await response.text();
            setData(text);
            
            // Parse XML response and extract data for table
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            
            // Extract data from XML - this would need to be adjusted based on actual response structure
            const monthlies = xmlDoc.getElementsByTagName('Monthly');
            const parsedData = Array.from(monthlies).map((monthly, index) => ({
                id: index + 1,
                credentialNumber: monthly.getAttribute('CredentialNumber') || 'N/A',
                status: monthly.getAttribute('Status') || 'N/A',
                location: monthly.getAttribute('Location') || 'N/A',
                date: monthly.getAttribute('Date') || 'N/A'
            }));
            
            setTableData(parsedData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setData('Error fetching data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch data if required fields are filled
        if (formData.securityToken && formData.locationId) {
            fetchData();
        }
    }, [formData.securityToken, formData.locationId, formData.includeValid, formData.includeInvalid, formData.includeDeleted]);

    const handleFetchData = () => {
        if (formData.securityToken && formData.locationId) {
            fetchData();
        }
    };

    return (
        <ThemeProvider theme={companyTheme}>
            <Box
                sx={{
                    minHeight: '100vh',
                    width: '100vw',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    zIndex: -1,
                    background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
                    overflow: 'hidden',
                }}>
                
                <Card sx={{ maxWidth: 1800, margin: 'auto', mt: 5, p: 3, backgroundColor: '#fff', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom>
                            Parker Card Audit
                        </Typography>
                        
                        {/* Form Section */}
                        <Stack spacing={3} sx={{ mb: 3 }}>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Security Token"
                                    value={formData.securityToken}
                                    onChange={handleInputChange('securityToken')}
                                    variant="outlined"
                                    required
                                />
                            </Stack>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Location ID"
                                    value={formData.locationId}
                                    onChange={handleInputChange('locationId')}
                                    variant="outlined"
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Credential Number"
                                    value={formData.CredentialNumber}
                                    onChange={handleInputChange('CredentialNumber')}
                                    variant="outlined"
                                />
                            </Stack>
                            
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <TextField
                                    fullWidth
                                    type="datetime-local"
                                    label="Date"
                                    value={formData.Date.toISOString().slice(0, 16)}
                                    onChange={handleInputChange('Date')}
                                    variant="outlined"
                                    InputLabelProps={{ shrink: true }}
                                />
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Parker Status</InputLabel>
                                    <Select
                                        value={formData.ParkerStatus}
                                        onChange={handleInputChange('ParkerStatus')}
                                        label="Parker Status"
                                    >
                                        <MenuItem value="Active">Active</MenuItem>
                                        <MenuItem value="Inactive">Inactive</MenuItem>
                                        <MenuItem value="Deleted">Deleted</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                            
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Include Valid</InputLabel>
                                    <Select
                                        value={formData.includeValid}
                                        onChange={handleInputChange('includeValid')}
                                        label="Include Valid"
                                    >
                                        <MenuItem value="True">True</MenuItem>
                                        <MenuItem value="False">False</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Include Invalid</InputLabel>
                                    <Select
                                        value={formData.includeInvalid}
                                        onChange={handleInputChange('includeInvalid')}
                                        label="Include Invalid"
                                    >
                                        <MenuItem value="True">True</MenuItem>
                                        <MenuItem value="False">False</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth variant="outlined">
                                    <InputLabel>Include Deleted</InputLabel>
                                    <Select
                                        value={formData.includeDeleted}
                                        onChange={handleInputChange('includeDeleted')}
                                        label="Include Deleted"
                                    >
                                        <MenuItem value="True">True</MenuItem>
                                        <MenuItem value="False">False</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                            
                            <Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleFetchData}
                                    disabled={loading || !formData.securityToken || !formData.locationId}
                                    sx={{ mr: 2 }}
                                >
                                    {loading ? 'Loading...' : 'Fetch Data'}
                                </Button>
                            </Box>
                        </Stack>

                        {/* Table Section */}
                        {tableData.length > 0 && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    Audit Results
                                </Typography>
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>ID</TableCell>
                                                <TableCell>Credential Number</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Location</TableCell>
                                                <TableCell>Date</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {tableData.map((row) => (
                                                <TableRow key={row.id}>
                                                    <TableCell>{row.id}</TableCell>
                                                    <TableCell>{row.credentialNumber}</TableCell>
                                                    <TableCell>{row.status}</TableCell>
                                                    <TableCell>{row.location}</TableCell>
                                                    <TableCell>{row.date}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {/* Raw Data Section (for debugging) */}
                        {data && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    Raw Response (Debug)
                                </Typography>
                                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                                        {data}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </ThemeProvider>
    );
};


export default CardAudit;
