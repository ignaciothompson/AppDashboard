import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AppItem {
  id?: number;
  name: string;
  url: string;
  icon?: string;
  order?: number;
  SectionId?: number; // Foreign key
  type?: 'app' | 'bookmark';
}

export interface Section {
    id?: number;
    title: string;
    order?: number;
    AppItems?: AppItem[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api'; // In production this should be relative or env var

  constructor(private http: HttpClient) { }

  // --- SECTIONS ---
  getSections(): Observable<Section[]> {
      return this.http.get<Section[]>(`${this.apiUrl}/sections`);
  }

  // --- BOOKMARKS ---
  getBookmarks(): Observable<AppItem[]> {
      return this.http.get<AppItem[]>(`${this.apiUrl}/bookmarks`);
  }

  addSection(section: Section): Observable<Section> {
      return this.http.post<Section>(`${this.apiUrl}/sections`, section);
  }

  updateSection(id: number, section: Section): Observable<any> {
      return this.http.put(`${this.apiUrl}/sections/${id}`, section);
  }

  deleteSection(id: number): Observable<any> {
      return this.http.delete(`${this.apiUrl}/sections/${id}`);
  }

  // --- APPS ---
  addApp(app: AppItem): Observable<AppItem> {
    return this.http.post<AppItem>(`${this.apiUrl}/apps`, app);
  }

  updateApp(id: number, app: AppItem): Observable<any> {
    return this.http.put(`${this.apiUrl}/apps/${id}`, app);
  }

  deleteApp(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/apps/${id}`);
  }

  // --- UPLOAD ---
  uploadIcon(file: File): Observable<{ url: string }> {
      const formData = new FormData();
      formData.append('icon', file);
      return this.http.post<{ url: string }>(`${this.apiUrl}/upload`, formData);
  }

  // Proxy
  getJellyfinStatus(url: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/jellyfin?url=${encodeURIComponent(url)}`);
  }

  getHostStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status/host`);
  }
}
