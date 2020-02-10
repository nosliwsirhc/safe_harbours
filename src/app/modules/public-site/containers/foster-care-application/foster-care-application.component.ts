import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AngularFireFunctions } from '@angular/fire/functions';
import { SeoService } from '../../../../services/seo.service';

interface RecaptchaResponse {
  success: boolean;
  message: string;
}

@Component({
  selector: 'app-foster-care-application',
  templateUrl: './foster-care-application.component.html',
  styleUrls: ['./foster-care-application.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FosterCareApplicationComponent implements OnInit {

  public links = [
    {title: 'Contact Us', url: '/contact'},
    {title: 'Becoming a Foster Parent in Ontario', url: '/news/becoming-a-foster-parent-in-ontario'},
    {title: 'Foster Care Programs', url: '/programs/mainstream-foster-care'},
    {title: 'Frequently Asked Questions', url: '/frequently-asked-questions'}
  ];

  applicationForm: FormGroup;
  submitText = 'Submit';
  applicationSent = false;  

  constructor(
    private fb: FormBuilder,
    private fns: AngularFireFunctions,
    private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Foster Home Application Inquiry',
      description: 'Apply to become a foster home with our online pre-screening tool. Your submission will be reviewed and you will be contacted.',
      slug: 'apply-to-foster'
    })
    this.applicationForm = this.initForm();
    this.applicationForm.valueChanges.subscribe(values => {
      const numberOfChildren = parseInt(values.numberChildren, 10);
      if (numberOfChildren > values.children.length) {
        this.addChild();
      } else if (numberOfChildren < values.children.length) {
        this.removeChild();
      }
    });
  }

  initForm() {
    return this.fb.group({
      firstName: ['', Validators.compose([Validators.required, Validators.minLength(2), Validators.maxLength(32)])],
      lastName: ['', Validators.compose([Validators.required, Validators.minLength(2), Validators.maxLength(32)])],
      city: ['', Validators.compose([Validators.required])],
      phone: ['', Validators.compose([Validators.maxLength(12)])],
      email: ['', Validators.compose([Validators.required, Validators.email])],
      homeType: ['Single Family Home', Validators.compose([Validators.required])],
      numberFreeRooms: [1, Validators.compose([Validators.required, Validators.min(0), Validators.max(10)])],
      numberAdults: [2, Validators.compose([Validators.required, Validators.min(2), Validators.max(4)])],
      numberChildren: [0, Validators.compose([Validators.required, Validators.min(0), Validators.max(4)])],
      children: this.fb.array([]),
      clearPoliceRecord: [false, Validators.compose([Validators.required, Validators.requiredTrue])],
      clearChildWelfareRecord: [false, Validators.compose([Validators.required, Validators.requiredTrue])],
      clearHealth: [false, Validators.compose([Validators.required, Validators.requiredTrue])],
      currentlyFostering: [false, Validators.compose([Validators.required])],
      motivation: ['', Validators.compose([Validators.required, Validators.minLength(2)])],
      education: ['', Validators.compose([Validators.required])],
      experience: ['', Validators.compose([Validators.maxLength(2250)])],
      identityDisclaimer: [false, Validators.compose([Validators.required, Validators.requiredTrue])],
      token: [null, Validators.compose([Validators.required])]
    });
  }

  get children() {
    return this.applicationForm.get('children') as FormArray;
  }

  initChild(): FormGroup {
    return this.fb.group({
      age: [0, Validators.compose([Validators.required, Validators.min(0), Validators.max(99)])],
      gender: ['', Validators.compose([Validators.required])],
      livesAtHome: [true, Validators.compose([Validators.required])]
    });
  }

  addChild(): void {
    const children = this.applicationForm.get('children') as FormArray;
    children.push(this.initChild());
  }

  removeChild(): void {
    const children = this.applicationForm.get('children') as FormArray;
    children.removeAt(children.length - 1);
  }

  private applicationEmail = this.fns.httpsCallable('applicationEmail');

  resolved(captchaResponse: string) {
    return captchaResponse;
  }

  submit() {
    if(this.applicationForm.valid) {
      this.submitText = 'Submitting';
      this.applicationSent = true;
      this.applicationEmail(this.applicationForm.value).subscribe((response: RecaptchaResponse) => {
        console.log(response);
        if(response.message = "Application Sent") {
          this.submitText = 'Application Submitted';
        } else {
          this.submitText = 'Oops.. That Didn\'t Work';
          this.applicationSent = false;
        }
      });
    }
  }

}
