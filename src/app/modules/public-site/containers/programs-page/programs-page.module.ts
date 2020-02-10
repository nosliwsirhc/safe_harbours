import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { ProgramsPageComponent } from './programs-page.component';

import { BehaviouralComponent } from './components/behavioural/behavioural.component';
import { MainstreamComponent } from './components/mainstream/mainstream.component';
import { TraumaComponent } from './components/trauma/trauma.component';

const routes: Route[] = [
    {
        path: '', component: ProgramsPageComponent, children: [
            { path: 'mainstream-foster-care', component: MainstreamComponent },
            { path: 'behavioural-foster-care', component: BehaviouralComponent },
            { path: 'trauma-focused-foster-care', component: TraumaComponent }
        ]
    }
];

@NgModule({
    declarations: [
        ProgramsPageComponent,
        BehaviouralComponent,
        MainstreamComponent,
        TraumaComponent
    ],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class ProgramsPageModule {}