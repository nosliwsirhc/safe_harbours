import { IAddress } from './address.model';

export interface IPlacingAgency extends IAddress {
    id?: string,
    name: string,
    address: IAddress
    locations: IAddress[],
    phone: string
}