import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { FosterCareApplicationComponent } from './foster-care-application.component';

const routes: Route[] = [
    { path: '', component: FosterCareApplicationComponent }
];

@NgModule({
    declarations: [FosterCareApplicationComponent],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class FosterCareApplicationModule {}