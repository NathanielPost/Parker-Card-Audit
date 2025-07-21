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
  Box, 
  Grid,
  Divider,
  LinearProgress,
  Chip
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { 
  ParkingCard, 
  MonthlyAccountLite, 
  MonthlyModel, 
  IntegrationResult,
  MonthlyAccountResult,
  MonthlyVehicleResult,
  MonthlyContactResult,
  CarProfile,
  ContactProfile,
  LocationProfile,
  MonthlyProfilesResult
} from '../types/ParkingCard';

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


// Environment-aware SOAP endpoint configuration
const getSOAPEndpoint = () => {
    // In development, use the proxy
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '/api/integrations/monthly.asmx';
    }
    // In production (Render), use the direct URL
    return 'https://int1aa.azurewebsites.net/integrations/monthly.asmx';
};

const SOAP_ENDPOINT = getSOAPEndpoint();
// Additional SOAP endpoints for detailed account data
const SOAP_MONTHLY_ACCOUNT_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyAccount';
const SOAP_MONTHLY_VEHICLE_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyVehicle';
const SOAP_MONTHLY_CONTACT_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyContact';
const SOAP_MONTHLY_PROFILES_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyProfiles';

// Helper function to make SOAP requests
async function makeSoapRequest(endpoint: string, soapAction: string, body: string, soapVersion: '1.1' | '1.2') {
    const headers: Record<string, string> = soapVersion === '1.1' 
        ? {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': soapAction,
        }
        : {
            'Content-Type': 'application/soap+xml; charset=utf-8',
        };

    console.log('🌐 Making SOAP request to:', endpoint);
    console.log('📋 SOAP Action:', soapAction);
    console.log('🔧 Headers:', headers);
    console.log('📦 Body preview:', body.substring(0, 200) + '...');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            mode: 'cors', // Explicitly set CORS mode
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
        }

        const responseText = await response.text();
        console.log('✅ Response received, length:', responseText.length);
        return responseText;
    } catch (error) {
        console.error('❌ Network Error:', error);
        
        // Provide specific error messages for common issues
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error('🚫 Network Error: Cannot connect to SOAP endpoint. This might be due to CORS policy or network connectivity issues in production.');
        }
        
        throw error;
    }
}

// Function to get all monthly accounts (bulk retrieval)
async function getAllMonthlies(securityToken: string, locationId: string, formData: ParkingCard, soapVersion: '1.1' | '1.2'): Promise<MonthlyAccountLite[]> {
    try {
        const soapBody = soapVersion === '1.1' 
            ? `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetAllMonthlies xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationId>${locationId}</locationId>
            <includeValid>${formData.includeValid === 'True'}</includeValid>
            <includeInvalid>${formData.includeInvalid === 'True'}</includeInvalid>
            <includeDeleted>${formData.includeDeleted === 'True'}</includeDeleted>
        </GetAllMonthlies>
    </soap:Body>
</soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <GetAllMonthlies xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationId>${locationId}</locationId>
            <includeValid>${formData.includeValid === 'True'}</includeValid>
            <includeInvalid>${formData.includeInvalid === 'True'}</includeInvalid>
            <includeDeleted>${formData.includeDeleted === 'True'}</includeDeleted>
        </GetAllMonthlies>
    </soap12:Body>
</soap12:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, 'http://kleverlogic.com/webservices/GetAllMonthlies', soapBody, soapVersion);
        
        // Parse the response and extract accounts
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Look for MonthlyAccountLite elements
        const accounts = xmlDoc.getElementsByTagName('MonthlyAccountLite');
        
        const parsedAccounts: MonthlyAccountLite[] = Array.from(accounts).map((account) => {
            const getElementText = (tagName: string) => {
                const element = account.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };
            
            return {
                AccountNumber: getElementText('AccountNumber'),
                FlashAccountNumber: getElementText('FlashAccountNumber'),
                Status: getElementText('Status'),
                IsDeleted: getElementText('Deleted').toLowerCase() === 'true',
                Deleted: getElementText('Deleted'),
                MonthlyAccountType: getElementText('MonthlyAccountType'),
            };
        });
        
        return parsedAccounts;
    } catch (error) {
        console.error('Error getting all monthly accounts:', error);
        return [];
    }
}

// Function to get monthly account information
async function getMonthlyAccount(securityToken: string, locationId: string, flashAccountNumber: string, soapVersion: '1.1' | '1.2'): Promise<MonthlyAccountResult | null> {
    try {
        const soapBody = soapVersion === '1.1' 
            ? `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetMonthlyAccount xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationId>${locationId}</locationId>
            <flashAccountNumber>${flashAccountNumber}</flashAccountNumber>
        </GetMonthlyAccount>
    </soap:Body>
</soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <GetMonthlyAccount xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationId>${locationId}</locationId>
            <flashAccountNumber>${flashAccountNumber}</flashAccountNumber>
        </GetMonthlyAccount>
    </soap12:Body>
</soap12:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_ACCOUNT_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract account details
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Extract account information (adapt based on actual API response structure)
        const accountElement = xmlDoc.getElementsByTagName('MonthlyAccount')[0];
        if (accountElement) {
            const getElementText = (tagName: string) => {
                const element = accountElement.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };

            // Extract cars/vehicles from the account
            const carsElements = accountElement.getElementsByTagName('Car') || accountElement.getElementsByTagName('Vehicle');
            const cars: CarProfile[] = Array.from(carsElements).map((carElement, index) => {
                const getCarElementText = (tagName: string) => {
                    const element = carElement.getElementsByTagName(tagName)[0];
                    return element ? element.textContent || '' : '';
                };
                
                return {
                    VehicleGuid: getCarElementText('VehicleGuid') || getCarElementText('vehicleId') || `vehicle_${index}`,
                    LicensePlate: getCarElementText('LicensePlate') || getCarElementText('vehicleLicenseNumber'),
                    Make: getCarElementText('Make') || getCarElementText('vehicleMake'),
                    Model: getCarElementText('Model') || getCarElementText('vehicleModel'),
                    Color: getCarElementText('Color') || getCarElementText('vehicleColor'),
                };
            });

            // Extract contacts from the account
            const contactsElements = accountElement.getElementsByTagName('Contact');
            const contacts: ContactProfile[] = Array.from(contactsElements).map((contactElement, index) => {
                const getContactElementText = (tagName: string) => {
                    const element = contactElement.getElementsByTagName(tagName)[0];
                    return element ? element.textContent || '' : '';
                };
                
                return {
                    ContactGuid: getContactElementText('ContactGuid') || getContactElementText('contactId') || `contact_${index}`,
                    FirstName: getContactElementText('FirstName'),
                    LastName: getContactElementText('LastName'),
                    Email: getContactElementText('Email'),
                    Phone: getContactElementText('Phone'),
                };
            });

            return {
                AccountNumber: getElementText('AccountNumber'),
                FlashAccountNumber: flashAccountNumber,
                Cars: cars,
                Contacts: contacts,
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error getting monthly account for ${flashAccountNumber}:`, error);
        return null;
    }
}

// Function to get monthly vehicle information
async function getMonthlyVehicle(securityToken: string, locationId: string, vehicleId: string, accountNumber: string, soapVersion: '1.1' | '1.2'): Promise<MonthlyVehicleResult | null> {
    try {
        const soapBody = soapVersion === '1.1' 
            ? `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetMonthlyVehicle xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationID>${locationId}</locationID>
            <vehicleId>${vehicleId}</vehicleId>
            <accountNumber>${accountNumber}</accountNumber>
        </GetMonthlyVehicle>
    </soap:Body>
</soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <GetMonthlyVehicle xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationID>${locationId}</locationID>
            <vehicleId>${vehicleId}</vehicleId>
            <accountNumber>${accountNumber}</accountNumber>
        </GetMonthlyVehicle>
    </soap12:Body>
</soap12:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_VEHICLE_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract vehicle details
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Extract vehicle information (adapt based on actual API response structure)
        const vehicleElement = xmlDoc.getElementsByTagName('MonthlyVehicle')[0] || xmlDoc.getElementsByTagName('Vehicle')[0];
        if (vehicleElement) {
            const getElementText = (tagName: string) => {
                const element = vehicleElement.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };

            return {
                VehicleGuid: vehicleId,
                AccountNumber: accountNumber,
                FlashAccountNumber: accountNumber, // Assuming they're the same for now
                LicensePlate: getElementText('vehicleLicenseNumber') || getElementText('LicensePlate'),
                Make: getElementText('vehicleMake') || getElementText('Make'),
                Model: getElementText('vehicleModel') || getElementText('Model'),
                Color: getElementText('vehicleColor') || getElementText('Color'),
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error getting monthly vehicle for ${vehicleId}:`, error);
        return null;
    }
}

// Function to get monthly contact information
async function getMonthlyContact(securityToken: string, locationId: string, contactId: string, accountNumber: string, soapVersion: '1.1' | '1.2'): Promise<MonthlyContactResult | null> {
    try {
        const soapBody = soapVersion === '1.1' 
            ? `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetMonthlyContact xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationID>${locationId}</locationID>
            <contactId>${contactId}</contactId>
            <accountNumber>${accountNumber}</accountNumber>
        </GetMonthlyContact>
    </soap:Body>
</soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <GetMonthlyContact xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationID>${locationId}</locationID>
            <contactId>${contactId}</contactId>
            <accountNumber>${accountNumber}</accountNumber>
        </GetMonthlyContact>
    </soap12:Body>
</soap12:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_CONTACT_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract contact details
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Extract contact information (adapt based on actual API response structure)
        const contactElement = xmlDoc.getElementsByTagName('MonthlyContact')[0] || xmlDoc.getElementsByTagName('Contact')[0];
        if (contactElement) {
            const getElementText = (tagName: string) => {
                const element = contactElement.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };

            return {
                ContactGuid: contactId,
                AccountNumber: accountNumber,
                FlashAccountNumber: accountNumber, // Assuming they're the same for now
                FirstName: getElementText('FirstName'),
                LastName: getElementText('LastName'),
                Email: getElementText('Email'),
                Phone: getElementText('Phone'),
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error getting monthly contact for ${contactId}:`, error);
        return null;
    }
}

// Function to get monthly profiles
async function getMonthlyProfiles(securityToken: string, locationId: string, soapVersion: '1.1' | '1.2'): Promise<MonthlyProfilesResult | null> {
    try {
        const soapBody = soapVersion === '1.1' 
            ? `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetMonthlyProfiles xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationId>${locationId}</locationId>
        </GetMonthlyProfiles>
    </soap:Body>
</soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
        <GetMonthlyProfiles xmlns="http://kleverlogic.com/webservices/">
            <securityToken>${securityToken}</securityToken>
            <locationId>${locationId}</locationId>
        </GetMonthlyProfiles>
    </soap12:Body>
</soap12:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_PROFILES_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract profiles
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Extract profiles information
        const resultElement = xmlDoc.getElementsByTagName('GetMonthlyProfilesResult')[0];
        if (resultElement) {
            const getElementText = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };

            // Extract location profiles
            const profileElements = resultElement.getElementsByTagName('LocationProfile');
            const locationProfiles: LocationProfile[] = Array.from(profileElements).map((profileElement) => {
                const getProfileElementText = (tagName: string) => {
                    const element = profileElement.getElementsByTagName(tagName)[0];
                    return element ? element.textContent || '' : '';
                };
                
                return {
                    UniqueID: getProfileElementText('UniqueID'),
                    Name: getProfileElementText('Name'),
                };
            });

            return {
                Code: getElementText('Code'),
                Message: getElementText('Message'),
                LocationProfiles: locationProfiles,
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error getting monthly profiles:`, error);
        return null;
    }
}

// Parallel processing function to get integration monthly records
async function getIntegrationMonthlyRecords(
    accounts: MonthlyAccountLite[], 
    securityToken: string, 
    locationId: string, 
    soapVersion: '1.1' | '1.2',
    onProgress?: (current: number, total: number) => void
): Promise<IntegrationResult> {
    const startTime = Date.now();
    const monthlies: MonthlyModel[] = [];
    const errorAccounts: MonthlyModel[] = [];
    
    // Sort accounts by FlashAccountNumber (similar to C# OrderBy)
    const sortedAccounts = [...accounts].sort((a, b) => 
        a.FlashAccountNumber.localeCompare(b.FlashAccountNumber)
    );
    
    const total = sortedAccounts.length;
    let processed = 0;
    
    try {
        // Process accounts in parallel (similar to Parallel.ForEachAsync)
        const MAX_PARALLEL = 5; // Similar to MaxDegreeOfParallelism
        const chunks: MonthlyAccountLite[][] = [];
        
        for (let i = 0; i < sortedAccounts.length; i += MAX_PARALLEL) {
            chunks.push(sortedAccounts.slice(i, i + MAX_PARALLEL));
        }
        
        for (const chunk of chunks) {
            const promises = chunk.map(async (account) => {
                try {
                    const monthly: MonthlyModel = {
                        AccountNumber: account.AccountNumber,
                        FlashAccountNumber: account.FlashAccountNumber,
                        IsDeleted: account.IsDeleted,
                        Status: account.Status
                    };
                    
                    // Only process Valid accounts (similar to C# STATUS__VALID check)
                    if (account.Status.toUpperCase() === 'VALID') {
                        // Get detailed account information
                        const monthlyAccount = await getMonthlyAccount(
                            securityToken, 
                            locationId, 
                            account.FlashAccountNumber, 
                            soapVersion
                        );
                        
                        if (monthlyAccount) {
                            monthly.Account = monthlyAccount;
                            
                            // Process vehicles if account has cars
                            const monthlyVehicles: MonthlyVehicleResult[] = [];
                            if (monthly.Account?.Cars?.length) {
                                for (const car of monthly.Account.Cars) {
                                    const vehicle = await getMonthlyVehicle(
                                        securityToken,
                                        locationId,
                                        car.VehicleGuid,
                                        account.AccountNumber,
                                        soapVersion
                                    );
                                    if (vehicle) {
                                        monthlyVehicles.push(vehicle);
                                    }
                                }
                            }
                            monthly.Vehicles = monthlyVehicles;

                            // Process contacts if account has contacts
                            const monthlyContacts: MonthlyContactResult[] = [];
                            if (monthly.Account?.Contacts?.length) {
                                for (const contact of monthly.Account.Contacts) {
                                    const contactResult = await getMonthlyContact(
                                        securityToken,
                                        locationId,
                                        contact.ContactGuid,
                                        account.AccountNumber,
                                        soapVersion
                                    );
                                    if (contactResult) {
                                        monthlyContacts.push(contactResult);
                                    }
                                }
                            }
                            monthly.Contacts = monthlyContacts;
                        }
                        
                        monthlies.push(monthly);
                    } else {
                        errorAccounts.push(monthly);
                    }
                    
                    processed++;
                    onProgress?.(processed, total);
                    
                } catch (error) {
                    console.error(`Exception for account: ${account.AccountNumber}`, error);
                    errorAccounts.push({
                        AccountNumber: account.AccountNumber,
                        FlashAccountNumber: account.FlashAccountNumber,
                        IsDeleted: account.IsDeleted,
                        Status: account.Status
                    });
                    processed++;
                    onProgress?.(processed, total);
                }
            });
            
            await Promise.all(promises);
        }
        
    } catch (error) {
        console.error('Error in getIntegrationMonthlyRecords:', error);
    }
    
    const endTime = Date.now();
    
    return {
        Monthlies: monthlies,
        ErrorAccounts: errorAccounts,
        ProcessingStats: {
            TotalAccounts: total,
            SuccessfulAccounts: monthlies.length,
            ErrorAccounts: errorAccounts.length,
            ProcessingTimeMs: endTime - startTime
        }
    };
}

const CardAudit: React.FC = () => {
    const [soapVersion, setSoapVersion] = useState<'1.1' | '1.2'>('1.1');
    const [parcsType, setParcsType] = useState<string>('FLASH');
    const [selectedParc, setSelectedParc] = useState<string>('');
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
    
    // Integration processing state
    const [integrationResult, setIntegrationResult] = useState<IntegrationResult | null>(null);
    const [isProcessingIntegration, setIsProcessingIntegration] = useState(false);
    const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
    const [rawAccounts, setRawAccounts] = useState<MonthlyAccountLite[]>([]);

    // API method selection state
    const [apiMethod, setApiMethod] = useState<'GetAllMonthlies' | 'GetMonthlyAccount' | 'GetMonthlyProfiles'>('GetAllMonthlies');
    const [integrationOptions, setIntegrationOptions] = useState({
        fetchVehicles: true,
        fetchContacts: true,
        fetchProfiles: false
    });
    const [singleAccountNumber, setSingleAccountNumber] = useState<string>('');
    const [profilesResult, setProfilesResult] = useState<MonthlyProfilesResult | null>(null);

    // Location options for each PARCs type
    const parcsOptions = {
        FLASH: [
            { value: '340108', label: 'Flash field 1' }
        ],
        TIBA: [
            { value: '450201', label: 'TIBA field 1' }
        ],
        Parkonect: [
            { value: '560301', label: 'Parkonect field 1' }
        ],
        DataPark: [
            { value: '670401', label: 'DataPark field 1' }
        ],
        Passport: [
            { value: '780501', label: 'Passport field 1' }
        ]
    };

    const handleInputChange = (field: keyof ParkingCard) => (event: any) => {
        const value = event.target.value;
        setFormData(prev => ({
            ...prev,
            [field]: field === 'Date' ? new Date(value) : value
        }));
    };

    const handleParcsTypeChange = (event: any) => {
        const newParcsType = event.target.value;
        setParcsType(newParcsType);
        setSelectedParc(''); // Reset selected location when type changes
        
        // Automatically set SOAP version based on PARCs type
        const newSoapVersion = newParcsType === 'FLASH' ? '1.1' : '1.2';
        setSoapVersion(newSoapVersion);
    };

    const handleSelectedParcsChange = (event: any) => {
        const newSelectedParc = event.target.value;
        setSelectedParc(newSelectedParc);
        
        // Update the locationId in formData
        setFormData(prev => ({
            ...prev,
            locationId: newSelectedParc
        }));
    };

    const fetchData = async () => {
        setLoading(true);
        setData(null);
        
        try {
            console.log(`🚀 Starting ${apiMethod} request...`);
            
            switch (apiMethod) {
                case 'GetAllMonthlies': {
                    console.log('📋 Fetching all monthly accounts...', formData);
                    const accounts = await getAllMonthlies(formData.securityToken, formData.locationId, formData, soapVersion);
                    
                    setRawAccounts(accounts);
                    setTableData(accounts.map((account, index) => ({
                        id: index + 1,
                        accountNumber: account.AccountNumber,
                        status: account.Status,
                        flashAccountNumber: account.FlashAccountNumber,
                        deleted: account.Deleted,
                        monthlyAccountType: account.MonthlyAccountType,
                    })));
                    console.log(`✅ Fetched ${accounts.length} accounts successfully`);
                    setIntegrationResult(null);
                    setProfilesResult(null);
                    break;
                }
                
                case 'GetMonthlyAccount': {
                    console.log('🔍 Fetching single monthly account...', { 
                        securityToken: formData.securityToken, 
                        locationId: formData.locationId, 
                        accountNumber: singleAccountNumber 
                    });
                    
                    const result = await getMonthlyAccount(formData.securityToken, formData.locationId, singleAccountNumber, soapVersion);
                    
                    if (result) {
                        // Convert single account to array format for consistency
                        const accountArray: MonthlyAccountLite[] = [{
                            AccountNumber: result.AccountNumber,
                            FlashAccountNumber: result.FlashAccountNumber,
                            Status: 'Active', // Default since MonthlyAccountResult doesn't have Status
                            IsDeleted: false,
                            Deleted: 'false',
                            MonthlyAccountType: 'Monthly', // Default type
                        }];
                        
                        setRawAccounts(accountArray);
                        setTableData(accountArray.map((account, index) => ({
                            id: index + 1,
                            accountNumber: account.AccountNumber,
                            status: account.Status,
                            flashAccountNumber: account.FlashAccountNumber,
                            deleted: account.Deleted,
                            monthlyAccountType: account.MonthlyAccountType,
                        })));
                        console.log(`✅ Fetched 1 account successfully`);
                    } else {
                        setRawAccounts([]);
                        setTableData([]);
                        console.log('⚠️ No account returned');
                    }
                    setIntegrationResult(null);
                    setProfilesResult(null);
                    break;
                }
                
                case 'GetMonthlyProfiles': {
                    console.log('📋 Fetching monthly profiles...', { 
                        securityToken: formData.securityToken, 
                        locationId: formData.locationId 
                    });
                    
                    const profiles = await getMonthlyProfiles(formData.securityToken, formData.locationId, soapVersion);
                    
                    if (profiles) {
                        setProfilesResult(profiles);
                        console.log(`✅ Fetched ${profiles.LocationProfiles.length} profiles successfully`);
                    } else {
                        setProfilesResult(null);
                        console.log('⚠️ No profiles returned');
                    }
                    setRawAccounts([]);
                    setIntegrationResult(null);
                    setTableData([]);
                    break;
                }
                
                default:
                    throw new Error(`Unknown API method: ${apiMethod}`);
            }
            
        } catch (err) {
            console.error(`❌ Error in ${apiMethod}:`, err);
            setData(`Error: ${err instanceof Error ? err.message : `Failed to fetch ${apiMethod} data`}`);
            setRawAccounts([]);
            setIntegrationResult(null);
            setProfilesResult(null);
            setTableData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initialize selectedParc with the first option of the default PARCs type
        if (parcsType && parcsOptions[parcsType] && parcsOptions[parcsType].length > 0 && !selectedParc) {
            const firstOption = parcsOptions[parcsType][0];
            setSelectedParc(firstOption.value);
            setFormData(prev => ({
                ...prev,
                locationId: firstOption.value
            }));
        }
    }, [parcsType, selectedParc]);

    const handleFetchData = () => {
        if (formData.securityToken && formData.locationId) {
            fetchData();
        }
    };

    const handleProcessIntegration = async () => {
        if (rawAccounts.length === 0) {
            alert('Please fetch account data first before processing integration.');
            return;
        }

        setIsProcessingIntegration(true);
        setProcessingProgress({ current: 0, total: rawAccounts.length });
        
        try {
            const result = await getIntegrationMonthlyRecords(
                rawAccounts,
                formData.securityToken,
                formData.locationId,
                soapVersion,
                (current, total) => {
                    setProcessingProgress({ current, total });
                }
            );
            
            setIntegrationResult(result);
            console.log('Integration processing completed:', result);
        } catch (error) {
            console.error('Error processing integration:', error);
            alert('Error processing integration. Please check the console for details.');
        } finally {
            setIsProcessingIntegration(false);
        }
    };

    return (
        <ThemeProvider theme={companyTheme}>
            <Box
                sx={{
                    minHeight: '100vh',
                    width: '100%',
                    background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
                    padding: { xs: 2, md: 3 },
                }}>
                
                <Card sx={{ 
                    maxWidth: '90%', 
                    margin: 'auto', 
                    p: 3, 
                    backgroundColor: '#fff', 
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    m: 4
                }}>
                    <CardContent>
                        <Typography variant="h4" gutterBottom>
                            Parker Card Audit
                        </Typography>
                        
                        {/* Environment Info Panel */}
                        <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#1565c0' }}>
                                🌐 Environment: {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Development' : 'Production'}
                                &nbsp;|&nbsp;
                                📡 SOAP Endpoint: {SOAP_ENDPOINT}
                                &nbsp;|&nbsp;
                                🔧 SOAP Version: {soapVersion}
                            </Typography>
                        </Box>
                        
                        {/* SOAP Version Selection */}
                        <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                            <Grid container spacing={1} px={4} mb={3}>
                                <Grid size={3}>
                                    <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                                        <InputLabel>PARCs Type</InputLabel>
                                        <Select
                                            value={parcsType}
                                            onChange={handleParcsTypeChange}
                                            label="PARCs Type"
                                        >
                                            <MenuItem value="FLASH">FLASH</MenuItem>
                                            <MenuItem value="TIBA">TIBA</MenuItem>
                                            <MenuItem value="Parkonect">Parkonect</MenuItem>
                                            <MenuItem value="DataPark">DataPark</MenuItem>
                                            <MenuItem value="Passport">Passport</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                        SOAP Version: {parcsType === 'FLASH' ? '1.1' : '1.2'}
                                        <br />
                                        {parcsType === 'FLASH' 
                                            ? 'Uses text/xml content type with SOAPAction header'
                                            : 'Uses application/soap+xml content type (no SOAPAction header)'
                                        }
                                    </Typography>
                                </Grid>
                                <Grid size={3}>
                                    <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                                        <InputLabel>PARCs Field</InputLabel>
                                        <Select
                                            value={selectedParc}
                                            onChange={handleSelectedParcsChange}
                                            label="Location"
                                            disabled={!parcsType}
                                        >
                                            {parcsType && parcsOptions[parcsType]?.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                        {selectedParc 
                                            ? `Selected PARCs Field ID: ${selectedParc}`
                                            : 'Please select a PARCs Field'
                                        }
                                    </Typography>
                                </Grid>
                                <Grid size={3}>
                                    <FormControl variant="outlined" sx={{ minWidth: 200 }}>
                                        <InputLabel>API Method</InputLabel>
                                        <Select
                                            value={apiMethod}
                                            onChange={(e) => setApiMethod(e.target.value as 'GetAllMonthlies' | 'GetMonthlyAccount' | 'GetMonthlyProfiles')}
                                            label="API Method"
                                        >
                                            <MenuItem value="GetAllMonthlies">Get All Monthlies</MenuItem>
                                            <MenuItem value="GetMonthlyAccount">Get Monthly Account</MenuItem>
                                            <MenuItem value="GetMonthlyProfiles">Get Monthly Profiles</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                                        {apiMethod === 'GetAllMonthlies' && 'Bulk account retrieval'}
                                        {apiMethod === 'GetMonthlyAccount' && 'Single account lookup'}
                                        {apiMethod === 'GetMonthlyProfiles' && 'Location profiles'}
                                    </Typography>
                                </Grid>
                                <Grid size={3}>
                                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'medium' }}>
                                        Integration Options:
                                    </Typography>
                                    <Stack direction="column" spacing={0.5}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={integrationOptions.fetchVehicles}
                                                onChange={(e) => setIntegrationOptions(prev => ({...prev, fetchVehicles: e.target.checked}))}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Typography variant="caption">Fetch Vehicles</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={integrationOptions.fetchContacts}
                                                onChange={(e) => setIntegrationOptions(prev => ({...prev, fetchContacts: e.target.checked}))}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Typography variant="caption">Fetch Contacts</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={integrationOptions.fetchProfiles}
                                                onChange={(e) => setIntegrationOptions(prev => ({...prev, fetchProfiles: e.target.checked}))}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Typography variant="caption">Fetch Profiles</Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Box>
                        
                        {/* Form Section */}
                        <Stack spacing={3} sx={{ mb: 3, backgroundColor: '#f8f9fa', borderRadius: 2, p: 2  }}>
                            <Box>
                                <Grid container spacing={1} px={4} mb={3}>
                                    <Grid size={3}>
                                        <Typography variant="h6">Request Parameters</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {apiMethod === 'GetAllMonthlies' && 'Bulk account retrieval with filters'}
                                            {apiMethod === 'GetMonthlyAccount' && 'Single account lookup'}
                                            {apiMethod === 'GetMonthlyProfiles' && 'Location profile information'}
                                        </Typography>
                                    </Grid>
                                    <Grid size={9}>
                                        <Stack direction={{ xs: 'column', md: 'row' }} mb={2} spacing={2}>
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
                                            {apiMethod === 'GetMonthlyAccount' && (
                                                <TextField
                                                    fullWidth
                                                    label="Flash Account Number"
                                                    value={singleAccountNumber}
                                                    onChange={(e) => setSingleAccountNumber(e.target.value)}
                                                    variant="outlined"
                                                    required
                                                />
                                            )}
                                            {apiMethod === 'GetAllMonthlies' && (
                                                <TextField
                                                    fullWidth
                                                    label="Credential Number"
                                                    value={formData.CredentialNumber}
                                                    onChange={handleInputChange('CredentialNumber')}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                    </Grid> 
                                </Grid>
                                
                                {apiMethod === 'GetAllMonthlies' && (
                                    <>
                                        <Divider variant="middle" sx={{ borderColor: '#B20838', my: 2 }} />
                                        <Grid container spacing={1} px={3} mb={3}>
                                            <Grid size={3}>
                                                <Typography variant="h6">Request Filters</Typography>
                                            </Grid>
                                            <Grid size={9}>
                                                <Stack direction={{ xs: 'column', md: 'row' }} mb={2} mt={2} spacing={2}>
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
                                            </Grid>
                                        </Grid>
                                    </>
                                )}
                            </Box>

                            
                            
                            <Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleFetchData}
                                    disabled={loading || !formData.securityToken || !formData.locationId || (apiMethod === 'GetMonthlyAccount' && !singleAccountNumber)}
                                    sx={{ mr: 2 }}
                                >
                                    {loading ? 'Loading...' : `Fetch ${apiMethod}`}
                                </Button>
                                
                                {(apiMethod === 'GetAllMonthlies' || apiMethod === 'GetMonthlyAccount') && (
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={handleProcessIntegration}
                                        disabled={isProcessingIntegration || rawAccounts.length === 0}
                                        sx={{ mr: 2 }}
                                    >
                                        {isProcessingIntegration ? 'Processing...' : 'Process Integration'}
                                    </Button>
                                )}
                                
                                {isProcessingIntegration && (
                                    <Box sx={{ mt: 2, width: '100%' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Processing {processingProgress.current} of {processingProgress.total} accounts...
                                        </Typography>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={(processingProgress.current / processingProgress.total) * 100} 
                                            sx={{ mt: 1 }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Stack>

                        {/* Table Section */}
                        {tableData.length > 0 && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    Monthly Account Results ({tableData.length} records)
                                </Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>ID</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Account Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Flash Account Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Status</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Account Type</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Deleted</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {tableData.map((row) => (
                                                <TableRow 
                                                    key={row.id}
                                                    sx={{ 
                                                        '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                                                        '&:hover': { backgroundColor: '#e3f2fd' }
                                                    }}
                                                >
                                                    <TableCell>{row.id}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'medium' }}>{row.accountNumber}</TableCell>
                                                    <TableCell>{row.flashAccountNumber}</TableCell>
                                                    <TableCell>
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                color: row.status === 'Valid' ? 'green' : 
                                                                       row.status === 'Invalid' ? 'red' : 'orange',
                                                                fontWeight: 'medium'
                                                            }}
                                                        >
                                                            {row.status}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{row.monthlyAccountType}</TableCell>
                                                    <TableCell>
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                color: row.deleted === 'false' ? 'green' : 'red',
                                                                fontWeight: 'medium'
                                                            }}
                                                        >
                                                            {row.deleted === 'false' ? 'Active' : 'Deleted'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {/* Location Profiles Results Section */}
                        {profilesResult && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    Location Profiles ({profilesResult.LocationProfiles.length} profiles)
                                </Typography>
                                
                                <TableContainer component={Paper} sx={{ mt: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Unique ID</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>Profile Name</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {profilesResult.LocationProfiles.map((profile, index) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>{profile.UniqueID}</TableCell>
                                                    <TableCell>{profile.Name}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {/* Integration Results Section */}
                        {integrationResult && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    Integration Processing Results
                                </Typography>
                                
                                {/* Processing Stats */}
                                <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Total: ${integrationResult.ProcessingStats.TotalAccounts}`} 
                                                color="default" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Successful: ${integrationResult.ProcessingStats.SuccessfulAccounts}`} 
                                                color="success" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Errors: ${integrationResult.ProcessingStats.ErrorAccounts}`} 
                                                color="error" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Time: ${integrationResult.ProcessingStats.ProcessingTimeMs}ms`} 
                                                color="info" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Successful Accounts Table */}
                                {integrationResult.Monthlies.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Successfully Processed Accounts ({integrationResult.Monthlies.length})
                                        </Typography>
                                        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8' }}>Account Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8' }}>Flash Account</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8' }}>Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8' }}>Has Account Details</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8' }}>Vehicles</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8' }}>Contacts</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {integrationResult.Monthlies.map((monthly, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{monthly.AccountNumber}</TableCell>
                                                            <TableCell>{monthly.FlashAccountNumber}</TableCell>
                                                            <TableCell>
                                                                <Chip 
                                                                    label={monthly.Status} 
                                                                    color="success" 
                                                                    size="small" 
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {monthly.Account ? '✓' : '✗'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {monthly.Vehicles?.length || 0}
                                                            </TableCell>
                                                            <TableCell>
                                                                {monthly.Contacts?.length || 0}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}

                                {/* Error Accounts Table */}
                                {integrationResult.ErrorAccounts.length > 0 && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Error Accounts ({integrationResult.ErrorAccounts.length})
                                        </Typography>
                                        <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fde8e8' }}>Account Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fde8e8' }}>Flash Account</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fde8e8' }}>Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fde8e8' }}>Is Deleted</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {integrationResult.ErrorAccounts.map((monthly, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{monthly.AccountNumber}</TableCell>
                                                            <TableCell>{monthly.FlashAccountNumber}</TableCell>
                                                            <TableCell>
                                                                <Chip 
                                                                    label={monthly.Status} 
                                                                    color="error" 
                                                                    size="small" 
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {monthly.IsDeleted ? 'Yes' : 'No'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}
                            </Box>
                        )}

                        {/* Raw Data Section (for debugging) */}
                        {data && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    {data.startsWith('Error:') ? '🚫 Error Details' : '📋 Raw Response (Debug)'}
                                </Typography>
                                <Paper sx={{ 
                                    p: 2, 
                                    backgroundColor: data.startsWith('Error:') ? '#ffebee' : '#f5f5f5',
                                    border: data.startsWith('Error:') ? '1px solid #f44336' : 'none'
                                }}>
                                    <Typography 
                                        variant="body2" 
                                        component="pre" 
                                        sx={{ 
                                            whiteSpace: 'pre-wrap', 
                                            fontSize: '0.8rem',
                                            color: data.startsWith('Error:') ? '#d32f2f' : 'inherit'
                                        }}
                                    >
                                        {data}
                                    </Typography>
                                    
                                    {data.includes('CORS') && (
                                        <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3e0', borderRadius: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                                                💡 CORS Issue Detected
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 1, color: '#e65100' }}>
                                                This is likely because the SOAP endpoint doesn't allow requests from your domain in production.
                                                In development, this works because of the Vite proxy, but in production you're making direct requests.
                                            </Typography>
                                        </Box>
                                    )}
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
