import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../services/seo.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(private seoService: SeoService) { }

  ngOnInit() {
    this.seoService.generateTags({
      title: 'Foster Care for Children with Trauma Needs',
      description: 'Our foster homes provide treatment foster care through three trauma focused foster care programs. Each trauma needs program offers highly supportive services.',
      slug: ''
    });
  }

  scrollToElement($element: string): void {
    const element = document.querySelector('#' + $element);
    element.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
  }


}
