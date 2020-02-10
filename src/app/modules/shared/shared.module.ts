import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RecaptchaModule } from 'ng-recaptcha';
import { RecaptchaFormsModule } from 'ng-recaptcha/forms';
import { FroalaEditorModule, FroalaViewModule } from 'angular-froala-wysiwyg';
import { AgmCoreModule } from '@agm/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';

import { environment } from '../../../environments/environment';

import { MaterialModule } from './material.module';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FileSizeModule } from 'ngx-filesize';

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
    FroalaEditorModule.forRoot(),
    FroalaViewModule.forRoot(),
    AgmCoreModule.forRoot({ apiKey: environment.agm.apiKey, libraries: ['places'] }),
    FlexLayoutModule,
    FileSizeModule
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
    FroalaEditorModule,
    FroalaViewModule,
    SafeHtmlPipe,
    AgmCoreModule,
    FlexLayoutModule,
    ReadMoreComponent,
    FileSizeModule
  ],
  providers: []
})
export class SharedModule { }
