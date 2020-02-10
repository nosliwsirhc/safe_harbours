import { IAddress } from './address.model';
// import { IContact } from './contact.model';
import { IFosterParent } from './foster-parent.model';
import { ILegalChild } from './legal-child.model';
import { ITraining } from './training.model';

export interface IHome {
    id?: string,
    name: string,
    addresses: IAddress[],
    // contacts: IContact[],
    fosterParents: IFosterParent[],
    legalChildren: ILegalChild[],
    homeStatus: {
        status: string,
        dateRecruitment: Date,
        dateOpened: Date,
        dateClosed: Date
    }
    training?: ITraining[]
}