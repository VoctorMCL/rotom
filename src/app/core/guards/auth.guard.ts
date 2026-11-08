import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { LocalLockService } from '../services/local-lock.service';

/**
 * Guard que protege TODAS las rutas de la app.
 * Funciona 100% offline — solo verifica el signal isUnlocked.
 */
export const authGuard: CanActivateFn = () => {
  const lockService = inject(LocalLockService);
  const router = inject(Router);

  if (lockService.isUnlocked()) {
    return true;
  }

  return router.createUrlTree(['/lock']);
};
