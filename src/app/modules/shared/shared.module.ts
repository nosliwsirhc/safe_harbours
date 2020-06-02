import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RecaptchaModule, RecaptchaFormsModule } from 'ng-recaptcha';
import { AgmCoreModule } from '@agm/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FlexLayoutServerModule } from '@angular/flex-layout/server';
import { RouterModule } from '@angular/router';

import { environment } from '../../../environments/environment';

import { MaterialModule } from './material.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { ReadMoreComponent } from '../public-site/components/read-more/read-more.component';

@NgModule({
  declarations: [
    SafeHtmlPipe,
    ReadMoreComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    FormsModule,
    RecaptchaModule,
    RecaptchaFormsModule,
    FontAwesomeModule,
    AgmCoreModule.forRoot({ apiKey: environment.agm.apiKey, libraries: ['places'] }),
    FlexLayoutModule,
    FlexLayoutServerModule
  ],
  exports: [
    RouterModule,
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    FormsModule,
    RecaptchaModule,
    RecaptchaFormsModule,
    FontAwesomeModule,
    SafeHtmlPipe,
    AgmCoreModule,
    FlexLayoutModule,
    FlexLayoutServerModule,
    ReadMoreComponent
  ],
  providers: []
})
export class SharedModule {}
