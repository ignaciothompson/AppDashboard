import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-widget-clock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="clock-widget text-center text-white h-100 d-flex flex-column justify-content-center align-items-center">
      <h2 class="display-4 fw-bold mb-0">{{ time | date:'shortTime' }}</h2>
      <p class="lead mb-0">{{ time | date:'fullDate' }}</p>
    </div>
  `,
  styles: [`
    .clock-widget {
      background: linear-gradient(135deg, rgba(100,100,255,0.4), rgba(200,100,255,0.4));
      backdrop-filter: blur(5px);
      border-radius: 8px;
    }
  `]
})
export class WidgetClockComponent implements OnInit, OnDestroy {
  time = new Date();
  intervalId: any;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.time = new Date();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}
