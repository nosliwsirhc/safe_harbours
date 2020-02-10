import { NgModule } from '@angular/core';
import { BrowserModule, BrowserTransferStateModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { HttpModule } from '@angular/http';
import { TransferHttpCacheModule } from '@nguniversal/common';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { AngularFireModule } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { AngularFireStorageModule, StorageBucket } from '@angular/fire/storage';
import { AngularFirestoreModule, FirestoreSettingsToken } from '@angular/fire/firestore';
import { AuthenticationService } from '../../services/authentication.service';
import { SeoService } from '../../services/seo.service';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginModalComponent } from '../../components/login-modal/login-modal.component';

@NgModule({
    declarations: [LoginModalComponent],
    imports: [
        AngularFireModule.initializeApp(environment.firebase),
        AngularFirestoreModule,
        AngularFireAuthModule,
        AngularFireStorageModule,
        AngularFireFunctionsModule,
        BrowserModule.withServerTransition({ appId: 'safeharbours' }),
        BrowserTransferStateModule,
        BrowserAnimationsModule,
        TransferHttpCacheModule,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
        MatButtonModule,
        MatDialogModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        HttpModule
    ],
    exports: [
        AngularFireModule,
        AngularFirestoreModule,
        AngularFireAuthModule,
        AngularFireStorageModule,
        AngularFireFunctionsModule,
        BrowserModule,
        BrowserTransferStateModule,
        BrowserAnimationsModule,
        TransferHttpCacheModule,
        ServiceWorkerModule,
        MatButtonModule,
        MatDialogModule,
        LoginModalComponent,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        HttpModule
    ],
    providers: [
        AuthenticationService,
        SeoService,
        { provide: StorageBucket, useValue: 'safeharbours-ontario-articles' },
        { provide: FirestoreSettingsToken, useValue: {} }
    ],
    entryComponents: [LoginModalComponent]
})
export class CoreModule { }