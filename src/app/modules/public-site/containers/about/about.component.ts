import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../services/seo.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  public links = [
    {title: 'Foster Care Programs', url: '/programs/mainstream-foster-care'},
    {title: 'FAQ', url: '/frequently-asked-questions'},
    {title: 'News', url: '/news'}
  ];

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'About Our Foster Care Agency, Children and Home',
      description: 'Safe Harbours is Ontario\'s first trauma-focused foster care agency. Our homes strive for the best possible outcomes for our children and youth.',
      slug: 'about'
    })
  }

}
