import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { AboutComponent } from './about.component';

const routes: Route[] = [
    { path: '', component: AboutComponent }
];

@NgModule({
    declarations: [AboutComponent],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class AboutModule {}