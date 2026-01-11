import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, catchError } from 'rxjs';
import PocketBase from 'pocketbase';

export interface AppItem {
  id?: string; // PB uses string IDs
  name: string;
  url: string;
  icon?: string;
  iconUrl?: string; // PB might return this or we construct it
  order?: number;
  section?: string; // Relation ID
  type?: 'app' | 'bookmark';
  templateId?: string; // Reference to app template
  config?: Record<string, string>; // Template-specific configuration
  healthCheck?: boolean; // Enable/disable status ping
}

export interface Section {
    id?: string;
    title: string;
    order?: number;
    AppItems?: AppItem[];
    expand?: { apps_via_section?: AppItem[] }; // PocketBase expansion
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private pb = new PocketBase('https://addb.ignaciothompson.com');
  
  // Legacy Backend URL for Proxy/Stats only
  private get backendUrl(): string {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    return '/api'; 
  }

  constructor(private http: HttpClient) { }

  // --- SECTIONS ---
  getSections(): Observable<Section[]> {
      return from(this.pb.collection('sections').getFullList({
          sort: 'order',
          $autoCancel: false,
          // We need to fetch apps related to sections.
          // PocketBase Relation: 'apps' collection has 'section' field.
          // To get reverse relation, we usually need to fetch apps and map them, 
          // OR if we defined a Back-Relation in 'sections' (not standard in base PB without view).
          // EASIEST: Fetch Sections, then Fetch Apps, and map manually in frontend, or Promise.all.
          // PB doesn't auto-expand reverse relations efficiently in one go unless structured differently.
          // Strategy: Fetch Sections, Fetch All Apps (expanded), Map locally.
      })).pipe(
          map(sections => {
              return sections.map(s => ({
                  id: s.id,
                  title: s['title'],
                  order: s['order'],
                  AppItems: [] // Will populate
              }));
          }),
          // Chain to get apps
          map(sections => {
               // This is tricky in Observable chain without switchMap. 
               // Let's refactor to just return sections, and let a separate call handle apps?
               // Or simpler: Use a Promise-based approach wrapped in Observable since PB is Promise-based.
               return sections;
          })
      ).pipe(
          catchError(err => {
              console.error('getSections Error:', err);
              throw err;
          })
      );
  }

  // COMPLETE DATA LOAD (Sections + Apps)
  // Replaces getSections for the dashboard
  getDashboardData(): Observable<Section[]> {
      return from(Promise.all([
          this.pb.collection('sections').getFullList({ sort: 'order', $autoCancel: false }),
          this.pb.collection('apps').getFullList({ sort: 'order', filter: 'type = "app"', $autoCancel: false })
      ])).pipe(
          map(([pbSections, pbApps]) => {
              const sections: Section[] = pbSections.map(s => ({
                  id: s.id,
                  title: s['title'],
                  order: s['order'],
                  AppItems: []
              }));

              pbApps.forEach(app => {
                  const sec = sections.find(s => s.id === app['section']);
                  if (sec) {
                      sec.AppItems?.push(this.mapPbApp(app));
                  }
              });
              return sections;
          })
      );
  }

  private mapPbApp(record: any): AppItem {
      // Icon handling: if 'icon' file exists, construct URL. Else use iconUrl.
      let icon = record['iconUrl'];
      if (record['icon']) {
          icon = this.pb.files.getURL(record, record['icon']);
      }

      // Parse config JSON if present
      let config: Record<string, string> | undefined;
      if (record['config']) {
          try {
              config = typeof record['config'] === 'string' 
                  ? JSON.parse(record['config']) 
                  : record['config'];
          } catch (e) {
              console.warn('Failed to parse app config:', e);
          }
      }

      return {
          id: record.id,
          name: record['name'],
          url: record['url'],
          icon: icon,
          order: record['order'],
          section: record['section'],
          type: record['type'],
          templateId: record['templateId'],
          config: config,
          healthCheck: record['healthCheck'] ?? true // Default to true
      };
  }

  // --- BOOKMARKS ---
  getBookmarks(): Observable<AppItem[]> {
      return from(this.pb.collection('apps').getFullList({
          sort: 'order',
          filter: 'type = "bookmark"',
          $autoCancel: false
      })).pipe(
          map(records => records.map(r => this.mapPbApp(r)))
      );
  }

  addSection(section: Section): Observable<Section> {
      return from(this.pb.collection('sections').create(section)).pipe(map(r => ({ ...section, id: r.id })));
  }

  updateSection(id: string, section: Section): Observable<any> {
      return from(this.pb.collection('sections').update(id, section));
  }

  deleteSection(id: string): Observable<any> {
      // Also delete related apps? PB 'Cascade Delete' might handle it if configured, 
      // but in my script I said 'cascadeDelete: false'.
      // So we should delete apps manually or rely on PB settings.
      // Let's delete apps first for safety.
      // Actually, bulk delete in PB is not direct via API one-shot.
      // Let's just delete section and assume user handles apps or we leave orphans/cleanup.
      // Better: Get apps in section, delete them.
      // For now, simple delete.
      return from(this.pb.collection('sections').delete(id));
  }

  // --- APPS ---
  addApp(app: AppItem, iconFile?: File): Observable<AppItem> {
      const formData = new FormData();
      formData.append('name', app.name);
      formData.append('url', app.url);
      if(app.order) formData.append('order', app.order.toString());
      if(app.section) formData.append('section', app.section); // Relation
      formData.append('type', app.type || 'app');
      
      if (app.iconUrl) formData.append('iconUrl', app.iconUrl);
      if (app.templateId) formData.append('templateId', app.templateId);
      if (app.config) formData.append('config', JSON.stringify(app.config));
      formData.append('healthCheck', (app.healthCheck !== false).toString());
      
      if (iconFile) {
          formData.append('icon', iconFile);
      }

      return from(this.pb.collection('apps').create(formData)).pipe(
        map(r => this.mapPbApp(r)),
        catchError(err => {
            console.error('Failed to add app. Possible causes: missing fields in DB schema (e.g. order).', err);
            throw err;
        })
      );
  }

  updateApp(id: string, app: AppItem, iconFile?: File): Observable<any> {
      const formData = new FormData();
      if(app.name) formData.append('name', app.name);
      if(app.url) formData.append('url', app.url);
      if(app.order !== undefined) formData.append('order', app.order.toString());
      if(app.section !== undefined) formData.append('section', app.section || ''); 
      if(app.type) formData.append('type', app.type);
      if(app.iconUrl !== undefined) formData.append('iconUrl', app.iconUrl);
      if(app.templateId !== undefined) formData.append('templateId', app.templateId || '');
      if(app.config !== undefined) formData.append('config', JSON.stringify(app.config));
      if(app.healthCheck !== undefined) formData.append('healthCheck', app.healthCheck.toString());

      if (iconFile) {
          formData.append('icon', iconFile);
      }

      return from(this.pb.collection('apps').update(id, formData)).pipe(
        catchError(err => {
            console.error('Failed to update app. Possible causes: missing fields in DB schema (e.g. order).', err);
            throw err;
        })
      );
  }

  deleteApp(id: string): Observable<any> {
    return from(this.pb.collection('apps').delete(id));
  }

  // --- UPLOAD ---
  // Replaced by direct create/update with File in addApp/updateApp
  // But kept for compatibility if needed? No, we refactor.

  // Proxy
  getJellyfinStatus(url: string): Observable<any> {
    return this.http.get(`${this.backendUrl}/status/jellyfin?url=${encodeURIComponent(url)}`);
  }

  getHostStats(): Observable<any> {
    return this.http.get(`${this.backendUrl}/status/host`);
  }
}
