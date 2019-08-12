import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { MatProgressBarModule, MatCardModule } from '@angular/material';

@NgModule({
  declarations: [ProgressBarComponent],
  exports: [ProgressBarComponent],
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatCardModule
  ]
})
export class CommonComponentsModule { }
