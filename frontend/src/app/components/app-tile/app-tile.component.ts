import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppItem } from '../../services/api.service';
import { IntegrationService, AppStatus } from '../../services/integration.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-app-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-tile.component.html',
  styleUrls: ['./app-tile.component.css']
})
export class AppTileComponent implements OnInit, OnDestroy {
  @Input() app!: AppItem;
  @Input() editMode: boolean = false;
  @Output() edit = new EventEmitter<AppItem>();
  @Output() delete = new EventEmitter<AppItem>();

  imageError = false;
  appStatus: AppStatus | null = null;
  private statusSub?: Subscription;

  constructor(private integrationService: IntegrationService) {}

  ngOnInit() {
    // Subscribe to status updates
    this.statusSub = this.integrationService.status$.subscribe(statusMap => {
      if (this.app.id && statusMap.has(this.app.id)) {
        this.appStatus = statusMap.get(this.app.id) || null;
      }
    });

    // Check status on init only if health check is enabled
    if (this.app.url && this.app.healthCheck !== false) {
      this.checkStatus();
    }
  }

  ngOnDestroy() {
    this.statusSub?.unsubscribe();
  }

  checkStatus() {
    this.integrationService.checkAppStatus(this.app).subscribe();
  }

  get isOnline(): boolean {
    return this.appStatus?.online ?? false;
  }

  get hasStatus(): boolean {
    return this.appStatus !== null;
  }

  onError() {
    this.imageError = true;
  }

  onEdit(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.edit.emit(this.app);
  }

  onDelete(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if(confirm('Delete ' + this.app.name + '?')) {
      this.delete.emit(this.app);
    }
  }
}
