import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireFunctions } from '@angular/fire/functions';
import { SeoService } from '../../../../services/seo.service';
import { IRecaptchaResponse } from '../../../../models/recaptcha-response.model';

@Component({
  selector: 'contact-page',
  templateUrl: './contact-page.component.html',
  styleUrls: ['./contact-page.component.scss']
})
export class ContactPageComponent implements OnInit {

  public links = [
    {title: 'About Us', url: '/about'},
    {title: 'Foster Parent Application', url: '/apply-to-foster'}
  ];

  contactForm: FormGroup;
  submitText = 'Submit';
  sendingMessage = false;

  constructor(
    private seo: SeoService,
    private fb: FormBuilder,
    private fns: AngularFireFunctions) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Contact Us About Fostering',
      description: 'Foster care can be confusing. Ask us a question and we will get back to you within 24 hours. No question is too small or too big.',
      slug: 'contact'
    });
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
          this.sendingMessage = false;
          this.contactForm.reset();
        } else {
          this.submitText = 'Oops.. That Didn\'t Work';
          this.sendingMessage = false;
        }
      });
    }
  }

}
