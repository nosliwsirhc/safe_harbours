export interface IAddress {
    street1: string,
    street2?: string,
    city: string,
    province: string,
    postalCode: string,
    region?: string,
    lat?: number,
    lng?: number,
    dateIn?: Date,
    dateOut?: Date
}