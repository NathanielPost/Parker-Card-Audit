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
    AccountNumber: string;
    FlashAccountNumber: string;
    Cars?: CarProfile[];
    Contacts?: ContactProfile[];
    // Add other account details as needed
}

export interface MonthlyVehicleResult {
    VehicleGuid: string;
    AccountNumber: string;
    FlashAccountNumber: string;
    LicensePlate?: string;
    Make?: string;
    Model?: string;
    Color?: string;
    // Add other vehicle details as needed
}

export interface MonthlyContactResult {
    ContactGuid: string;
    AccountNumber: string;
    FlashAccountNumber: string;
    FirstName?: string;
    LastName?: string;
    Email?: string;
    Phone?: string;
    // Add other contact details as needed
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
