import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const userRoles = auth.getUserRoles();
    const ok = allowedRoles.some((r) => userRoles.includes(r));

    if (!ok) {
      // tu ruta válida de inicio es ''
      return router.createUrlTree(['/']);
    }

    return true;
  };
};