import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireFunctions } from '@angular/fire/functions';
import { IRecaptchaResponse } from '../../../../../../models/recaptcha-response.model';

@Component({
  selector: 'home-contact',
  templateUrl: './home-contact.component.html',
  styleUrls: ['./home-contact.component.scss']
})
export class HomeContactComponent implements OnInit {

  contactForm: FormGroup;
  submitText = 'Submit';
  sendingMessage = false;

  constructor(
    private fb: FormBuilder,
    private fns: AngularFireFunctions) { }

  ngOnInit() {
    this.contactForm = this.fb.group({
      name: ['', Validators.compose([Validators.required, Validators.minLength(2)])],
      email: ['', Validators.compose([Validators.required, Validators.email])],
      message: ['', Validators.compose([Validators.required, Validators.minLength(2)])],
      token: [null, Validators.required]
    });
  }

  private contactEmail = this.fns.httpsCallable('contactEmail');

  resolved(captchaResponse: string) {
    return captchaResponse;
  }

  submit() {
    if(this.contactForm.valid) {
      this.submitText = 'Submitting';
      this.sendingMessage = true;
      const { name, email, message, token } = this.contactForm.value;
      this.contactEmail({
        name,
        email,
        message,
        token
      }).subscribe((response: IRecaptchaResponse) => {
        console.log(response);
        if(response.message = "Message Sent") {
          this.submitText = 'Message Submitted';
        } else {
          this.submitText = 'Oops.. That Didn\'t Work';
          this.sendingMessage = false;
        }
      });
    }
  }

}
