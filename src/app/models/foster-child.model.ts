import { IPerson } from './person.model';
import { IPlacement } from './placement.model';

export interface IFosterChild extends IPerson {
    id?: string,
    placingAgencyId: string,
    placingAgencyName: string,
    placements: IPlacement[],
    fosterHomeId: string,
    fosterHomeName: string,
    religion: string,
    race: string,
    ethnicity: string,
    aboriginal: boolean,
    aboriginalGroup?: string
}