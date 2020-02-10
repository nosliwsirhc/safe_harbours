import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-programs',
  templateUrl: './programs-page.component.html',
  styleUrls: ['./programs-page.component.scss']
})
export class ProgramsPageComponent implements OnInit {

  links = [
    {title: 'Frequently Asked Questions', url: '/frequently-asked-questions'},
    {title: 'About Us', url: '/about'}
  ];

  constructor() { }

  ngOnInit() {
  }

}
