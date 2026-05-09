import { Injectable, Injector } from '@angular/core';
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js';
import { keycloakConfig } from './keycloak.config';
import { AuditService } from '../services/audit.service';

type TokenClaims = KeycloakTokenParsed & {
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  email?: string;
  name?: string;
  sub?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private keycloak!: Keycloak;
  private initialized = false;
  private initPromise: Promise<boolean> | null = null;

  // Evita duplicar LOGIN_SUCCESS si init() se llama más de una vez
  private loginLogged = false;

  constructor(private injector: Injector) {}

  init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.keycloak = new Keycloak({
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId
    });

    this.initPromise = this.keycloak
      .init({
        onLoad: 'login-required',
        pkceMethod: 'S256',
        checkLoginIframe: false
      })
      .then((authenticated) => {
        this.initialized = true;

        // Log una sola vez cuando el usuario YA está autenticado
        if (authenticated && !this.loginLogged) {
          this.loginLogged = true;
          const audit = this.injector.get(AuditService);
          audit.loginSuccess();
        }

        return authenticated;
      });

    return this.initPromise;
  }

  async ensureInitialized(): Promise<void> {
    if (!this.initialized) await this.init();
  }

  login(): Promise<void> {
    return this.keycloak.login({ redirectUri: window.location.origin });
  }

  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: window.location.origin });
  }

  isLoggedIn(): boolean {
    return !!this.keycloak?.authenticated;
  }

  getUsername(): string {
    const claims = this.keycloak?.tokenParsed as TokenClaims | undefined;
    return (
      claims?.preferred_username ||
      claims?.email ||
      claims?.name ||
      claims?.sub ||
      'anonymous'
    );
  }

  getToken(): string {
    return this.keycloak?.token || '';
  }

  getUserRoles(): string[] {
    const claims = this.keycloak?.tokenParsed as TokenClaims | undefined;
    return claims?.realm_access?.roles || [];
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  async updateToken(minValiditySeconds: number = 30): Promise<boolean> {
    if (!this.isLoggedIn()) return false;
    try {
      return await this.keycloak.updateToken(minValiditySeconds);
    } catch {
      return false;
    }
  }
}