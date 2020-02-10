import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../../../services/seo.service';

@Component({
  selector: 'app-behavioural',
  templateUrl: './behavioural.component.html',
  styleUrls: ['./behavioural.component.scss']
})
export class BehaviouralComponent implements OnInit {

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Behavioural Foster Care Program for Children',
      description: 'Many children in foster care have experienced complex trauma. Our behavioural focused foster care program prevents these kids getting moved from home to home.',
      slug: 'programs/behavioural-foster-care'
    })
  }

}
