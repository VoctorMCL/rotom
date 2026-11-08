import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from './storage.service';

/**
 * Servicio de autenticación 100% offline.
 * - WebAuthn (Face ID / Touch ID) para verificación biométrica local.
 * - PIN/Contraseña con hash SHA-256 como fallback.
 * - Nunca contacta un servidor. Todo vive en IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class LocalLockService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storage = inject(StorageService);

  readonly isUnlocked = signal(false);
  readonly isSetup = signal(false);
  readonly hasBiometric = signal(false);
  readonly authMethod = signal<'none' | 'pin' | 'biometric'>('none');
  readonly errorMessage = signal<string | null>(null);

  readonly isLocked = computed(() => this.isSetup() && !this.isUnlocked());

  private readonly RP_ID = 'rotom.victormcl.me';
  private readonly RP_NAME = 'Rotom';
  private readonly USER_ID = 'rotom-local-user';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.checkSetupStatus();
    }
  }

  // ─── Setup Check ───
  private async checkSetupStatus(): Promise<void> {
    const pinHash = await this.storage.getSetting('pin_hash');
    const credentialId = await this.storage.getSetting('webauthn_credential_id');

    this.isSetup.set(!!pinHash);
    this.hasBiometric.set(!!credentialId);

    // Check if WebAuthn is available on this device
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential
    ) {
      try {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) {
          this.hasBiometric.set(false);
        }
      } catch {
        this.hasBiometric.set(false);
      }
    }
  }

  // ─── SHA-256 Hashing (SubtleCrypto) ───
  private async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    // Salt with a fixed app-specific prefix to prevent rainbow tables
    const data = encoder.encode(`rotom-salt:${pin}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── PIN Setup ───
  async setupPin(pin: string): Promise<void> {
    if (pin.length < 4) {
      this.errorMessage.set('El PIN debe tener al menos 4 caracteres');
      return;
    }

    const hash = await this.hashPin(pin);
    await this.storage.setSetting('pin_hash', hash);
    this.isSetup.set(true);
    this.isUnlocked.set(true);
    this.authMethod.set('pin');
    this.errorMessage.set(null);
  }

  async changePin(currentPin: string, newPin: string): Promise<boolean> {
    const currentHash = await this.hashPin(currentPin);
    const storedHash = await this.storage.getSetting('pin_hash');

    if (currentHash !== storedHash) {
      this.errorMessage.set('PIN actual incorrecto');
      return false;
    }

    if (newPin.length < 4) {
      this.errorMessage.set('El nuevo PIN debe tener al menos 4 caracteres');
      return false;
    }

    const newHash = await this.hashPin(newPin);
    await this.storage.setSetting('pin_hash', newHash);
    this.errorMessage.set(null);
    return true;
  }

  // ─── PIN Unlock ───
  async unlockWithPin(pin: string): Promise<boolean> {
    const hash = await this.hashPin(pin);
    const storedHash = await this.storage.getSetting('pin_hash');

    if (hash === storedHash) {
      this.isUnlocked.set(true);
      this.authMethod.set('pin');
      this.errorMessage.set(null);
      return true;
    }

    this.errorMessage.set('PIN incorrecto');
    return false;
  }

  // ─── WebAuthn / Face ID / Touch ID Setup ───
  async setupBiometric(): Promise<boolean> {
    try {
      // Generate a random challenge (no server needed)
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: this.RP_NAME,
            id: this.RP_ID,
          },
          user: {
            id: new TextEncoder().encode(this.USER_ID),
            name: 'Rotom User',
            displayName: 'Dueño de Rotom',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Force Face ID / Touch ID
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none', // No attestation needed for local auth
        },
      })) as PublicKeyCredential | null;

      if (credential) {
        // Store the credential ID in IndexedDB for future assertions
        const credentialId = btoa(
          String.fromCharCode(...new Uint8Array(credential.rawId))
        );
        await this.storage.setSetting('webauthn_credential_id', credentialId);
        this.hasBiometric.set(true);
        this.errorMessage.set(null);
        return true;
      }

      return false;
    } catch (err) {
      console.error('WebAuthn setup failed:', err);
      this.errorMessage.set(
        'No se pudo configurar Face ID / Touch ID en este dispositivo'
      );
      return false;
    }
  }

  // ─── WebAuthn / Face ID / Touch ID Unlock ───
  async unlockWithBiometric(): Promise<boolean> {
    try {
      const storedCredentialId = await this.storage.getSetting(
        'webauthn_credential_id'
      );
      if (!storedCredentialId) {
        this.errorMessage.set('Face ID / Touch ID no está configurado');
        return false;
      }

      const credentialIdBytes = Uint8Array.from(atob(storedCredentialId), (c) =>
        c.charCodeAt(0)
      );
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: this.RP_ID,
          allowCredentials: [
            {
              id: credentialIdBytes,
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (assertion) {
        this.isUnlocked.set(true);
        this.authMethod.set('biometric');
        this.errorMessage.set(null);
        return true;
      }

      return false;
    } catch (err) {
      console.error('WebAuthn unlock failed:', err);
      this.errorMessage.set(
        'Autenticación biométrica falló. Usa tu PIN.'
      );
      return false;
    }
  }

  // ─── Lock ───
  lock(): void {
    this.isUnlocked.set(false);
    this.authMethod.set('none');
    this.errorMessage.set(null);
  }

  // ─── Reset All Auth ───
  async resetAuth(): Promise<void> {
    await this.storage.setSetting('pin_hash', '');
    await this.storage.setSetting('webauthn_credential_id', '');
    this.isSetup.set(false);
    this.isUnlocked.set(false);
    this.hasBiometric.set(false);
    this.authMethod.set('none');
    this.errorMessage.set(null);
  }
}
