import { Component, Output, EventEmitter, Input } from '@angular/core';
import { faFacebook, faTwitterSquare, faInstagram } from '@fortawesome/free-brands-svg-icons';
import { Observable } from 'rxjs';

@Component({
  selector: 'ps-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {

  @Input() isAuth$: Observable<boolean>;
  @Output() login = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  faFacebook = faFacebook;
  faTwitterSquare = faTwitterSquare;
  faInstagram = faInstagram;

}
