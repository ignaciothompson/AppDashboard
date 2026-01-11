import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, BehaviorSubject } from 'rxjs';
import { AppItem } from './api.service';

export interface StatusResponse {
  online: boolean;
  serverName?: string;
  version?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export interface AppStatus {
  appId: string;
  templateId?: string;
  online: boolean;
  data?: StatusResponse;
  lastChecked: Date;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  private readonly apiBase = '/api';
  
  // Cache of app statuses
  private statusCache = new Map<string, AppStatus>();
  private statusSubject = new BehaviorSubject<Map<string, AppStatus>>(this.statusCache);
  
  status$ = this.statusSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get status for an app - uses template-specific or generic ping
   */
  checkAppStatus(app: AppItem): Observable<AppStatus> {
    if (!app.id || !app.url) {
      return of({ 
        appId: app.id || '', 
        online: false, 
        lastChecked: new Date() 
      });
    }

    // Use template-specific check if available
    if (app.templateId === 'jellyfin') {
      return this.checkJellyfinStatus(app);
    }
    
    // For all other apps, use generic ping
    return this.checkGenericStatus(app);
  }

  /**
   * Generic ping - check if any URL is reachable
   */
  checkGenericStatus(app: AppItem): Observable<AppStatus> {
    return this.http.get<StatusResponse>(
      `${this.apiBase}/ping`,
      { params: { url: app.url } }
    ).pipe(
      map(data => {
        const status: AppStatus = {
          appId: app.id!,
          templateId: app.templateId,
          online: data.online,
          data: data,
          lastChecked: new Date()
        };
        this.updateCache(app.id!, status);
        return status;
      }),
      catchError(() => {
        const status: AppStatus = {
          appId: app.id!,
          templateId: app.templateId,
          online: false,
          lastChecked: new Date()
        };
        this.updateCache(app.id!, status);
        return of(status);
      })
    );
  }

  /**
   * Check Jellyfin server status (simplified - status only)
   */
  checkJellyfinStatus(app: AppItem): Observable<AppStatus> {
    const apiKey = app.config?.['apiKey'];
    const params: any = { url: app.url };
    if (apiKey) params.apiKey = apiKey;

    return this.http.get<StatusResponse>(
      `${this.apiBase}/jellyfin/status`,
      { params }
    ).pipe(
      map(data => {
        const status: AppStatus = {
          appId: app.id!,
          templateId: 'jellyfin',
          online: data.online,
          data: data,
          lastChecked: new Date()
        };
        this.updateCache(app.id!, status);
        return status;
      }),
      catchError(() => {
        const status: AppStatus = {
          appId: app.id!,
          templateId: 'jellyfin',
          online: false,
          lastChecked: new Date()
        };
        this.updateCache(app.id!, status);
        return of(status);
      })
    );
  }

  /**
   * Get cached status for an app
   */
  getCachedStatus(appId: string): AppStatus | undefined {
    return this.statusCache.get(appId);
  }

  /**
   * Check all apps
   */
  checkAllApps(apps: AppItem[]): void {
    apps.forEach(app => {
      if (app.id && app.url) {
        this.checkAppStatus(app).subscribe();
      }
    });
  }

  private updateCache(appId: string, status: AppStatus): void {
    this.statusCache.set(appId, status);
    this.statusSubject.next(new Map(this.statusCache));
  }
}
