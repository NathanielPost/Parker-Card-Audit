export interface ParkingCard {
    id: string;
    securityToken: string;
    locationId: string;
    includeValid: 'True' | 'False';
    includeInvalid: 'True' | 'False';
    includeDeleted: 'True' | 'False';
    Date: Date;
    ParkerStatus: 'Active' | 'Inactive' | 'Deleted';
    CredentialNumber: string;
}

// Extended types for detailed monthly account processing
export interface MonthlyAccountLite {
    AccountNumber: string;
    FlashAccountNumber: string;
    Status: string;
    IsDeleted: boolean;
    Deleted: string;
    MonthlyAccountType: string;
}

export interface CarProfile {
    VehicleGuid: string;
    LicensePlate?: string;
    Make?: string;
    Model?: string;
    Color?: string;
}

export interface ContactProfile {
    ContactGuid: string;
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Phone?: string;
}

export interface MonthlyAccountResult {
    AccountType?: string; // Monthly or Resident or Membership or Master
    Address?: string;
    Address2?: string;
    AllowPassback?: boolean;
    Cars?: string[]; // Array of car IDs
    City?: string;
    Code?: string; // Success or GeneralFailure or InvalidLogin or InvalidLocation or NotFound
    CompanyCode?: string;
    CompanyName?: string;
    Contacts?: string[]; // Array of contact IDs
    Department?: string;
    ExternalId?: string;
    LateFeeOnKiosk?: boolean;
    LocationID?: string;
    MasterAccountNumber?: number;
    MembershipSetting?: string;
    Message?: string;
    MonthlyAccountGuid?: string;
    MonthlyAccountNumber?: number;
    Parks?: number;
    PoolName?: string;
    Profile?: string;
    ReportGroup?: string;
    State?: string;
    Status?: string; // Automatic or Valid or Invalid
    ValidUntil?: string; // dateTime
    Zipcode?: string;
    // For backward compatibility
    AccountNumber?: string;
    FlashAccountNumber?: string;
}

export interface MonthlyVehicleResult {
    AccountNumber?: string;
    Code?: string; // Success or GeneralFailure or InvalidLogin or InvalidLocation or NotFound
    KeyBarcode?: string;
    KeyHook?: string;
    Message?: string;
    ParkingSpot?: string;
    RFIDNumber?: string;
    VehicleBarcode?: string;
    VehicleColor?: string;
    VehicleID?: string;
    VehicleLicenseNumber?: string;
    VehicleLicenseState?: string;
    VehicleMake?: string;
    VehicleModel?: string;
    VehicleNickname?: string;
    // For backward compatibility
    VehicleGuid?: string;
    FlashAccountNumber?: string;
    LicensePlate?: string;
    Make?: string;
    Model?: string;
    Color?: string;
}

export interface MonthlyContactResult {
    Code?: string; // Success or GeneralFailure or InvalidLogin or InvalidLocation or NotFound
    Message?: string;
    LocationId?: string;
    ContactId?: string;
    AccountNumber?: string;
    PrimaryContact?: boolean;
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    MobileNumber?: string;
    CustomerBarcode?: string;
    RFIDNumber?: string;
    EmployeeId?: string;
    // For backward compatibility
    ContactGuid?: string;
    FlashAccountNumber?: string;
    Email?: string;
    Phone?: string;
}

export interface MonthlyModel {
    AccountNumber: string;
    FlashAccountNumber: string;
    IsDeleted: boolean;
    Status: string;
    Account?: MonthlyAccountResult;
    Vehicles?: MonthlyVehicleResult[];
    Contacts?: MonthlyContactResult[];
}

export interface IntegrationResult {
    Monthlies: MonthlyModel[];
    ErrorAccounts: MonthlyModel[];
    ProcessingStats: {
        TotalAccounts: number;
        SuccessfulAccounts: number;
        ErrorAccounts: number;
        ProcessingTimeMs: number;
    };
}

// Location Profile types for GetMonthlyProfiles
export interface LocationProfile {
    UniqueID: string;
    Name: string;
}

export interface MonthlyProfilesResult {
    Code: string;
    Message: string;
    LocationProfiles: LocationProfile[];
}

export interface DatabaseConfig {
    server: string;
    database: string;
    username: string;
    password: string;
    encrypt: boolean;
    multipleActiveResultSets: boolean;
}

export interface DatabaseContact {
    ContactId: string;
    AccountNumber: string;
    FirstName: string;
    LastName: string;
    RFIDNumber: string;
    EmailAddress: string;
    PrimaryContact: boolean;
    // Add other fields as needed
}

export interface RFIDComparison {
    contactId: string;
    accountNumber: string;
    firstName: string;
    lastName: string;
    soapRFID: string;
    databaseRFID: string;
    match: boolean;
    status: 'Match' | 'PARCs Only' | 'Database Only' | 'Mismatch';
}

class DatabaseService {
    private readonly apiEndpoint = '/api/database';

    async getContactsFromDatabase(accountNumbers?: string[]): Promise<DatabaseContact[]> {
        try {
            const response = await fetch(`${this.apiEndpoint}/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ accountNumbers })
            });

            if (!response.ok) {
                throw new Error(`Database query failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching contacts from database:', error);
            throw error;
        }
    }

    async getRFIDComparison(soapContacts: any[], databaseContacts: DatabaseContact[]): Promise<RFIDComparison[]> {
        const comparisons: RFIDComparison[] = [];
        
        // Create maps for efficient lookup
        const soapContactMap = new Map(
            soapContacts.map(contact => [
                `${contact.AccountNumber}-${contact.ContactId}`,
                contact
            ])
        );
        
        const databaseContactMap = new Map(
            databaseContacts.map(contact => [
                `${contact.AccountNumber}-${contact.ContactId}`,
                contact
            ])
        );

        // Find all unique contact identifiers
        const allContactKeys = new Set([
            ...soapContactMap.keys(),
            ...databaseContactMap.keys()
        ]);

        for (const contactKey of allContactKeys) {
            const soapContact = soapContactMap.get(contactKey);
            const dbContact = databaseContactMap.get(contactKey);

            if (soapContact && dbContact) {
                // Both sources have this contact
                const match = soapContact.RFIDNumber === dbContact.RFIDNumber;
                comparisons.push({
                    contactId: soapContact.ContactId || dbContact.ContactId,
                    accountNumber: soapContact.AccountNumber || dbContact.AccountNumber,
                    firstName: soapContact.FirstName || dbContact.FirstName,
                    lastName: soapContact.LastName || dbContact.LastName,
                    soapRFID: soapContact.RFIDNumber || '',
                    databaseRFID: dbContact.RFIDNumber || '',
                    match,
                    status: match ? 'Match' : 'Mismatch'
                });
            } else if (soapContact) {
                // Only in SOAP data
                comparisons.push({
                    contactId: soapContact.ContactId,
                    accountNumber: soapContact.AccountNumber,
                    firstName: soapContact.FirstName,
                    lastName: soapContact.LastName,
                    soapRFID: soapContact.RFIDNumber || '',
                    databaseRFID: '',
                    match: false,
                    status: 'PARCs Only'
                });
            } else if (dbContact) {
                // Only in database
                comparisons.push({
                    contactId: dbContact.ContactId,
                    accountNumber: dbContact.AccountNumber,
                    firstName: dbContact.FirstName,
                    lastName: dbContact.LastName,
                    soapRFID: '',
                    databaseRFID: dbContact.RFIDNumber || '',
                    match: false,
                    status: 'Database Only'
                });
            }
        }

        return comparisons.sort((a, b) => 
            a.accountNumber.localeCompare(b.accountNumber) || 
            a.lastName.localeCompare(b.lastName)
        );
    }
}

export const databaseService = new DatabaseService();
