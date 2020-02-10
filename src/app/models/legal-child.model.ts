import { IPerson } from './person.model';

export interface ILegalChild extends IPerson {
    livesAtHome: boolean
}