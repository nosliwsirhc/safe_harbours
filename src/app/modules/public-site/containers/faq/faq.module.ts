import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { FaqComponent } from './faq.component';

const routes: Route[] = [
    { path: '', component: FaqComponent }
];

@NgModule({
    declarations: [FaqComponent],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class FaqModule {}