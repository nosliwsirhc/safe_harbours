import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { ContactPageComponent } from './contact-page.component';

const routes: Route[] = [
    { path: '', component: ContactPageComponent }
];

@NgModule({
    declarations: [ContactPageComponent],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class ContactPageModule {}