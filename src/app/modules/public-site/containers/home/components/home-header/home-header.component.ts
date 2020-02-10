import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'home-header',
  templateUrl: './home-header.component.html',
  styleUrls: ['./home-header.component.scss']
})
export class HomeHeaderComponent {

  @Output() scrollTo = new EventEmitter<string>();

}
