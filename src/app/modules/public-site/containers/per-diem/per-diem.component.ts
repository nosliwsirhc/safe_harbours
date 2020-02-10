import { Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../services/seo.service';

@Component({
  selector: 'per-diem',
  templateUrl: './per-diem.component.html',
  styleUrls: ['./per-diem.component.scss']
})
export class PerDiemComponent implements OnInit {

  constructor(private seo: SeoService) { }

  ngOnInit() {
    this.seo.generateTags({
      title: 'Foster Care Per Diem',
      description: 'How are foster parents paid? What should a foster parent spend on the foster children? Learn about the Safe Harbours foster care per diem.',
      slug: 'foster-care-per-diem'
    })
  }
                    
}
