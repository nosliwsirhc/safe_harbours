import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'read-more',
  templateUrl: './read-more.component.html',
  styleUrls: ['./read-more.component.scss']
})
export class ReadMoreComponent implements OnInit {

  @Input()
  links: {title: string, url: string}[];

  constructor() { }

  ngOnInit() {
  }

}
