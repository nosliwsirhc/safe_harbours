import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  public user: any;
  public authState$: Observable<firebase.User>;

  private loginErrorSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
  public loginError$: Observable<boolean> = this.loginErrorSubject.asObservable();

  redirectUrl = '';

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore
    ) {
      this.authState$ = this.afAuth.authState;
      this.user = this.authState$.pipe(
        switchMap(authState => {
          if(authState) {
            return this.afs.doc(`users/${authState.uid}`).snapshotChanges().pipe(
              map(action => {
                const id = action.payload.id;
                const data = action.payload.data();
                return { ...data, id };
              })
            );
          } else {
            return of(null);
          }
        })
      ).subscribe(user => {
        this.user = user;
      });
  }

  login(email: string, password: string) {
    this.afAuth.auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        this.loginErrorSubject.next(false);
      })
      .catch(() => this.loginErrorSubject.next(true));
  }

  logout() {
    this.afAuth.auth.signOut()
      .then(() => this.loginErrorSubject.next(false));
  }

}
