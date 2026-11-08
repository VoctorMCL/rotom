import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';
import type { ShoppingItem } from '../models/state.models';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(StorageService);

  readonly syncState = signal<SyncState>('idle');
  readonly lastSyncTime = signal<string | null>(null);
  readonly syncKey = signal<string>('victor-rotom');
  readonly statusMessage = signal<string>('Listo para sincronizar');

  private readonly SYNC_API_ENDPOINT = '/api/sync';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initSync();
    }
  }

  private async initSync(): Promise<void> {
    const savedKey = await this.storage.getSetting('sync_key');
    if (savedKey) {
      this.syncKey.set(savedKey);
    }
    const savedTime = await this.storage.getSetting('last_sync_time');
    if (savedTime) {
      this.lastSyncTime.set(savedTime);
    }

    // Auto-pull al abrir la app si hay internet
    if (navigator.onLine) {
      this.pullFromCloud();
    } else {
      this.syncState.set('offline');
      this.statusMessage.set('Sin conexión: trabajando con memoria local');
    }

    // Escuchar cuando el iPhone vuelva a tener conexión
    window.addEventListener('online', () => {
      this.pullFromCloud();
    });

    window.addEventListener('offline', () => {
      this.syncState.set('offline');
      this.statusMessage.set('Sin conexión: 100% en memoria');
    });
  }

  async setSyncKey(newKey: string): Promise<void> {
    const cleanKey = newKey.trim().toLowerCase();
    if (!cleanKey) return;
    this.syncKey.set(cleanKey);
    await this.storage.setSetting('sync_key', cleanKey);
    await this.pullFromCloud();
  }

  /**
   * Sube los datos locales del PC o Celular a la nube.
   */
  async pushToCloud(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.syncState.set('offline');
      this.statusMessage.set('Sin conexión: guardado en memoria local');
      return false;
    }

    this.syncState.set('syncing');
    this.statusMessage.set('Subiendo datos a la nube...');

    try {
      const shopping = this.storage.shoppingList();
      const payload = {
        key: this.syncKey(),
        updatedAt: new Date().toISOString(),
        device: typeof window !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'PC',
        shopping,
      };

      const res = await fetch(`${this.SYNC_API_ENDPOINT}?key=${encodeURIComponent(this.syncKey())}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const now = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        this.lastSyncTime.set(now);
        await this.storage.setSetting('last_sync_time', now);
        this.syncState.set('synced');
        this.statusMessage.set(`Sincronizado (${now})`);
        return true;
      } else {
        throw new Error('Sync server response not ok');
      }
    } catch {
      // Si el endpoint serverless aún no responde o hay fallo de red
      this.syncState.set('idle');
      this.statusMessage.set('Guardado local (listo para sincronizar)');
      return false;
    }
  }

  /**
   * Descarga los datos de la nube al dispositivo actual (ej: al iPhone).
   */
  async pullFromCloud(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.syncState.set('offline');
      this.statusMessage.set('Sin señal: usando datos en memoria');
      return false;
    }

    this.syncState.set('syncing');
    this.statusMessage.set('Comprobando cambios en la nube...');

    try {
      const res = await fetch(`${this.SYNC_API_ENDPOINT}?key=${encodeURIComponent(this.syncKey())}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.shopping)) {
          await this.storage.bulkSyncShoppingItems(data.shopping);
          const now = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          this.lastSyncTime.set(now);
          await this.storage.setSetting('last_sync_time', now);
          this.syncState.set('synced');
          this.statusMessage.set(`Sincronizado con PC (${now})`);
          return true;
        }
      }
      this.syncState.set('idle');
      return false;
    } catch {
      this.syncState.set('idle');
      this.statusMessage.set('Modo local activo');
      return false;
    }
  }

  /**
   * Sincronización manual de un toque (Push o Pull inteligente).
   */
  async syncNow(): Promise<void> {
    // Si estamos en PC, hacemos push; si estamos en iPhone primero comprobamos pull
    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile) {
      const pulled = await this.pullFromCloud();
      if (!pulled) await this.pushToCloud();
    } else {
      await this.pushToCloud();
    }
  }
}
