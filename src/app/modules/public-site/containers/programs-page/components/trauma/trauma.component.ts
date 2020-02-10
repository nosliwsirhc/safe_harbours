import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../../../services/seo.service';

@Component({
  selector: 'app-trauma',
  templateUrl: './trauma.component.html',
  styleUrls: ['./trauma.component.scss']
})
export class TraumaComponent implements OnInit {

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Trauma Focused Foster Care Program',
      description: 'Our trauma focused foster care program trains foster parents and caregivers how to identify and trauma and provide the most appropriate care.',
      slug: 'programs/trauma-focused-foster-care'
    })
  }

}
