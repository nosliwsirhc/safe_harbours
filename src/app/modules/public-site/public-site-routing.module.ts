import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PublicSiteComponent } from './public-site.component';

const routes: Routes = [
    { path: '', component: PublicSiteComponent, children: [
        { path: '', loadChildren: () => import('./containers/home/home.module').then(mod => mod.HomeModule), pathMatch: 'full' },
        { path: 'about', loadChildren: () => import('./containers/about/about.module').then(mod => mod.AboutModule) },
        { path: 'apply-to-foster', loadChildren: () => import('./containers/foster-care-application/foster-care-application.module').then(mod => mod.FosterCareApplicationModule) },
        { path: 'contact', loadChildren: () => import('./containers/contact-page/contact-page.module').then(mod => mod.ContactPageModule) },
        { path: 'frequently-asked-questions', loadChildren: () => import('./containers/faq/faq.module').then(mod => mod.FaqModule) },
        { path: 'faq', redirectTo: 'frequently-asked-questions' },
        { path: 'news', loadChildren: () => import('../news/news.module').then(mod => mod.NewsModule)},
        { path: 'programs', loadChildren: () => import('./containers/programs-page/programs-page.module').then(mod => mod.ProgramsPageModule) },
        { path: 'foster-care-stories', loadChildren: () => import('./containers/stories/stories.module').then(mod => mod.StoriesModule) },
        { path: 'stories', redirectTo: 'foster-care-stories' },
        { path: 'foster-care-per-diem', loadChildren: () => import('./containers/per-diem/per-diem.module').then(mod => mod.PerDiemModule)}
    ]},
];

@NgModule({
    declarations: [],
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PublicSiteRoutingModule { }