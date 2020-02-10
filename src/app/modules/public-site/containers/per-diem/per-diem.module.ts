import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';

import { PerDiemComponent } from './per-diem.component';

const routes: Route[] = [
  { path: '', component: PerDiemComponent }
];

@NgModule({
  declarations: [PerDiemComponent],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class PerDiemModule { }
