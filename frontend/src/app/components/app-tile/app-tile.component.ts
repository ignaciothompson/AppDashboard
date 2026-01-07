import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppItem } from '../../services/api.service';

@Component({
  selector: 'app-app-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-tile.component.html',
  styleUrls: ['./app-tile.component.css']
})
export class AppTileComponent {
  @Input() app!: AppItem;
  @Input() editMode: boolean = false;
  @Output() edit = new EventEmitter<AppItem>();
  @Output() delete = new EventEmitter<AppItem>();

  imageError = false;

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
