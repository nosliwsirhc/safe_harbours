import { IPerson } from './person.model';

export interface IFosterParent extends IPerson {
    email: string,
    phone: string
}