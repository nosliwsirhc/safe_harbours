import { Injectable } from '@angular/core';
import { CanActivate, CanLoad, ActivatedRouteSnapshot, RouterStateSnapshot, Route } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { map, tap, take } from 'rxjs/operators';
import { LoginModalComponent } from '../components/login-modal/login-modal.component';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanLoad {

  constructor(
    private dialog: MatDialog,
    private authService: AuthenticationService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | boolean {
    const url = state.url;
    return this.isAuth(url);
  }

  canLoad(route: Route) {
    const url = route.path;
    return this.isAuth(url)
  }

  isAuth(url: string): Observable<boolean> {
    return this.authService.authState$.pipe(
      take(1),
      map(auth => !!auth),
      tap(auth => {
        if(!auth) {
          this.authService.redirectUrl = url;
          const dialogRef = this.dialog.open(LoginModalComponent, {
            width: '400px'
          });
        }
      })
    );
  }
}
