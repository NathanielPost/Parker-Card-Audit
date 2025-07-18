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
