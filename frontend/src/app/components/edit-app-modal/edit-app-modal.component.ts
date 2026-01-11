import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, AppItem } from '../../services/api.service';
import { APP_TEMPLATES, AppTemplate, ConfigField, getTemplateById } from '../../models/app-templates';
import { FilterPipe } from '../../pipes/filter.pipe';

@Component({
  selector: 'app-edit-app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterPipe],
  templateUrl: './edit-app-modal.component.html',
  styleUrls: ['./edit-app-modal.component.css']
})
export class EditAppModalComponent implements OnInit {
  @Input() app: AppItem = { name: '', url: '' };
  @Input() sections: import('../../services/api.service').Section[] = [];
  @Output() saveApp = new EventEmitter<{ app: AppItem, file?: File }>();
  @Output() deleteApp = new EventEmitter<AppItem>();
  @Output() cancel = new EventEmitter<void>();

  selectedFile: File | undefined;

  iconType: 'url' | 'file' | 'dashboard' | 'template' = 'dashboard';
  appType: 'app' | 'bookmark' = 'app';
  uploading = false;
  iconError = false;
  
  // Templates
  templates = APP_TEMPLATES;
  selectedTemplate: AppTemplate | null = null;
  appConfig: Record<string, string> = {};
  
  // Dashboard Icons
  iconSearchQuery = '';
  iconSearchResults: string[] = [];
  isLoadingIcons = false;
  private readonly CDN_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg';
  
  private commonIcons = [
    'youtube', 'netflix', 'spotify', 'plex', 'jellyfin', 'radarr', 'sonarr', 'qbittorrent',
    'github', 'gitlab', 'docker', 'kubernetes', 'nginx', 'apache', 'mysql', 'postgresql',
    'redis', 'mongodb', 'elasticsearch', 'grafana', 'prometheus', 'home-assistant',
    'nextcloud', 'synology', 'unraid', 'proxmox', 'cloudflare', 'aws', 'azure', 'gcp',
    'discord', 'slack', 'telegram', 'twitter', 'facebook', 'instagram', 'linkedin',
    'reddit', 'twitch', 'steam', 'epic-games', 'nvidia', 'amd', 'intel',
    'windows', 'linux', 'macos', 'ubuntu', 'debian', 'fedora', 'arch-linux',
    'vscode', 'vim', 'sublime-text', 'notion', 'obsidian', 'jira', 'confluence',
    'wordpress', 'joomla', 'drupal', 'ghost', 'medium', 'dev-to', 'stack-overflow',
    'prowlarr', 'lidarr', 'readarr', 'bazarr', 'overseerr', 'jellyseerr', 'tautulli',
    'portainer', 'traefik', 'caddy', 'pihole', 'adguard-home', 'wireguard', 'tailscale'
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    // Load existing app type
    if (this.app.type) {
      this.appType = this.app.type;
    }
    
    // Load existing config
    if (this.app.config) {
      this.appConfig = { ...this.app.config };
    }
    
    // Load existing template
    if (this.app.templateId) {
      this.selectedTemplate = getTemplateById(this.app.templateId) || null;
      this.iconType = 'template';
    } else if (this.app.icon?.includes('cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons')) {
      this.iconType = 'dashboard';
      const match = this.app.icon.match(/svg\/([^/]+)\.svg/);
      if (match) {
        this.iconSearchQuery = match[1].replace(/-light|-dark$/, '');
      }
    } else if (this.app.icon) {
      this.iconType = 'url';
    } else if (this.app.name && !this.app.icon) {
      this.iconType = 'dashboard';
      const suggestedIcon = this.app.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (this.commonIcons.includes(suggestedIcon)) {
        this.iconSearchQuery = suggestedIcon;
      }
    }
  }

  // Template Selection
  onTemplateSelect(templateId: string) {
    if (!templateId) {
      this.selectedTemplate = null;
      this.iconType = 'dashboard';
      return;
    }
    
    const template = getTemplateById(templateId);
    if (template) {
      this.selectedTemplate = template;
      this.app.name = template.name;
      this.app.icon = template.icon;
      this.app.iconUrl = template.icon;
      this.app.templateId = template.id;
      this.iconType = 'template';
      this.iconError = false;
      
      // Initialize config fields with empty values
      if (template.configFields) {
        template.configFields.forEach((field: ConfigField) => {
          if (!(field.key in this.appConfig)) {
            this.appConfig[field.key] = '';
          }
        });
      }
    }
  }

  clearTemplate() {
    this.selectedTemplate = null;
    this.app.templateId = undefined;
    this.iconType = 'dashboard';
  }

  get hasConfigFields(): boolean {
    return !!this.selectedTemplate?.configFields?.length;
  }
  
  // Icon Search
  onIconSearch() {
    if (!this.iconSearchQuery.trim()) {
      this.iconSearchResults = [];
      return;
    }
    
    const query = this.iconSearchQuery.toLowerCase().trim();
    this.isLoadingIcons = true;
    
    const matched = this.commonIcons.filter(icon => 
      icon.includes(query) || query.includes(icon)
    );
    
    if (this.app.name) {
      const appNameIcon = this.app.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (appNameIcon && !matched.includes(appNameIcon)) {
        matched.unshift(appNameIcon);
      }
    }
    
    const searchIcon = query.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (searchIcon && !matched.includes(searchIcon)) {
      matched.unshift(searchIcon);
    }
    
    this.iconSearchResults = matched.slice(0, 20);
    this.verifyIcons();
  }
  
  verifyIcons() {
    const verified: string[] = [];
    let checked = 0;
    
    this.iconSearchResults.forEach(iconName => {
      const iconUrl = `${this.CDN_BASE}/${iconName}.svg`;
      const img = new Image();
      img.onload = () => {
        if (!verified.includes(iconName)) verified.push(iconName);
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
      if (!this.iconSearchQuery && this.app.name) {
        const suggestedIcon = this.app.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        if (suggestedIcon) this.iconSearchQuery = suggestedIcon;
      }
      if (this.iconSearchQuery) this.onIconSearch();
    }
    this.iconError = false;
  }
  
  selectDashboardIcon(iconName: string) {
    const iconUrl = `${this.CDN_BASE}/${iconName}.svg`;
    this.app.icon = iconUrl;
    this.app.iconUrl = iconUrl;
    this.iconSearchQuery = iconName;
    this.iconError = false;
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
      
      // Sync icon to iconUrl for all icon types
      if ((this.iconType === 'url' || this.iconType === 'dashboard' || this.iconType === 'template') && this.app.icon) {
        this.app.iconUrl = this.app.icon;
      }
      
      // Save config if template has fields
      if (this.selectedTemplate?.configFields?.length) {
        this.app.config = { ...this.appConfig };
        this.app.templateId = this.selectedTemplate.id;
      }
      
      this.saveApp.emit({ app: this.app, file: this.selectedFile });
    }
  }

  onDelete() {
    if (this.app.id && confirm(`Are you sure you want to delete "${this.app.name}"?`)) {
      this.deleteApp.emit(this.app);
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.app.icon = e.target.result;
        this.iconError = false;
      };
      reader.readAsDataURL(file);
    }
  }
}
