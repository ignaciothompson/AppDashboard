import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService, Section } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.css']
})
export class SettingsModalComponent {
  @Input() sections: Section[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() sectionsUpdated = new EventEmitter<void>();

  constructor(private api: ApiService, private toastr: ToastrService) {}

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.sections, event.previousIndex, event.currentIndex);
    this.saveOrder();
  }

  saveOrder() {
    this.sections.forEach((sec, index) => {
        sec.order = index;
        if (sec.id) this.api.updateSection(sec.id, sec).subscribe();
    });
    // We don't necessarily need to reload sections here if we just updated order locally, 
    // but the parent might want to know to refresh.
    // Actually, local update is enough for UI, but let's emit event.
    this.sectionsUpdated.emit();
  }

  addSection() {
    const title = prompt("New Section Title:");
    if (title) {
      const newSec: Section = { title, order: this.sections.length };
      this.api.addSection(newSec).subscribe(() => {
        this.toastr.success('Section added');
        this.sectionsUpdated.emit();
      });
    }
  }

  renameSection(section: Section) {
    const newTitle = prompt("Rename Section:", section.title);
    if (newTitle && newTitle !== section.title && section.id) {
      section.title = newTitle;
      this.api.updateSection(section.id, section).subscribe(() => {
        this.toastr.success('Section renamed');
        this.sectionsUpdated.emit();
      });
    }
  }

  deleteSection(section: Section) {
    if (confirm(`Delete section "${section.title}" and all its apps?`)) {
        if (section.id) {
            this.api.deleteSection(section.id).subscribe(() => {
                this.toastr.info('Section deleted');
                this.sectionsUpdated.emit();
            });
        }
    }
  }

  moveUp(index: number) {
      if(index > 0) {
          moveItemInArray(this.sections, index, index - 1);
          this.saveOrder();
      }
  }

  moveDown(index: number) {
      if(index < this.sections.length - 1) {
          moveItemInArray(this.sections, index, index + 1);
          this.saveOrder();
      }
  }
}
