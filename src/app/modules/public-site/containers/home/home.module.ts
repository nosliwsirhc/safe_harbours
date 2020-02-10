import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { HomeComponent } from './home.component';

import { HomeContactComponent } from './components/home-contact/home-contact.component';
import { HomeHeaderComponent } from './components/home-header/home-header.component';
import { ProgramsComponent } from './components/programs/programs.component';
import { WhatWeDoComponent } from './components/what-we-do/what-we-do.component';
import { WhoWeAreComponent } from './components/who-we-are/who-we-are.component';

const routes: Route[] = [
    { path: '', component: HomeComponent }
];

@NgModule({
    declarations: [
        HomeComponent,
        HomeContactComponent,
        HomeHeaderComponent,
        ProgramsComponent,
        WhatWeDoComponent,
        WhoWeAreComponent
    ],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class HomeModule {}