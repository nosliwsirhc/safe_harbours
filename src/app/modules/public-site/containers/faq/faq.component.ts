import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../services/seo.service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {

  public links = [
    {title: 'Foster Care Programs', url: '/programs/mainstream-foster-care'},
    {title: 'Contact Us', url: '/contact'}
  ];

  step = 0;

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Foster Care Frequently Asked Questions',
      description: 'How do people become foster parents? What is the per diem? Is my home big enough? Find out more about Safe Harbours and becoming foster parents.',
      slug: 'frequently-asked-questions'
    })
  }

  setStep(index: number) {
    this.step = index;
  }

  nextStep() {
    this.step++;
  }

  prevStep() {
    this.step--;
  }

}
