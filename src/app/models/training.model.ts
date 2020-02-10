export interface ITraining {
    id?: string,
    title: string,
    trainers: [
        {name: string, credentials: string}
    ],
    description: string,
    location: string,
    date: Date,
    timeStart: Date,
    timeEnd: Date,
    hours: number,
    isMandatory: boolean,
    renewable: boolean,
    renewalDate?: Date,
    cost?: number,
    admissionPrice?: number,
    credits?: number,
    attendees?: [
        {
            id: string,
            name: string,
            home: {
                id: string, name: string
            }
        }
    ],
}