import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { PublicSiteRoutingModule } from './public-site-routing.module';

import { PublicSiteComponent } from './public-site.component';

import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';


@NgModule({
  declarations: [
    PublicSiteComponent,
    NavbarComponent,
    FooterComponent
  ],
  imports: [
    SharedModule,
    PublicSiteRoutingModule
  ],
  exports: []
})
export class PublicSiteModule { }
