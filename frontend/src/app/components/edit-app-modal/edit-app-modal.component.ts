import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, AppItem } from '../../services/api.service';

@Component({
  selector: 'app-edit-app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-app-modal.component.html',
  styleUrls: ['./edit-app-modal.component.css']
})
export class EditAppModalComponent {
  @Input() app: AppItem = { name: '', url: '' };
  @Output() saveApp = new EventEmitter<AppItem>();
  @Output() cancel = new EventEmitter<void>();

  iconType: 'url' | 'file' | 'dashboard' = 'url';
  appType: 'app' | 'bookmark' = 'app';
  uploading = false;
  
  // Dashboard Icons
  iconSearchQuery = '';
  iconSearchResults: string[] = [];
  isLoadingIcons = false;
  private readonly CDN_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg';
  
  // Common icon names for quick access
  private commonIcons = [
    'youtube', 'netflix', 'spotify', 'plex', 'jellyfin', 'radarr', 'sonarr', 'qbittorrent',
    'github', 'gitlab', 'docker', 'kubernetes', 'nginx', 'apache', 'mysql', 'postgresql',
    'redis', 'mongodb', 'elasticsearch', 'grafana', 'prometheus', 'home-assistant',
    'nextcloud', 'synology', 'unraid', 'proxmox', 'cloudflare', 'aws', 'azure', 'gcp',
    'discord', 'slack', 'telegram', 'twitter', 'facebook', 'instagram', 'linkedin',
    'reddit', 'twitch', 'steam', 'epic-games', 'nvidia', 'amd', 'intel',
    'windows', 'linux', 'macos', 'ubuntu', 'debian', 'fedora', 'arch-linux',
    'vscode', 'vim', 'sublime-text', 'notion', 'obsidian', 'jira', 'confluence',
    'wordpress', 'joomla', 'drupal', 'ghost', 'medium', 'dev-to', 'stack-overflow'
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
      if (this.app.type) {
          this.appType = this.app.type;
      }
      // If icon is from dashboard-icons CDN, set iconType to dashboard
      if (this.app.icon && this.app.icon.includes('cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons')) {
          this.iconType = 'dashboard';
          // Extract icon name from URL
          const match = this.app.icon.match(/svg\/([^/]+)\.svg/);
          if (match) {
              this.iconSearchQuery = match[1].replace(/-light|-dark$/, '');
          }
      } else if (this.app.name && !this.app.icon) {
          // Auto-suggest icon based on app name
          const suggestedIcon = this.app.name.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
          if (suggestedIcon && this.commonIcons.includes(suggestedIcon)) {
              this.iconSearchQuery = suggestedIcon;
          }
      }
  }
  
  onIconSearch() {
      if (!this.iconSearchQuery.trim()) {
          this.iconSearchResults = [];
          return;
      }
      
      const query = this.iconSearchQuery.toLowerCase().trim();
      this.isLoadingIcons = true;
      
      // Search through common icons first
      const matched = this.commonIcons.filter(icon => 
          icon.includes(query) || query.includes(icon)
      );
      
      // Also try to construct icon name from app name if available
      if (this.app.name) {
          const appNameIcon = this.app.name.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
          if (appNameIcon && !matched.includes(appNameIcon)) {
              matched.unshift(appNameIcon);
          }
      }
      
      // Add the search query itself as a potential icon name
      const searchIcon = query.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (searchIcon && !matched.includes(searchIcon)) {
          matched.unshift(searchIcon);
      }
      
      // Limit results and verify icons exist
      this.iconSearchResults = matched.slice(0, 20);
      this.verifyIcons();
  }
  
  verifyIcons() {
      // Verify icons exist by checking if they load
      const verified: string[] = [];
      let checked = 0;
      
      this.iconSearchResults.forEach(iconName => {
          const iconUrl = `${this.CDN_BASE}/${iconName}.svg`;
          const img = new Image();
          img.onload = () => {
              if (!verified.includes(iconName)) {
                  verified.push(iconName);
              }
              checked++;
              if (checked === this.iconSearchResults.length) {
                  this.iconSearchResults = verified;
                  this.isLoadingIcons = false;
              }
          };
          img.onerror = () => {
              checked++;
              if (checked === this.iconSearchResults.length) {
                  this.iconSearchResults = verified;
                  this.isLoadingIcons = false;
              }
          };
          img.src = iconUrl;
      });
      
      if (this.iconSearchResults.length === 0) {
          this.isLoadingIcons = false;
      }
  }
  
  onIconTypeChange() {
      if (this.iconType === 'dashboard') {
          // If no search query but we have app name, try to auto-suggest
          if (!this.iconSearchQuery && this.app.name) {
              const suggestedIcon = this.app.name.toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/^-|-$/g, '');
              if (suggestedIcon) {
                  this.iconSearchQuery = suggestedIcon;
              }
          }
          if (this.iconSearchQuery) {
              this.onIconSearch();
          }
      }
  }
  
  selectDashboardIcon(iconName: string) {
      this.app.icon = `${this.CDN_BASE}/${iconName}.svg`;
      this.iconSearchQuery = iconName;
  }
  
  getIconUrl(iconName: string): string {
      return `${this.CDN_BASE}/${iconName}.svg`;
  }

  close() {
    this.cancel.emit();
  }

  save() {
    if (this.app.name && this.app.url) {
      if (!/^https?:\/\//i.test(this.app.url)) {
        this.app.url = 'https://' + this.app.url;
      }
      this.app.type = this.appType;
      this.saveApp.emit(this.app);
    }
  }

  onFileSelected(event: any) {
      const file: File = event.target.files[0];
      if (file) {
          this.uploading = true;
          this.api.uploadIcon(file).subscribe({
              next: (response) => {
                  this.app.icon = this.api['apiUrl'].replace('/api', '') + response.url; // Hacky full path construction, or just use relative
                  // Better: Just store relative path and let base tag or logic handle it, but for now absolute is safer if we want to preview it easily
                  // Actually, let's just assume the server serves it at localhost:3000/uploads/...
                  // But we are on frontend. 
                  // Let's just store the relative path returned by server: /uploads/filename
                  // And prepending the server origin when displaying if needed? 
                  // Or store full URL if we can.
                  // For simplicity:
                  this.app.icon = 'http://localhost:3000' + response.url; 
                  this.uploading = false;
              },
              error: () => {
                  alert('Upload failed');
                  this.uploading = false;
              }
          });
      }
  }
}
