import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../../../services/seo.service';

@Component({
  selector: 'app-mainstream',
  templateUrl: './mainstream.component.html',
  styleUrls: ['./mainstream.component.scss']
})
export class MainstreamComponent implements OnInit {

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Foster Care Program for Lower Needs Children',
      description: 'Our mainstream program provides foster care provides care for children with lower needs. Foster homes and children still receive a high level of support.',
      slug: 'programs/mainstream-foster-care'
    })
  }

}
