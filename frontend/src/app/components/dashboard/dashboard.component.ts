import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ApiService, AppItem, Section } from '../../services/api.service';
import { AppTileComponent } from '../app-tile/app-tile.component';
import { EditAppModalComponent } from '../edit-app-modal/edit-app-modal.component';
import { InteractiveDotsComponent } from '../interactive-dots/interactive-dots.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    DragDropModule,
    AppTileComponent, 
    EditAppModalComponent,
    InteractiveDotsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  sections: Section[] = [];
  editMode = false;
  currentTime = new Date();
  
  showModal = false;
  editingItem: AppItem = { name: '', url: '' };
  
  // For connected drag lists
  get connectedTo(): string[] {
      return this.sections.map(s => 'section-' + s.id);
  }

  hostStats: any = null;

  constructor(private api: ApiService, private toastr: ToastrService) {}

  ngOnInit() {
    this.loadSections();
    this.loadStats();
    // Clock tick & Stats Poll
    setInterval(() => {
        this.currentTime = new Date();
    }, 1000);
    
    // Poll stats every 5s
    setInterval(() => {
        this.loadStats();
    }, 5000);
  }

  loadStats() {
      this.api.getHostStats().subscribe(stats => {
          this.hostStats = stats;
          // Calculate RAM %
          if(stats.totalmem && stats.freemem) {
              this.hostStats.memPercent = Math.round(((stats.totalmem - stats.freemem) / stats.totalmem) * 100);
          }
      });
  }

  loadSections() {
    this.api.getSections().subscribe({
      next: (sections) => {
          this.sections = sections;
      },
      error: (err) => this.toastr.error('Failed to load sections')
    });
    this.loadBookmarks();
  }

  loadBookmarks() {
      this.api.getBookmarks().subscribe({
          next: (bookmarks) => this.bookmarks = bookmarks,
          error: (err) => console.error('Failed to load bookmarks')
      });
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    if (!this.editMode) {
        // Maybe save order here if we want batch save? 
        // For now, sorting updates individually on drop.
    }
  }

  // --- DRAG & DROP ---
  drop(event: CdkDragDrop<AppItem[]>, sectionId: number | undefined) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.updateSectionOrder(sectionId, event.container.data);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      // Update both source and target sections
      // We need to find the Previous Section ID too... 
      // Actually, we just need to update the moved item's SectionId and its order
      const movedItem = event.container.data[event.currentIndex];
      movedItem.SectionId = sectionId;
      
      this.api.updateApp(movedItem.id!, movedItem).subscribe(); // Update SectionId
      
      this.updateSectionOrder(sectionId, event.container.data); // Update target order
      // Source order update is implicit or we can Trigger it if we want to fill gaps
    }
  }

  updateSectionOrder(sectionId: number | undefined, items: AppItem[]) {
      items.forEach((item, index) => {
          item.order = index;
          if(item.id) this.api.updateApp(item.id, item).subscribe();
      });
  }

  bookmarks: AppItem[] = [];

  // ... (previous methods)

  dropBookmark(event: CdkDragDrop<AppItem[]>) {
      moveItemInArray(this.bookmarks, event.previousIndex, event.currentIndex);
      this.bookmarks.forEach((item, index) => {
          item.order = index;
          if(item.id) this.api.updateApp(item.id, item).subscribe();
      });
  }

  dropSection(event: CdkDragDrop<Section[]>) {
      moveItemInArray(this.sections, event.previousIndex, event.currentIndex);
      this.sections.forEach((sec, index) => {
          sec.order = index;
          if (sec.id) this.api.updateSection(sec.id, sec).subscribe();
      });
  }

  // --- ACTIONS ---
  openAddModal() {
    this.editingItem = { name: '', url: '' };
    // Default to first section?
    if (this.sections.length > 0) {
        this.editingItem.SectionId = this.sections[0].id;
    } else {
        // If no sections, maybe force create one?
        // Or show error?
        // Let's create a default one on the fly if user adds app
    }
    this.showModal = true;
  }

  addSection() {
      const title = prompt("Section Title:");
      if (title) {
          const newSec: Section = { title, order: this.sections.length };
          this.api.addSection(newSec).subscribe(() => this.loadSections());
      }
  }

  deleteSection(section: Section) {
      if(confirm(`Delete section "${section.title}" and all its apps?`)) {
          if (section.id) this.api.deleteSection(section.id).subscribe(() => this.loadSections());
      }
  }

  openEditModal(item: AppItem) {
    this.editingItem = { ...item };
    this.showModal = true;
  }

  onSaveApp(app: AppItem) {
    if (app.id) {
      this.api.updateApp(app.id, app).subscribe(() => {
        this.loadSections();
        this.loadBookmarks();
        this.showModal = false;
        this.toastr.success('Item updated');
      });
    } else {
      if (app.type === 'bookmark') {
          // Ensure bookmark doesn't have SectionId
          app.SectionId = undefined;
          app.order = this.bookmarks.length;
          this.api.addApp(app).subscribe(() => {
            this.loadBookmarks();
            this.showModal = false;
            this.toastr.success('Bookmark added');
          });
      } else {
        if (!app.SectionId && this.sections.length === 0) {
            // Create default section
            this.api.addSection({ title: 'Main', order: 0 }).subscribe(sec => {
                app.SectionId = sec.id;
                app.order = 0;
                this.createApp(app);
            });
        } else {
            app.order = 999; // append
            this.createApp(app);
        }
      }
    }
  }

  createApp(app: AppItem) {
      this.api.addApp(app).subscribe(() => {
        this.loadSections();
        this.showModal = false;
        this.toastr.success('Item added');
      });
  }

  onDeleteApp(app: AppItem) {
     if (app.id) {
       this.api.deleteApp(app.id).subscribe(() => {
         this.loadSections();
         this.loadBookmarks();
         this.toastr.info('Item deleted');
       });
     }
  }
}
