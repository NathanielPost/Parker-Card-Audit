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
