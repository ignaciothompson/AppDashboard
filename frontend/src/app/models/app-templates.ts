/**
 * App Templates - Predefined configurations for common apps
 * Each template includes an icon URL and optional config fields
 */

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number';
  placeholder?: string;
  required?: boolean;
  description?: string;
}

export interface AppTemplate {
  id: string;
  name: string;
  icon: string;
  category: 'media' | 'infrastructure' | 'downloads' | 'productivity' | 'other';
  configFields?: ConfigField[];
}

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg';

export const APP_TEMPLATES: AppTemplate[] = [
  // Media - Primary Templates
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    icon: `${CDN_BASE}/jellyfin.svg`,
    category: 'media',
    configFields: [
      { 
        key: 'apiKey', 
        label: 'API Key', 
        type: 'password', 
        placeholder: 'Your Jellyfin API Key',
        description: 'Dashboard → API Keys → Create new key',
        required: true
      }
    ]
  },
  
  // Downloads - Primary Templates
  {
    id: 'radarr',
    name: 'Radarr',
    icon: `${CDN_BASE}/radarr.svg`,
    category: 'downloads',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Radarr API Key', required: true }
    ]
  },
  {
    id: 'sonarr',
    name: 'Sonarr',
    icon: `${CDN_BASE}/sonarr.svg`,
    category: 'downloads',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Sonarr API Key', required: true }
    ]
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    icon: `${CDN_BASE}/qbittorrent.svg`,
    category: 'downloads',
    configFields: [
      { key: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Password' }
    ]
  }
];

// Helper to get template by ID
export function getTemplateById(id: string): AppTemplate | undefined {
  return APP_TEMPLATES.find(t => t.id === id);
}

// Helper to get templates by category
export function getTemplatesByCategory(category: AppTemplate['category']): AppTemplate[] {
  return APP_TEMPLATES.filter(t => t.category === category);
}
