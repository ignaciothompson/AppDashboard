import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, AppItem, Section } from '../../services/api.service';
import { AppTileComponent } from '../app-tile/app-tile.component';
import { EditAppModalComponent } from '../edit-app-modal/edit-app-modal.component';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { InteractiveDotsComponent } from '../interactive-dots/interactive-dots.component';
import { RightSidebarComponent } from '../right-sidebar/right-sidebar.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    AppTileComponent, 
    EditAppModalComponent,
    SettingsModalComponent,
    InteractiveDotsComponent,
    RightSidebarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  sections: Section[] = [];
  editMode = false;
  currentTime = new Date();
  
  showModal = false;
  showSettingsModal = false;
  showSidebar = false;
  editingItem: AppItem = { name: '', url: '' };

  hostStats: any = null;
  bookmarks: AppItem[] = [];

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
    this.api.getDashboardData().subscribe({
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
          error: (err) => console.error('Failed to load bookmarks', err)
      });
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
  }

  // --- ACTIONS ---
  openAddModal() {
    this.editingItem = { name: '', url: '' };
    // Default to first section
    if (this.sections.length > 0) {
        this.editingItem.section = this.sections[0].id;
    }
    this.showModal = true;
  }

  openSettingsModal() {
      this.showSettingsModal = true;
  }

  onSettingsClose() {
      this.showSettingsModal = false;
      this.loadSections(); // Refresh in case reordered/renamed/deleted
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

  onSaveApp(event: any) {
    let app: AppItem;
    let file: File | undefined;

    if (event.app) {
        app = event.app;
        file = event.file;
    } else {
        app = event;
    }

    if (app.id) {
      this.api.updateApp(app.id, app, file).subscribe(() => {
        this.loadSections();
        this.loadBookmarks();
        this.showModal = false;
        this.toastr.success('Item updated');
      });
    } else {
      if (app.type === 'bookmark') {
          // Ensure bookmark doesn't have SectionId
          app.section = undefined;
          app.order = this.bookmarks.length;
          this.api.addApp(app, file).subscribe(() => {
            this.loadBookmarks();
            this.showModal = false;
            this.toastr.success('Bookmark added');
          });
      } else {
        if (!app.section && this.sections.length === 0) {
            // Create default section
            this.api.addSection({ title: 'Main', order: 0 }).subscribe(sec => {
                app.section = sec.id;
                app.order = 0;
                this.createApp(app, file);
            });
        } else {
            app.order = 999; // append
            this.createApp(app, file);
        }
      }
    }
  }

  createApp(app: AppItem, file?: File) {
      this.api.addApp(app, file).subscribe(() => {
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

  trackById(index: number, item: any): string | number {
    return item.id || index;
  }
}
