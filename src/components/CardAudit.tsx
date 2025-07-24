import React from 'react';
import { Card, CardContent, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Grid,Divider,LinearProgress,
  Chip,Alert} from '@mui/material';
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
  MonthlyProfilesResult,
  DatabaseConfig,
  DatabaseContact,
  RFIDComparison,
  databaseService
} from '../types/ParkingCard';
import pLimit from 'p-limit';
const limit = pLimit(9);
// pLimit(5) = 4942
// pLimit(10) = 3201
// pLimit(15) = 3779

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


// SOAP endpoint - always use /api path since we have a proxy server
const SOAP_ENDPOINT = '/api/integrations/monthly.asmx';
// Additional SOAP endpoints for detailed account data
const SOAP_MONTHLY_ACCOUNT_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyAccount1';
const SOAP_MONTHLY_VEHICLE_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyVehicle1';
const SOAP_MONTHLY_CONTACT_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyContact1';
const SOAP_MONTHLY_PROFILES_ACTION = 'http://kleverlogic.com/webservices/GetMonthlyProfiles1';

// deployed backend
// Add this declaration if not already present in your project (e.g., in a global.d.ts file)
declare global {
  interface ImportMeta {
    env: {
      [key: string]: string | undefined;
      VITE_API_BASE?: string;
    };
  }
}

const API_BASE = import.meta.env.VITE_API_BASE || 'https://parkerauditbackend.onrender.com';

// Helper function to make SOAP requests
async function makeSoapRequest(endpoint: string, soapAction: string, body: string, soapVersion: '1.1' | '1.2') {
    const headers: Record<string, string> = soapVersion === '1.1' 
        ? {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': soapAction,
        }
        : {
            'Content-Type': 'text/xml',
        };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            mode: 'cors', // Explicitly set CORS mode
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
        }

        const responseText = await response.text();
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
                            <securityToken xsi:type="xsd:string">${securityToken}</securityToken>
                            <locationId xsi:type="xsd:string">${locationId}</locationId>
                            <includeValid xsi:type="xsd:boolean">${formData.includeValid === 'True'}</includeValid>
                            <includeInvalid xsi:type="xsd:boolean">${formData.includeInvalid === 'True'}</includeInvalid>
                            <includeDeleted xsi:type="xsd:boolean">${formData.includeDeleted === 'True'}</includeDeleted>
                        </GetAllMonthlies>
                    </soap:Body>
                </soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
                <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <GetAllMonthlies xmlns="http://kleverlogic.com/webservices/">
                            <securityToken xsi:type="xsd:string">${securityToken}</securityToken>
                            <locationId xsi:type="xsd:string">${locationId}</locationId>
                            <includeValid xsi:type="xsd:boolean">${formData.includeValid === 'True'}</includeValid>
                            <includeInvalid xsi:type="xsd:boolean">${formData.includeInvalid === 'True'}</includeInvalid>
                            <includeDeleted xsi:type="xsd:boolean">${formData.includeDeleted === 'True'}</includeDeleted>
                        </GetAllMonthlies>
                    </soap12:Body>
                </soap12:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, 'http://kleverlogic.com/webservices/GetAllMonthlies', soapBody, soapVersion);
        // Debug: Log raw SOAP response for GetAllMonthlies
        console.log('🧾 Raw SOAP response for GetAllMonthlies:', response);
        
        // Parse the response and extract accounts
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Check for SOAP faults first
        const faultElements = xmlDoc.getElementsByTagName('soap:Fault');
        if (faultElements.length > 0) {
            const faultString = faultElements[0].getElementsByTagName('faultstring')[0]?.textContent || 'Unknown SOAP fault';
            console.error(`❌ SOAP Fault in GetAllMonthlies: ${faultString}`);
            throw new Error(`SOAP Fault: ${faultString}`);
        }
        
        // Check for GetAllMonthliesResult and any error messages
        const resultElement = xmlDoc.getElementsByTagName('GetAllMonthliesResult')[0];
        if (resultElement) {

            for (let i = 0; i < resultElement.children.length; i++) {
                const child = resultElement.children[i];
                console.log(`  - ${child.tagName}: ${child.textContent || `[${child.children.length} children]`}`);
            }
            
            // Check if there's an error message in the result
            const messageElement = resultElement.getElementsByTagName('Message')[0];
            const codeElement = resultElement.getElementsByTagName('Code')[0];
            
            if (messageElement || codeElement) {
                const message = messageElement?.textContent || '';
                const code = codeElement?.textContent || '';
                console.log(`📋 GetAllMonthlies Result - Code: ${code}, Message: ${message}`);
                
                if (code && code !== 'Success') {
                    console.error(`❌ GetAllMonthlies Error - Code: ${code}, Message: ${message}`);
                    if (code === 'InvalidLogin' || message.toLowerCase().includes('invalid login')) {
                        throw new Error(`Authentication Error: ${message || 'Invalid login credentials'}`);
                    }
                    throw new Error(`API Error: ${code} - ${message}`);
                }
            }
            
            // Look for Accounts container, then MonthlyAccountLite elements within it
            const accountsContainer = resultElement.getElementsByTagName('Accounts')[0];
            let accounts: Element[] = [];
            
            if (accountsContainer) {
                console.log(`📋 Found Accounts container with ${accountsContainer.children.length} child elements`);
                accounts = Array.from(accountsContainer.getElementsByTagName('MonthlyAccountLite'));
            } else {
                // Fallback: look for MonthlyAccountLite elements directly in the result
                console.log(`⚠️ No Accounts container found, looking for MonthlyAccountLite elements directly`);
                accounts = Array.from(resultElement.getElementsByTagName('MonthlyAccountLite'));
            }
            
            console.log(`📋 Found ${accounts.length} MonthlyAccountLite elements`);
            
            const parsedAccounts: MonthlyAccountLite[] = accounts.map((account, index) => {
                const getElementText = (tagName: string) => {
                    const element = account.getElementsByTagName(tagName)[0];
                    const value = element ? element.textContent || '' : '';
                    if (index === 0) { // Log details for first account only to avoid spam
                        console.log(`🏷️ Account ${index + 1} - ${tagName}: "${value}"`);
                    }
                    return value;
                };
                
                const getElementBoolean = (tagName: string) => {
                    const element = account.getElementsByTagName(tagName)[0];
                    const textValue = element ? element.textContent || '' : '';
                    const boolValue = textValue.toLowerCase() === 'true';
                    if (index === 0) { // Log details for first account only
                        console.log(`🏷️ Account ${index + 1} - ${tagName}: ${boolValue} (from "${textValue}")`);
                    }
                    return boolValue;
                };
                
                return {
                    AccountNumber: getElementText('AccountNumber'),
                    FlashAccountNumber: getElementText('FlashAccountNumber'),
                    Status: getElementText('Status'),
                    IsDeleted: getElementBoolean('IsDeleted'), // Use proper boolean parsing
                    Deleted: getElementText('IsDeleted'), // Keep string version for backward compatibility
                    MonthlyAccountType: getElementText('MonthlyAccountType'),
                };
            });
            
            console.log(`✅ Successfully parsed ${parsedAccounts.length} accounts from GetAllMonthlies`);
            return parsedAccounts;
        }
        
        // If no result element found, return empty array
        console.log(`❌ No GetAllMonthliesResult element found in response`);
        return [];
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
                        <GetMonthlyAccount1 xmlns="http://kleverlogic.com/webservices/">
                            <securityToken>${securityToken}</securityToken>
                            <locationID>${locationId}</locationID>
                            <accountNumber>${flashAccountNumber}</accountNumber>
                            <accountNumberType>flash</accountNumberType>
                        </GetMonthlyAccount1>
                    </soap:Body>
                </soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
                <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                    <soap:Header/>
                    <soap:Body>
                        <GetMonthlyAccount1 xmlns="http://kleverlogic.com/webservices/">
                            <securityToken>${securityToken}</securityToken>
                            <locationID>${locationId}</locationID>
                            <accountNumber>${flashAccountNumber}</accountNumber>
                            <accountNumberType>flash</accountNumberType>
                        </GetMonthlyAccount1>
                    </soap:Body>
                </soap:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_ACCOUNT_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract account details
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Check for SOAP faults first
        const faultElements = xmlDoc.getElementsByTagName('soap:Fault');
        if (faultElements.length > 0) {
            const faultString = faultElements[0].getElementsByTagName('faultstring')[0]?.textContent || 'Unknown SOAP fault';
            console.error(`❌ SOAP Fault in GetMonthlyAccount1: ${faultString}`);
            throw new Error(`SOAP Fault: ${faultString}`);
        }
        
        // Extract account information from GetMonthlyAccount1Result
        const resultElement = xmlDoc.getElementsByTagName('GetMonthlyAccount1Result')[0];
        if (resultElement) {
            
            // Check for error codes in the result
            const getElementText = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                const value = element ? element.textContent || '' : '';
                return value;
            };
            
            const code = getElementText('Code');
            const message = getElementText('Message');
            
            // Check if the response indicates an error
            if (code && code !== 'Success') {
                console.error(`❌ GetMonthlyAccount1 Error - Code: ${code}, Message: ${message}`);
                if (code === 'InvalidLogin' || message.toLowerCase().includes('invalid login')) {
                    throw new Error(`Authentication Error: ${message || 'Invalid login credentials'}`);
                }
                throw new Error(`API Error: ${code} - ${message}`);
            }

            const getElementBoolean = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                return element ? element.textContent?.toLowerCase() === 'true' : false;
            };

            const getElementNumber = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                return element ? parseInt(element.textContent || '0', 10) : 0;
            };

            // Extract Cars array - now parsing CarProfile objects
            const carsElement = resultElement.getElementsByTagName('Cars')[0];
            const cars: string[] = [];
            if (carsElement) {
                const carProfileElements = carsElement.getElementsByTagName('CarProfile');
                for (let i = 0; i < carProfileElements.length; i++) {
                    const carProfile = carProfileElements[i];
                    const vehicleGuidElement = carProfile.getElementsByTagName('VehicleGuid')[0];
                    const vehicleGuid = vehicleGuidElement ? vehicleGuidElement.textContent : null;
                    if (vehicleGuid) {
                        cars.push(vehicleGuid);
                    }
                }
                // console.log(`🚗 Parsed ${cars.length} vehicles from CarProfile objects:`, cars);
            }

            // Extract Contacts array - now parsing ContactProfile objects
            const contactsElement = resultElement.getElementsByTagName('Contacts')[0];
            const contacts: string[] = [];
            if (contactsElement) {
                const contactProfileElements = contactsElement.getElementsByTagName('ContactProfile');
                for (let i = 0; i < contactProfileElements.length; i++) {
                    const contactProfile = contactProfileElements[i];
                    const contactGuidElement = contactProfile.getElementsByTagName('ContactGuid')[0];
                    const contactGuid = contactGuidElement ? contactGuidElement.textContent : null;
                    if (contactGuid) {
                        contacts.push(contactGuid);
                    }
                }
                // console.log(`👥 Parsed ${contacts.length} contacts from ContactProfile objects:`, contacts);
            }

            const accountResult = {
                AccountType: getElementText('AccountType'),
                Address: getElementText('Address'),
                Address2: getElementText('Address2'),
                AllowPassback: getElementBoolean('AllowPassback'),
                Cars: cars,
                City: getElementText('City'),
                Code: getElementText('Code'),
                CompanyCode: getElementText('CompanyCode'),
                CompanyName: getElementText('CompanyName'),
                Contacts: contacts,
                Department: getElementText('Department'),
                ExternalId: getElementText('ExternalId'),
                LateFeeOnKiosk: getElementBoolean('LateFeeOnKiosk'),
                LocationID: getElementText('LocationID'),
                MasterAccountNumber: getElementNumber('MasterAccountNumber'),
                MembershipSetting: getElementText('MembershipSetting'),
                Message: getElementText('Message'),
                MonthlyAccountGuid: getElementText('MonthlyAccountGuid'),
                MonthlyAccountNumber: getElementNumber('MonthlyAccountNumber'),
                Parks: getElementNumber('Parks'),
                PoolName: getElementText('PoolName'),
                Profile: getElementText('Profile'),
                ReportGroup: getElementText('ReportGroup'),
                State: getElementText('State'),
                Status: getElementText('Status'),
                ValidUntil: getElementText('ValidUntil'),
                Zipcode: getElementText('Zipcode'),
                // For backward compatibility - ensure we have a proper AccountNumber
                AccountNumber: getElementText('MonthlyAccountNumber') || getElementNumber('MonthlyAccountNumber').toString() || flashAccountNumber,
                FlashAccountNumber: flashAccountNumber
            };

            return accountResult;
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
                        <GetMonthlyVehicle1 xmlns="http://kleverlogic.com/webservices/">
                            <securityToken>${securityToken}</securityToken>
                            <locationID>${locationId}</locationID>
                            <accountNumber>${accountNumber}</accountNumber>
                            <accountNumberType>flash</accountNumberType>
                            <vehicleId>${vehicleId}</vehicleId>
                            <vehicleIdType>FLASH</vehicleIdType>
                        </GetMonthlyVehicle1>
                    </soap:Body>
                </soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
                <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                    <soap:Header/>
                    <soap:Body>
                        <GetMonthlyVehicle1 xmlns="http://kleverlogic.com/webservices/">
                            <securityToken>${securityToken}</securityToken>
                            <locationID>${locationId}</locationID>
                            <accountNumber>${accountNumber}</accountNumber>
                            <accountNumberType>flash</accountNumberType>
                            <vehicleId>${vehicleId}</vehicleId>
                            <vehicleIdType>FLASH</vehicleIdType>
                        </GetMonthlyVehicle1>
                    </soap:Body>
                </soap:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_VEHICLE_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract vehicle details
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Check for SOAP faults first
        const faultElements = xmlDoc.getElementsByTagName('soap:Fault');
        if (faultElements.length > 0) {
            const faultString = faultElements[0].getElementsByTagName('faultstring')[0]?.textContent || 'Unknown SOAP fault';
            console.error(`❌ SOAP Fault in GetMonthlyVehicle1: ${faultString}`);
            throw new Error(`SOAP Fault: ${faultString}`);
        }
        
        // Extract vehicle information from GetMonthlyVehicle1Result
        const resultElement = xmlDoc.getElementsByTagName('GetMonthlyVehicle1Result')[0];
        if (resultElement) {
            // Check for error codes in the result
            const getElementText = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                return element ? element.textContent || '' : '';
            };
            
            const code = getElementText('Code');
            const message = getElementText('Message');
            
            // Check if the response indicates an error
            if (code && code !== 'Success') {
                console.error(`❌ GetMonthlyVehicle1 Error - Code: ${code}, Message: ${message}`);
                if (code === 'InvalidLogin' || message.toLowerCase().includes('invalid login')) {
                    throw new Error(`Authentication Error: ${message || 'Invalid login credentials'}`);
                }
                throw new Error(`API Error: ${code} - ${message}`);
            }

            return {
                AccountNumber: getElementText('AccountNumber'),
                Code: getElementText('Code'),
                KeyBarcode: getElementText('KeyBarcode'),
                KeyHook: getElementText('KeyHook'),
                Message: getElementText('Message'),
                ParkingSpot: getElementText('ParkingSpot'),
                RFIDNumber: getElementText('RFIDNumber'),
                VehicleBarcode: getElementText('VehicleBarcode'),
                VehicleColor: getElementText('VehicleColor'),
                VehicleID: getElementText('VehicleID'),
                VehicleLicenseNumber: getElementText('VehicleLicenseNumber'),
                VehicleLicenseState: getElementText('VehicleLicenseState'),
                VehicleMake: getElementText('VehicleMake'),
                VehicleModel: getElementText('VehicleModel'),
                VehicleNickname: getElementText('VehicleNickname'),
                // For backward compatibility
                VehicleGuid: vehicleId,
                FlashAccountNumber: accountNumber,
                LicensePlate: getElementText('VehicleLicenseNumber'),
                Make: getElementText('VehicleMake'),
                Model: getElementText('VehicleModel'),
                Color: getElementText('VehicleColor')
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
                        <GetMonthlyContact1 xmlns="http://kleverlogic.com/webservices/">
                            <securityToken>${securityToken}</securityToken>
                            <locationID>${locationId}</locationID>
                            <accountNumber>${accountNumber}</accountNumber>
                            <accountNumberType>flash</accountNumberType>
                            <contactID>${contactId}</contactID>
                            <contactIDType>FLASH</contactIDType>
                        </GetMonthlyContact1>
                    </soap:Body>
                </soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
                <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
                    <soap:Header/>
                    <soap:Body>
                        <GetMonthlyContact1 xmlns="http://kleverlogic.com/webservices/">
                            <securityToken>${securityToken}</securityToken>
                            <locationID>${locationId}</locationID>
                            <accountNumber>${accountNumber}</accountNumber>
                            <accountNumberType>flash</accountNumberType>
                            <contactID>${contactId}</contactID>
                            <contactIDType>FLASH</contactIDType>
                        </GetMonthlyContact1>
                    </soap:Body>
                </soap:Envelope>`;

        const response = await makeSoapRequest(SOAP_ENDPOINT, SOAP_MONTHLY_CONTACT_ACTION, soapBody, soapVersion);
        
        // Parse the response and extract contact details
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response, 'text/xml');
        
        // Check for SOAP faults first
        const faultElements = xmlDoc.getElementsByTagName('soap:Fault');
        if (faultElements.length > 0) {
            const faultString = faultElements[0].getElementsByTagName('faultstring')[0]?.textContent || 'Unknown SOAP fault';
            console.error(`❌ SOAP Fault in GetMonthlyContact1: ${faultString}`);
            throw new Error(`SOAP Fault: ${faultString}`);
        }
        
        // Extract contact information from GetMonthlyContact1Result
        const resultElement = xmlDoc.getElementsByTagName('GetMonthlyContact1Result')[0];
        if (resultElement) {
            
            // Check for error codes in the result
            const getElementText = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                const value = element ? element.textContent || '' : '';
                return value;
            };
            
            const getElementBoolean = (tagName: string) => {
                const element = resultElement.getElementsByTagName(tagName)[0];
                const value = element ? element.textContent?.toLowerCase() === 'true' : false;
                return value;
            };
            
            const code = getElementText('Code');
            const message = getElementText('Message');
            
            // Check if the response indicates an error
            if (code && code !== 'Success') {
                console.error(`❌ GetMonthlyContact1 Error - Code: ${code}, Message: ${message}`);
                if (code === 'InvalidLogin' || message.toLowerCase().includes('invalid login')) {
                    throw new Error(`Authentication Error: ${message || 'Invalid login credentials'}`);
                }
                throw new Error(`API Error: ${code} - ${message}`);
            }

            const contactResult = {
                Code: getElementText('Code'),
                Message: getElementText('Message'),
                LocationId: getElementText('LocationId'),
                ContactId: getElementText('ContactId'),
                AccountNumber: getElementText('MonthlyAccountNumber') || accountNumber, // Fallback to passed accountNumber
                PrimaryContact: getElementBoolean('PrimaryContact'),
                FirstName: getElementText('FirstName'),
                LastName: getElementText('LastName'),
                EmailAddress: getElementText('EmailAddress'),
                MobileNumber: getElementText('MobileNumber'),
                CustomerBarcode: getElementText('CustomerBarcode'),
                RFIDNumber: getElementText('RFIDNumber'),
                EmployeeId: getElementText('EmployeeId'),
                // For backward compatibility
                ContactGuid: contactId,
                FlashAccountNumber: accountNumber,
                Email: getElementText('EmailAddress'), // Map to backward compatibility field
                Phone: getElementText('MobileNumber')  // Map to backward compatibility field
            };

            return contactResult;
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
                            <securityToken xsi:type="xsd:string">${securityToken}</securityToken>
                            <locationId xsi:type="xsd:string">${locationId}</locationId>
                        </GetMonthlyProfiles>
                    </soap:Body>
                </soap:Envelope>`
            : `<?xml version="1.0" encoding="utf-8"?>
                <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                    <soap12:Body>
                        <GetMonthlyProfiles xmlns="http://kleverlogic.com/webservices/">
                            <securityToken xsi:type="xsd:string">${securityToken}</securityToken>
                            <locationId xsi:type="xsd:string">${locationId}</locationId>
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
                    
                    // Get detailed account information for ALL accounts (not just valid ones)
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
                            for (const carId of monthly.Account.Cars) {
                                const vehicle = await getMonthlyVehicle(
                                    securityToken,
                                    locationId,
                                    carId,
                                    account.AccountNumber,
                                    soapVersion
                                );
                                if (vehicle) {
                                    monthlyVehicles.push(vehicle);
                                } else {
                                    console.log(`❌ No vehicle data returned for carId: ${carId}`);
                                }
                            }
                        } else {
                            console.log(`⚠️ No cars found for account ${account.FlashAccountNumber}`);
                        }
                        monthly.Vehicles = monthlyVehicles;

                        // Process contacts if account has contacts
                        const monthlyContacts: MonthlyContactResult[] = [];
                        if (monthly.Account?.Contacts?.length) {
                            for (const contactId of monthly.Account.Contacts) {
                                const contactResult = await getMonthlyContact(
                                    securityToken,
                                    locationId,
                                    contactId,
                                    (monthly.Account.MonthlyAccountNumber || account.AccountNumber).toString(),
                                    soapVersion
                                );
                                if (contactResult) {
                                    monthlyContacts.push(contactResult);
                                } else {
                                    console.log(`❌ No contact data returned for contactId: ${contactId}`);
                                }
                            }
                        } else {
                            console.log(`⚠️ No contacts found for account ${account.FlashAccountNumber}`);
                        }
                        monthly.Contacts = monthlyContacts;
                    } else {
                        console.log(`❌ No account details returned for ${account.FlashAccountNumber}`);
                    }
                    
                    // Add to successful monthlies regardless of status
                    monthlies.push(monthly);
                    
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

// Function to deduplicate contacts based on name and account, merging data intelligently
function deduplicateContacts(contacts: MonthlyContactResult[]): MonthlyContactResult[] {
    const contactMap = new Map<string, MonthlyContactResult>();
    
    for (const contact of contacts) {
        // Create a unique key based on First Name, Last Name, and Account Number
        const key = `${contact.FirstName?.trim()}|${contact.LastName?.trim()}|${contact.AccountNumber?.trim()}`.toLowerCase();
        
        const existing = contactMap.get(key);
        if (!existing) {
            // First occurrence of this contact
            contactMap.set(key, { ...contact });
        } else {
            // Merge duplicate contact data intelligently
            const merged: MonthlyContactResult = {
                ...existing,
                // Prefer the primary contact's Contact ID and primary status
                ContactId: existing.PrimaryContact ? existing.ContactId : contact.ContactId,
                PrimaryContact: existing.PrimaryContact || contact.PrimaryContact,
                
                // Merge non-empty values, preferring the primary contact's data
                EmailAddress: existing.PrimaryContact 
                    ? (existing.EmailAddress || contact.EmailAddress)
                    : (contact.EmailAddress || existing.EmailAddress),
                    
                MobileNumber: existing.PrimaryContact 
                    ? (existing.MobileNumber || contact.MobileNumber)
                    : (contact.MobileNumber || existing.MobileNumber),
                    
                EmployeeId: existing.PrimaryContact 
                    ? (existing.EmployeeId || contact.EmployeeId)
                    : (contact.EmployeeId || existing.EmployeeId),
                    
                CustomerBarcode: existing.PrimaryContact 
                    ? (existing.CustomerBarcode || contact.CustomerBarcode)
                    : (contact.CustomerBarcode || existing.CustomerBarcode),
                    
                RFIDNumber: existing.PrimaryContact 
                    ? (existing.RFIDNumber || contact.RFIDNumber)
                    : (contact.RFIDNumber || existing.RFIDNumber)
            };
            
            contactMap.set(key, merged);
            console.log(`🔄 Merged duplicate contact: ${contact.FirstName} ${contact.LastName} (Account: ${contact.AccountNumber})`);
        }
    }
    
    const deduplicatedContacts = Array.from(contactMap.values());
    console.log(`📊 Contact deduplication: ${contacts.length} → ${deduplicatedContacts.length} contacts`);
    
    return deduplicatedContacts;
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
    
    // New state for the three-table system
    const [detailedAccountsData, setDetailedAccountsData] = useState<MonthlyAccountResult[]>([]);
    const [contactsData, setContactsData] = useState<MonthlyContactResult[]>([]);
    
    // Integration processing state
    const [integrationResult, setIntegrationResult] = useState<IntegrationResult | null>(null);
    const [isProcessingIntegration, setIsProcessingIntegration] = useState(false);
    const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
    const [rawAccounts, setRawAccounts] = useState<MonthlyAccountLite[]>([]);

    // API processing state - simplified since we always do the same process
    const [integrationOptions, setIntegrationOptions] = useState({
        fetchVehicles: true,
        fetchContacts: true,
        fetchProfiles: false
    });
    const [profilesResult, setProfilesResult] = useState<MonthlyProfilesResult | null>(null);

    // Foreign key state for linking tables
    const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);
    const [highlightedAccountNumber, setHighlightedAccountNumber] = useState<string | null>(null);

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
            console.log(`🚀 Starting complete account processing...`);
            
            // Step 1: Always start with GetAllMonthlies
            console.log('📋 Step 1: Fetching all monthly accounts...', formData);
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
            console.log(`✅ Step 1 Complete: Fetched ${accounts.length} accounts successfully`);
            
            if (accounts.length > 0) {
                // Step 2: For each account, get detailed account information and contacts
                console.log('📋 Step 2: Fetching detailed account information and contacts...');
                console.time('processAllAccounts and contacts');

                const accountPromises = accounts.map(account => limit(async () => {
                    const accountDetails: MonthlyAccountResult[] = [];
                    const contactDetails: MonthlyContactResult[] = [];
                    try {
                        // Get detailed account information
                        const accountDetails = await getMonthlyAccount(
                            formData.securityToken, 
                            formData.locationId, 
                            account.FlashAccountNumber, 
                            soapVersion
                        );
                        
                        if (accountDetails && (accountDetails.Contacts ?? []).length > 0) {
                            for (const contactId of accountDetails.Contacts ?? []) {
                                const contact = await getMonthlyContact(
                                    formData.securityToken,
                                    formData.locationId,
                                    contactId,
                                    (accountDetails.MonthlyAccountNumber || account.AccountNumber).toString(),
                                    soapVersion
                                );
                                if (contact) {
                                    contactDetails.push(contact);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error processing account ${account.FlashAccountNumber}:`, error);
                    }
                    return { accountDetails, contactDetails };
                }));

                const results = await Promise.all(accountPromises);

                // Flatten and filter results
                const detailedAccounts = results
                    .map(r => r.accountDetails)
                    .filter(Boolean) as MonthlyAccountResult[];

                const allContacts = results
                    .flatMap(r => r.contactDetails)
                    .filter(Boolean) as MonthlyContactResult[];

                // Deduplicate contacts before storing
                const deduplicatedContacts = deduplicateContacts(allContacts);
                
                // Store the results
                setDetailedAccountsData(detailedAccounts);
                setContactsData(deduplicatedContacts);
                console.timeEnd('processAllAccounts and contacts');
                console.log(`✅ Step 2 Complete: Fetched ${detailedAccounts.length} detailed accounts and ${allContacts.length} contacts (${deduplicatedContacts.length} after deduplication)`);
                
                // If comparison is enabled, automatically compare with database
                if (comparisonEnabled && deduplicatedContacts.length > 0) {
                    console.log('🔄 Auto-comparing RFID data with database...');
                    try {
                        const accountNumbers = [...new Set(deduplicatedContacts.map(contact => contact.AccountNumber).filter(Boolean))] as string[];
                        const dbContacts = await databaseService.getContactsFromDatabase(accountNumbers);
                        setDatabaseContacts(dbContacts);

                        const comparisons = await databaseService.getRFIDComparison(deduplicatedContacts, dbContacts);
                        setRfidComparisons(comparisons);
                    } catch (error) {
                        console.error('Error in auto-comparison:', error);
                    }
                }
            }
            
            setIntegrationResult(null);
            setProfilesResult(null);
            
        } catch (err) {
            console.error(`❌ Error in account processing:`, err);
            setData(`Error: ${err instanceof Error ? err.message : `Failed to process account data`}`);
            setRawAccounts([]);
            setDetailedAccountsData([]);
            setContactsData([]);
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
            // Debug: Log all account data to inspect AccountNumber issue
            if (result && result.Monthlies) {
                console.log('🔎 All processed account data:', JSON.stringify(result.Monthlies, null, 2));
            }
        } catch (error) {
            console.error('Error processing integration:', error);
            alert('Error processing integration. Please check the console for details.');
        } finally {
            setIsProcessingIntegration(false);
        }
    };

    const DATABASE_CONFIG: DatabaseConfig = {
        server: 'lazdatawarehouse01.lazparking.com',
        database: 'Subscription',
        username: 'subscription_writer',
        password: 'ar[xN7GOq891+krl1',
        encrypt: false,
        multipleActiveResultSets: true
    };

    const [databaseContacts, setDatabaseContacts] = useState<DatabaseContact[]>([]);
    const [rfidComparisons, setRfidComparisons] = useState<RFIDComparison[]>([]);
    const [isComparingRFIDs, setIsComparingRFIDs] = useState(false);
    const [comparisonEnabled, setComparisonEnabled] = useState(false);
    const [accessIds, setAccessIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchDatabaseSchema = async () => {
            try {
                console.log('🔍 Fetching database schema on page load...');
                const response = await fetch(`${API_BASE}/api/database/schema`);
                if (response.ok) {
                    const schema = await response.json();
                    console.log('✅ Database schema loaded:', schema);
                } else {
                    console.error('❌ Failed to fetch database schema RESPONSE:', response.statusText);
                }
            } catch (error) {
                console.error('❌ Error fetching database schema:', error);
            }
        };

        fetchDatabaseSchema();
        const checkBackend = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/health`);
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Connected to backend:', data);
                } else {
                    console.error('❌ Backend health check failed:', response.status, response.statusText);
                }
            } catch (error) {
                console.error('❌ Error connecting to backend:', error);
            }
        };
        checkBackend();
    }, []);

    const handlePullAccessId = async (): Promise<string[]> => {
        if (formData.locationId) {
            try {
                console.log(`🔍 Fetching Access IDs for locationId: ${formData.locationId}`);
                const response = await fetch(`/api/database/accessIds_for_location?locationCode=${formData.locationId}`);
                if (response.ok) {
                    const data = await response.json();
                    const accessIdsArray = data.data || data.accessIds || data || [];
                    setAccessIds(accessIdsArray);
                    console.log('✅ Access IDs fetched and set:', accessIdsArray);
                    return accessIdsArray; // Return the actual dataF
                } else {
                    console.error('❌ Error fetching Access IDs:', response.statusText);
                    return [];
                }
            } catch (error) {
                console.error('❌ Error fetching Access IDs:', error);
                return [];
            }
        } else {
            console.error('❌ Location ID is required to fetch Access IDs');
            return [];
        }
    };

    const handleCompareRFIDs = async () => {
        if (contactsData.length === 0) {
            alert('Please fetch contact data first before comparing RFIDs.');
            return;
        }

        if (accessIds.length === 0) {
            alert('Please fetch Access IDs from database first before comparing RFIDs.');
            return;
        }

        setIsComparingRFIDs(true);
        
        try {
            console.log('🔍 Starting RFID comparison using Access IDs...');
            console.log(`📋 Comparing ${contactsData.length} SOAP contacts with ${accessIds.length} database Access IDs`);
            
            // Extract SOAP RFIDs (filter out empty/null values)
            const soapRFIDs = contactsData
                .map(contact => contact.RFIDNumber?.trim())
                .filter(Boolean) as string[];
            
            // Convert to lowercase for case-insensitive comparison
            const soapRFIDsLower = soapRFIDs.map(rfid => rfid.toLowerCase());
            const accessIdsLower = accessIds.map(id => id.toLowerCase());
            
            // 1. RFIDs in BOTH lists (intersection)
            const inBothLists = soapRFIDs.filter(soapRfid => 
                accessIdsLower.includes(soapRfid.toLowerCase())
            );
            
            // 2. RFIDs ONLY in SOAP (SOAP - Database)
            const onlyInSOAP = soapRFIDs.filter(soapRfid => 
                !accessIdsLower.includes(soapRfid.toLowerCase())
            );
            
            // 3. RFIDs ONLY in Database (Database - SOAP)
            const onlyInDatabase = accessIds.filter(accessId => 
                !soapRFIDsLower.includes(accessId.toLowerCase())
            );
            
            // Create comparison results for the table display
            const comparisons: RFIDComparison[] = [];
            
            // Add matches (in both lists)
            inBothLists.forEach(rfid => {
                const contact = contactsData.find(c => 
                    c.RFIDNumber?.trim().toLowerCase() === rfid.toLowerCase()
                );
                if (contact) {
                    comparisons.push({
                        accountNumber: contact.AccountNumber || '',
                        contactId: contact.ContactId || '',
                        firstName: contact.FirstName || '',
                        lastName: contact.LastName || '',
                        soapRFID: rfid,
                        databaseRFID: rfid,
                        allRFID: rfid,
                        status: 'Match',
                        match: true
                    });
                }
            });
            
            // Add SOAP only
            onlyInSOAP.forEach(rfid => {
                const contact = contactsData.find(c => 
                    c.RFIDNumber?.trim().toLowerCase() === rfid.toLowerCase()
                );
                if (contact) {
                    comparisons.push({
                        accountNumber: contact.AccountNumber || '',
                        contactId: contact.ContactId || '',
                        firstName: contact.FirstName || '',
                        lastName: contact.LastName || '',
                        soapRFID: rfid,
                        databaseRFID: '',
                        allRFID: rfid,
                        status: 'PARCs Only',
                        match: false
                    });
                }
            });
            
            // Add Database only
            onlyInDatabase.forEach(accessId => {
                comparisons.push({
                    accountNumber: 'Unknown',
                    contactId: 'Unknown',
                    firstName: 'Unknown',
                    lastName: 'Contact',
                    soapRFID: '',
                    databaseRFID: accessId,
                    allRFID: accessId,
                    status: 'Subscription Only',
                    match: false
                });
            });
            
            setRfidComparisons(comparisons);
            
            // Log the three lists
            console.log(`📊 RFID Comparison Results:`);
            console.log(`✅ In BOTH lists (${inBothLists.length}):`, inBothLists);
            console.log(`🟡 Only in SOAP (${onlyInSOAP.length}):`, onlyInSOAP);
            console.log(`🔵 Only in Database (${onlyInDatabase.length}):`, onlyInDatabase);
            
            console.log(`📋 Summary:`);
            console.log(`  - Total SOAP RFIDs: ${soapRFIDs.length}`);
            console.log(`  - Total Database Access IDs: ${accessIds.length}`);
            console.log(`  - Matches: ${inBothLists.length}`);
            console.log(`  - SOAP Only: ${onlyInSOAP.length}`);
            console.log(`  - Subscription Only: ${onlyInDatabase.length}`);
            console.log(`  - Total Comparisons: ${rfidComparisons.length}`);
            
        } catch (error) {
            console.error('Error comparing RFIDs with Access IDs:', error);
            alert('Error comparing RFID data with Access IDs. Please check the console for details.');
        } finally {
            setIsComparingRFIDs(false);
        }
    };

    return (
        <ThemeProvider theme={companyTheme}>
            <Box
                sx={{
                    minHeight: '100vh',
                    width: '100%',
                    background: 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)',
                    padding: { xs: 2, md: 3 }
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
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#1565c0' }}>
                                    🌐 Mode: {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Development (Vite)' : 'Production (Express)'}
                                    &nbsp;|&nbsp;
                                    📡 SOAP Endpoint: {SOAP_ENDPOINT} → https://int1aa.azurewebsites.net
                                    &nbsp;|&nbsp;
                                    🔧 SOAP Version: {soapVersion}
                                </Typography>
                                
                                {/* Share URL Button */}
                                {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => {
                                            const url = window.location.origin;
                                            navigator.clipboard.writeText(url).then(() => {
                                                alert(`✅ Copied to clipboard!\n\nShare this URL:\n${url}`);
                                            }).catch(() => {
                                                prompt('Copy this URL to share with others:', url);
                                            });
                                        }}
                                        sx={{ ml: 2, fontSize: '0.75rem' }}
                                    >
                                        📋 Copy Share URL
                                    </Button>
                                )}
                                
                                {/* Development Warning */}
                                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                    <Typography variant="caption" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                                        ⚠️ This is localhost - only you can access it!
                                    </Typography>
                                )}
                            </Stack>
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
                                    <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'medium' }}>
                                        Processing Options:
                                    </Typography>
                                    <Stack direction="column" spacing={0.5}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={true}
                                                disabled={true}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Typography variant="caption">Fetch All Accounts</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={true}
                                                disabled={true}
                                                style={{ marginRight: 4 }}
                                            />
                                            <Typography variant="caption">Fetch Account Details</Typography>
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
                                    </Stack>
                                </Grid>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={comparisonEnabled}
                                        onChange={(e) => setComparisonEnabled(e.target.checked)}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Typography variant="caption">Auto-Compare with Database</Typography>
                                </Box>
                            </Grid>
                        </Box>
                        
                        {/* Form Section */}
                        <Stack spacing={3} sx={{ mb: 3, backgroundColor: '#f8f9fa', borderRadius: 2, p: 2  }}>
                            <Box>
                                <Grid container spacing={1} px={4} mb={3}>
                                    <Grid size={3}>
                                        <Typography variant="h6">Request Parameters</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Complete account processing with detailed information and contacts
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
                                            <TextField
                                                fullWidth
                                                label="Credential Number"
                                                value={formData.CredentialNumber}
                                                onChange={handleInputChange('CredentialNumber')}
                                                variant="outlined"
                                            />
                                        </Stack>
                                    </Grid> 
                                </Grid>
                                
                                {/* Always show GetAllMonthlies filters */}
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
                            </Box>
                            <Box>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={async () => {
                                        try {
                                            // Step 1: Fetch data
                                            await handleFetchData();
                                            
                                            // Step 2: Get access IDs and wait for the result
                                            const fetchedAccessIds = await handlePullAccessId();
                                            console.log('🔍 Button click - fetched accessIds:', fetchedAccessIds);
                                            
                                            // Step 3: Only run comparison if we have both datasets
                                            if (contactsData.length > 0 && fetchedAccessIds.length > 0) {
                                                console.log('✅ Both datasets available, running comparison...');
                                                await handleCompareRFIDs();
                                            } else {
                                                console.warn('⚠️ Missing data for comparison:', {
                                                    contactsCount: contactsData.length,
                                                    accessIdsCount: fetchedAccessIds.length
                                                });
                                                
                                                // Show user-friendly message
                                                if (fetchedAccessIds.length === 0) {
                                                    alert('No Access IDs found in database for this location.');
                                                } else if (contactsData.length === 0) {
                                                    alert('No contact data available. Please fetch contact data first.');
                                                }
                                            }
                                        } catch (error) {
                                            console.error('❌ Error in button click handler:', error);
                                            alert('Error processing data. Please check the console for details.');
                                        }
                                    }}
                                    disabled={loading || !formData.securityToken || !formData.locationId}
                                    sx={{ mr: 2 }}
                                >
                                    {loading ? 'Loading...' : 'Process All Accounts'}
                                </Button>
                                
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleProcessIntegration}
                                    disabled={isProcessingIntegration || rawAccounts.length === 0}
                                    sx={{ mr: 2 }}
                                    >
                                    {isProcessingIntegration ? 'Processing...' : 'Process Integration'}
                                </Button>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleCompareRFIDs}
                                    disabled={isComparingRFIDs || contactsData.length === 0}
                                    sx={{ mr: 2 }}
                                >
                                    {isComparingRFIDs ? 'Comparing...' : 'Compare RFIDs with Database'}
                                </Button>
                                
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

                        {/* Foreign Key Filter Status */}
                        {selectedAccountNumber && (
                            <Alert 
                                severity="info" 
                                sx={{ mt: 2, mb: 2 }}
                                action={
                                    <Button 
                                        color="inherit" 
                                        size="small" 
                                        onClick={() => setSelectedAccountNumber(null)}
                                    >
                                        Clear Filter
                                    </Button>
                                }
                            >
                                🔗 Tables are filtered by Account Number: <strong>{selectedAccountNumber}</strong>
                                <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    <Chip 
                                        size="small" 
                                        label={`Basic Accounts: ${tableData.filter(row => row.accountNumber === selectedAccountNumber).length}`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                    <Chip 
                                        size="small" 
                                        label={`Detailed Info: ${detailedAccountsData.filter(account => 
                                            (account.MonthlyAccountNumber || account.AccountNumber) === selectedAccountNumber).length}`}
                                        color="secondary"
                                        variant="outlined"
                                    />
                                    <Chip 
                                        size="small" 
                                        label={`Contacts: ${contactsData.filter(contact => contact.AccountNumber === selectedAccountNumber).length}`}
                                        color="success"
                                        variant="outlined"
                                    />
                                </Box>
                            </Alert>
                        )}

                        {/* Table Section - Basic Account List */}
                        {tableData.length > 0 && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    📋 Basic Account List ({tableData.length} records)
                                    {selectedAccountNumber && ' - Click rows to filter other tables'}
                                </Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
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
                                                    onClick={() => setSelectedAccountNumber(row.accountNumber)}
                                                    onMouseEnter={() => setHighlightedAccountNumber(row.accountNumber)}
                                                    onMouseLeave={() => setHighlightedAccountNumber(null)}
                                                    sx={{ 
                                                        '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                                                        '&:hover': { backgroundColor: '#e3f2fd', cursor: 'pointer' },
                                                        backgroundColor: selectedAccountNumber === row.accountNumber ? '#bbdefb' : 
                                                                        highlightedAccountNumber === row.accountNumber ? '#e3f2fd' : undefined
                                                    }}
                                                >
                                                    <TableCell>{row.id}</TableCell>
                                                    <TableCell sx={{ 
                                                        fontWeight: selectedAccountNumber === row.accountNumber ? 'bold' : 'medium',
                                                        color: selectedAccountNumber === row.accountNumber ? '#1976d2' : 'inherit'
                                                    }}>
                                                        {row.accountNumber}
                                                    </TableCell>
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

                        {/* Detailed Account Information Table 
                        {detailedAccountsData.length > 0 && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    🏢 Detailed Account Information 
                                    {selectedAccountNumber 
                                        ? ` (Filtered by Account: ${selectedAccountNumber})` 
                                        : ` (${detailedAccountsData.length} records)`
                                    }
                                    {selectedAccountNumber && (
                                        <Button 
                                            size="small" 
                                            onClick={() => setSelectedAccountNumber(null)}
                                            sx={{ ml: 2 }}
                                        >
                                            Clear Filter
                                        </Button>
                                    )}
                                </Typography>
                                <TableContainer component={Paper} sx={{ maxHeight: 400, overflowX: 'auto' }}>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 120 }}>Account Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 120 }}>Account Type</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>Status</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 150 }}>Company Name</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 200 }}>Address</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>City</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 80 }}>State</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>Zipcode</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 120 }}>Valid Until</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 80 }}>Parks</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>Department</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {detailedAccountsData
                                                .filter(account => !selectedAccountNumber || 
                                                    (account.MonthlyAccountNumber || account.AccountNumber) === selectedAccountNumber)
                                                .map((account, index) => (
                                                <TableRow 
                                                    key={index}
                                                    sx={{
                                                        backgroundColor: selectedAccountNumber && 
                                                            (account.MonthlyAccountNumber || account.AccountNumber) === selectedAccountNumber 
                                                            ? '#e8f5e8' : undefined
                                                    }}
                                                >
                                                    <TableCell sx={{ 
                                                        fontWeight: selectedAccountNumber && 
                                                            (account.MonthlyAccountNumber || account.AccountNumber) === selectedAccountNumber 
                                                            ? 'bold' : 'normal'
                                                    }}>
                                                        {account.MonthlyAccountNumber || account.AccountNumber}
                                                    </TableCell>
                                                    <TableCell>{account.AccountType}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={account.Status} 
                                                            color={account.Status === 'Valid' ? 'success' : 'warning'} 
                                                            size="small" 
                                                        />
                                                    </TableCell>
                                                    <TableCell>{account.CompanyName}</TableCell>
                                                    <TableCell>{account.Address}</TableCell>
                                                    <TableCell>{account.City}</TableCell>
                                                    <TableCell>{account.State}</TableCell>
                                                    <TableCell>{account.Zipcode}</TableCell>
                                                    <TableCell>{account.ValidUntil}</TableCell>
                                                    <TableCell>{account.Parks}</TableCell>
                                                    <TableCell>{account.Department}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                        */}

                        {/* Contact Information Table */}
                        {contactsData.length > 0 && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    👥 Contact Information 
                                    {selectedAccountNumber 
                                        ? ` (Filtered by Account: ${selectedAccountNumber})` 
                                        : ` (${contactsData.length} records - duplicates merged)`
                                    }
                                    {selectedAccountNumber && (
                                        <Button 
                                            size="small" 
                                            onClick={() => setSelectedAccountNumber(null)}
                                            sx={{ ml: 2 }}
                                        >
                                            Clear Filter
                                        </Button>
                                    )}
                                </Typography>
                                {!selectedAccountNumber && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        🔄 Duplicate contacts with the same name and account have been automatically merged, 
                                        prioritizing primary contact data and combining RFID/credential information.
                                    </Typography>
                                )}
                                <TableContainer component={Paper} sx={{ maxHeight: 400, overflowX: 'auto' }}>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Account Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>RFID Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>First Name</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>Last Name</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>Contact ID</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 200 }}>Email Address</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Mobile Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>Primary Contact</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Employee ID</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Customer Barcode</TableCell>
                                                
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {contactsData
                                                .filter(contact => !selectedAccountNumber || contact.AccountNumber === selectedAccountNumber)
                                                .map((contact, index) => (
                                                <TableRow 
                                                    key={index}
                                                    sx={{
                                                        backgroundColor: selectedAccountNumber && contact.AccountNumber === selectedAccountNumber 
                                                            ? '#fffde7' : undefined
                                                    }}
                                                >
                                                    <TableCell sx={{ 
                                                        fontWeight: selectedAccountNumber && contact.AccountNumber === selectedAccountNumber 
                                                            ? 'bold' : 'normal'
                                                    }}>
                                                        {contact.AccountNumber}
                                                    </TableCell>
                                                    <TableCell>{contact.RFIDNumber}</TableCell>
                                                    <TableCell>{contact.FirstName}</TableCell>
                                                    <TableCell>{contact.LastName}</TableCell>
                                                    <TableCell>{contact.ContactId}</TableCell>
                                                    <TableCell>{contact.EmailAddress}</TableCell>
                                                    <TableCell>{contact.MobileNumber}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={contact.PrimaryContact ? 'Yes' : 'No'} 
                                                            color={contact.PrimaryContact ? 'primary' : 'default'} 
                                                            size="small" 
                                                        />
                                                    </TableCell>
                                                    <TableCell>{contact.EmployeeId}</TableCell>
                                                    <TableCell>{contact.CustomerBarcode}</TableCell>
                                                    
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

                                {/* Account Details Table */}
                                {integrationResult.Monthlies.some(m => m.Account) && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Account Details ({integrationResult.Monthlies.filter(m => m.Account).length})
                                        </Typography>
                                        <TableContainer component={Paper} sx={{ maxHeight: 400, overflowX: 'auto' }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 120 }}>Account Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 120 }}>Account Type</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>Status</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 150 }}>Company Name</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 200 }}>Address</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>City</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 80 }}>State</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 100 }}>Zipcode</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 120 }}>Valid Until</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd', minWidth: 80 }}>Parks</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {integrationResult.Monthlies.filter(m => m.Account).map((monthly, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{monthly.Account?.MonthlyAccountNumber || monthly.AccountNumber}</TableCell>
                                                            <TableCell>{monthly.Account?.AccountType}</TableCell>
                                                            <TableCell>
                                                                <Chip 
                                                                    label={monthly.Account?.Status || monthly.Status} 
                                                                    color={monthly.Account?.Status === 'Valid' ? 'success' : 'warning'} 
                                                                    size="small" 
                                                                />
                                                            </TableCell>
                                                            <TableCell>{monthly.Account?.CompanyName}</TableCell>
                                                            <TableCell>{monthly.Account?.Address}</TableCell>
                                                            <TableCell>{monthly.Account?.City}</TableCell>
                                                            <TableCell>{monthly.Account?.State}</TableCell>
                                                            <TableCell>{monthly.Account?.Zipcode}</TableCell>
                                                            <TableCell>{monthly.Account?.ValidUntil}</TableCell>
                                                            <TableCell>{monthly.Account?.Parks}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}

                                {/* Vehicle Details Table */}
                                {integrationResult.Monthlies.some(m => m.Vehicles?.length) && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Vehicle Details ({integrationResult.Monthlies.reduce((total, m) => total + (m.Vehicles?.length || 0), 0)})
                                        </Typography>
                                        <TableContainer component={Paper} sx={{ maxHeight: 400, overflowX: 'auto' }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 120 }}>Account Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 100 }}>Vehicle ID</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 120 }}>License Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 80 }}>State</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 100 }}>Make</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 100 }}>Model</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 80 }}>Color</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 120 }}>Nickname</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 120 }}>Parking Spot</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e8f5e8', minWidth: 100 }}>RFID Number</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {integrationResult.Monthlies.flatMap(monthly => 
                                                        (monthly.Vehicles || []).map((vehicle, vIndex) => (
                                                            <TableRow key={`${monthly.AccountNumber}-${vIndex}`}>
                                                                <TableCell>{vehicle.AccountNumber}</TableCell>
                                                                <TableCell>{vehicle.VehicleID}</TableCell>
                                                                <TableCell>{vehicle.VehicleLicenseNumber}</TableCell>
                                                                <TableCell>{vehicle.VehicleLicenseState}</TableCell>
                                                                <TableCell>{vehicle.VehicleMake}</TableCell>
                                                                <TableCell>{vehicle.VehicleModel}</TableCell>
                                                                <TableCell>{vehicle.VehicleColor}</TableCell>
                                                                <TableCell>{vehicle.VehicleNickname}</TableCell>
                                                                <TableCell>{vehicle.ParkingSpot}</TableCell>
                                                                <TableCell>{vehicle.RFIDNumber}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                )}

                                {/* Contact Details Table */}
                                {integrationResult.Monthlies.some(m => m.Contacts?.length) && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Contact Details ({integrationResult.Monthlies.reduce((total, m) => total + (m.Contacts?.length || 0), 0)})
                                        </Typography>
                                        <TableContainer component={Paper} sx={{ maxHeight: 400, overflowX: 'auto' }}>
                                            <Table stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Account Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>Contact ID</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>First Name</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>Last Name</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 200 }}>Email Address</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Mobile Number</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>Primary Contact</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Employee ID</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 120 }}>Customer Barcode</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#fff3e0', minWidth: 100 }}>RFID Number</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {integrationResult.Monthlies.flatMap(monthly => 
                                                        (monthly.Contacts || []).map((contact, cIndex) => (
                                                            <TableRow key={`${monthly.AccountNumber}-${cIndex}`}>
                                                                <TableCell>{contact.AccountNumber}</TableCell>
                                                                <TableCell>{contact.ContactId}</TableCell>
                                                                <TableCell>{contact.FirstName}</TableCell>
                                                                <TableCell>{contact.LastName}</TableCell>
                                                                <TableCell>{contact.EmailAddress}</TableCell>
                                                                <TableCell>{contact.MobileNumber}</TableCell>
                                                                <TableCell>
                                                                    {contact.PrimaryContact ? 
                                                                        <Chip label="Primary" color="primary" size="small" /> :
                                                                        <Chip label="Secondary" color="default" size="small" />
                                                                    }
                                                                </TableCell>
                                                                <TableCell>{contact.EmployeeId}</TableCell>
                                                                <TableCell>{contact.CustomerBarcode}</TableCell>
                                                                <TableCell>{contact.RFIDNumber}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
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
                        {rfidComparisons.length > 0 && (
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="h6" gutterBottom>
                                    🔍 RFID Comparison Results ({rfidComparisons.length} records)
                                </Typography>
                                
                                {/* Comparison Summary */}
                                <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                                    <Grid container spacing={2}>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Matches: ${rfidComparisons.filter(c => c.status === 'Match').length}`} 
                                                color="success" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Mismatches: ${rfidComparisons.filter(c => c.status === 'Mismatch').length}`} 
                                                color="error" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`PARCs Only: ${rfidComparisons.filter(c => c.status === 'PARCs Only').length}`} 
                                                color="warning" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                        <Grid size={3}>
                                            <Chip 
                                                label={`Subscription Only: ${rfidComparisons.filter(c => c.status === 'Subscription Only').length}`} 
                                                color="info" 
                                                variant="outlined" 
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                <TableContainer component={Paper} sx={{ maxHeight: 400, overflowX: 'auto' }}>
                                    <Table stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f3e5f5', minWidth: 120 }}>Account Number</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f3e5f5', minWidth: 150 }}>Contact Name</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f3e5f5', minWidth: 120 }}>All RFID</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f3e5f5', minWidth: 100 }}>Status</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f3e5f5', minWidth: 80 }}>Match</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rfidComparisons
                                                .filter(comparison => !selectedAccountNumber || comparison.accountNumber === selectedAccountNumber)
                                                .map((comparison, index) => (
                                                <TableRow 
                                                    key={index}
                                                    sx={{
                                                        backgroundColor: 
                                                            comparison.status === 'Match' ? '#e8f5e8' :
                                                            comparison.status === 'Mismatch' ? '#ffebee' :
                                                            comparison.status === 'PARCs Only' ? '#fff3e0' :
                                                            comparison.status === 'Subscription Only' ? '#e3f2fd' : undefined
                                                    }}
                                                >
                                                    <TableCell>{comparison.accountNumber}</TableCell>
                                                    <TableCell>{`${comparison.firstName} ${comparison.lastName}`}</TableCell>
                                                    <TableCell>{comparison.allRFID || '(none)'}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={comparison.status} 
                                                            color={
                                                                comparison.status === 'Match' ? 'success' :
                                                                comparison.status === 'Mismatch' ? 'error' :
                                                                comparison.status === 'PARCs Only' ? 'warning' :
                                                                'info'
                                                            }
                                                            size="small" 
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {comparison.match ? '✅' : '❌'}
                                                    </TableCell>
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
