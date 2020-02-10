import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../services/seo.service';

@Component({
  selector: 'app-stories',
  templateUrl: './stories.component.html',
  styleUrls: ['./stories.component.scss']
})
export class StoriesComponent implements OnInit {

  public links = [
    {title: 'About Us', url: '/about'},
    {title: 'Foster Care Programs', url: '/programs/mainstream-foster-care'},
    {title: 'Foster Care Crisis in Ontario', url: '/news/foster-care-crisis-ontario'}
  ];

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Foster Care Stories About Children and Family',
      description: 'Foster children coming into foster care need a loving family. Safe Harbours strives for the best outcomes for our children and families.',
      slug: 'foster-care-stories'
    })
  }

}
