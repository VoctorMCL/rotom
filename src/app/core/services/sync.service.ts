import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { StorageService } from './storage.service';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  readonly syncState = signal<SyncState>('idle');
  readonly lastSyncTime = signal<string | null>(null);
  readonly syncKey = signal<string>('victor-rotom');
  readonly statusMessage = signal<string>('Listo para sincronizar');
  readonly toastMessage = signal<string | null>(null);

  private readonly SYNC_API_ENDPOINT = '/api/sync';
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initSync();
      this.setupAutoSaveHooks();
    }
  }

  private async initSync(): Promise<void> {
    const savedKey = await this.storage.getSetting('sync_key');
    if (savedKey) this.syncKey.set(savedKey);
    const savedTime = await this.storage.getSetting('last_sync_time');
    if (savedTime) this.lastSyncTime.set(savedTime);

    // Auto-pull al abrir la app si hay internet (para cargar lo escrito en el PC)
    if (navigator.onLine) {
      this.pullFromCloud();
    } else {
      this.syncState.set('offline');
      this.statusMessage.set('Sin conexión: 100% en memoria');
    }

    // Escuchar reconexión del iPhone
    window.addEventListener('online', () => {
      this.pullFromCloud();
    });

    window.addEventListener('offline', () => {
      this.syncState.set('offline');
      this.statusMessage.set('Sin conexión: memoria interna');
    });
  }

  private setupAutoSaveHooks(): void {
    // 1. Guardado automático con debounce ante cada acción en IndexedDB
    this.storage.onDataChanged = () => {
      this.scheduleDebouncedPush();
    };

    // 2. Guardado automático ante cada cambio de ruta/página (ej: de wiki a compras)
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.pushToCloud();
      });

    // 3. Guardado al cambiar de pestaña en el PC o minimizar la ventana
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.pushToCloud();
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.pushToCloud();
      });
    }
  }

  private scheduleDebouncedPush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushToCloud();
    }, 800);
  }

  async setSyncKey(newKey: string): Promise<void> {
    const cleanKey = newKey.trim().toLowerCase();
    if (!cleanKey) return;
    this.syncKey.set(cleanKey);
    await this.storage.setSetting('sync_key', cleanKey);
    await this.pullFromCloud();
  }

  /**
   * Sube los datos locales a la nube de forma transparente y automática en el PC.
   */
  async pushToCloud(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.syncState.set('offline');
      this.statusMessage.set('Sin conexión: guardado en memoria');
      return false;
    }

    this.syncState.set('syncing');
    this.statusMessage.set('Auto-guardando en la nube...');

    try {
      const shopping = this.storage.shoppingList();
      const customCatalog = this.storage.customCatalogItems();
      const calendar = this.storage.calendarEvents();
      const todos = this.storage.todoList();
      const progress = await this.storage.getAllStepProgress();

      const payload = {
        key: this.syncKey(),
        updatedAt: new Date().toISOString(),
        device: typeof window !== 'undefined' && /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'PC',
        shopping,
        customCatalog,
        calendar,
        todos,
        progress,
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
        this.statusMessage.set(`Guardado automático (${now})`);
        return true;
      }
      throw new Error('Sync push failed');
    } catch {
      this.syncState.set('idle');
      this.statusMessage.set('Guardado local en memoria');
      return false;
    }
  }

  /**
   * Descarga los cambios guardados en la nube hacia el teléfono.
   * El botón "Bajar cambios del PC" ejecuta estrictamente esta función.
   */
  async pullFromCloud(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.syncState.set('offline');
      this.statusMessage.set('Sin señal: usando datos en memoria');
      this.showToast('⚠️ Sin internet para descargar del PC');
      return false;
    }

    this.syncState.set('syncing');
    this.statusMessage.set('Bajando cambios del PC...');

    try {
      const res = await fetch(`${this.SYNC_API_ENDPOINT}?key=${encodeURIComponent(this.syncKey())}`);
      if (res.ok) {
        const data = await res.json();
        let shoppingCount = 0;
        let customCount = 0;
        let calendarCount = 0;

        if (data) {
          if (Array.isArray(data.shopping)) {
            await this.storage.bulkSyncShoppingItems(data.shopping);
            shoppingCount = data.shopping.length;
          }
          if (Array.isArray(data.customCatalog)) {
            await this.storage.bulkSyncCustomItems(data.customCatalog);
            customCount = data.customCatalog.length;
          }
          if (Array.isArray(data.calendar)) {
            await this.storage.bulkSyncCalendarEvents(data.calendar);
            calendarCount = data.calendar.length;
          }
          if (Array.isArray(data.todos)) {
            await this.storage.bulkSyncTodos(data.todos);
          }
          if (Array.isArray(data.progress)) {
            await this.storage.bulkSyncStepProgress(data.progress);
          }

          const now = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
          this.lastSyncTime.set(now);
          await this.storage.setSetting('last_sync_time', now);
          this.syncState.set('synced');
          this.statusMessage.set(`Actualizado con PC (${now})`);
          this.showToast(
            `✓ ¡Descargado del PC! ${shoppingCount} compras, ${customCount} recetas/lavado, ${calendarCount} eventos`
          );
          return true;
        }
      }
      this.syncState.set('idle');
      return false;
    } catch (err) {
      console.warn('Error pulling from cloud:', err);
      this.syncState.set('idle');
      this.statusMessage.set('Modo local activo');
      return false;
    }
  }

  /**
   * Activado por el botón de sincronización de la interfaz:
   * Siempre BAJA los cambios del PC hacia el dispositivo actual.
   */
  async syncNow(): Promise<void> {
    await this.pullFromCloud();
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500);
  }
}
