import { Component, OnInit, Inject, PLATFORM_ID, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatDialog } from '@angular/material';
import { LoginModalComponent } from '../../components/login-modal/login-modal.component';
import { AuthenticationService } from '../../services/authentication.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router, NavigationEnd } from '@angular/router';

@Component({
    selector: 'public-wrapper',
    templateUrl: './public-site.component.html',
    styleUrls: ['./public-site.component.scss']
})
export class PublicSiteComponent implements OnInit {
    isAuth$: Observable<boolean>;
    private platform: string;
  
    constructor(
      @Inject(PLATFORM_ID) private platformId: Object,
      private authService: AuthenticationService,
      private dialog: MatDialog,
      private router: Router) {
        this.platform = isPlatformBrowser(platformId) ? 'browser' : 'server';
      }
  
    ngOnInit() {
      this.isAuth$ = this.authService.authState$.pipe(
        map(auth => !!auth)
      );
      if(this.platform === 'browser' && !isDevMode()) {
        this.router.events.subscribe(event => {
          if (event instanceof NavigationEnd) {
            (<any>window).ga('set', 'page', event.urlAfterRedirects);
            (<any>window).ga('send', 'pageview');
          }
        });
      }
    }
  
    login(): void {
      const dialogRef = this.dialog.open(LoginModalComponent, {
        width: '400px',
      });
    }
  
    logout(): void {
      this.authService.logout();
    }
}