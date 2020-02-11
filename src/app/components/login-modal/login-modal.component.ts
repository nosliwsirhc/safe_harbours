import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthenticationService } from '../../services/authentication.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {

  loginForm: FormGroup;
  loginError$: Observable<boolean>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthenticationService,
    public dialogRef: MatDialogRef<LoginModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit() {
    this.loginError$ = this.authService.loginError$;
    this.loginForm = this.fb.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.compose([Validators.required, Validators.minLength(6)])]
    });
    this.authService.authState$.subscribe(auth => {
      if(!!auth) {
        this.closeModal();
      }
    });
  }

  login() {
    if(this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password);
    }
  }

  closeModal() {
    this.dialogRef.close();
  }

}
