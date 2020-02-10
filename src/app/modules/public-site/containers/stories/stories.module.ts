import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { StoriesComponent } from './stories.component';

const routes: Route[] = [
    { path: '', component: StoriesComponent }
];

@NgModule({
    declarations: [StoriesComponent],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class StoriesModule {}