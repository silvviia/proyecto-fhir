import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <mat-icon>local_hospital</mat-icon>
          <span>Hospital FHIR</span>
        </div>

        <a
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-link"
        >
          <mat-icon>dashboard</mat-icon>
          <span>Dashboard</span>
        </a>

        <a routerLink="/patients" routerLinkActive="active" class="nav-link">
          <mat-icon>groups</mat-icon>
          <span>Pacientes</span>
        </a>

        <a
          *ngIf="canSeeFhirViewer()"
          routerLink="/fhir"
          routerLinkActive="active"
          class="nav-link"
        >
          <mat-icon>data_object</mat-icon>
          <span>FHIR Viewer</span>
        </a>

        <div class="spacer"></div>

        <div class="user-card">
          <div class="hello">
            Hola <strong>{{ username || 'usuario' }}</strong>
            <span *ngIf="mainRole">({{ mainRole }})</span>
          </div>

          <button mat-stroked-button color="primary" class="full" (click)="logout()">
            Cerrar sesión
          </button>

          <mat-slide-toggle [(ngModel)]="darkMode" (change)="toggleTheme()">
            Modo oscuro
          </mat-slide-toggle>
        </div>
      </aside>

      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .app-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 260px 1fr;
      background: #f5f7fb;
    }

    .sidebar {
      background: #111827;
      color: #e5e7eb;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-right: 1px solid rgba(255,255,255,.08);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 18px;
      margin-bottom: 12px;
      color: #fff;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #d1d5db;
      text-decoration: none;
      padding: 10px 12px;
      border-radius: 10px;
      transition: .2s;
    }

    .nav-link:hover {
      background: rgba(255,255,255,.08);
      color: #fff;
    }

    .nav-link.active {
      background: #2563eb;
      color: #fff;
    }

    .spacer {
      flex: 1;
    }

    .user-card {
      border-top: 1px solid rgba(255,255,255,.12);
      padding-top: 12px;
      display: grid;
      gap: 10px;
    }

    .hello {
      font-size: 13px;
      color: #d1d5db;
    }

    .full {
      width: 100%;
    }

    .content {
      padding: 20px;
      overflow: auto;
    }

    @media (max-width: 900px) {
      .app-shell {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: sticky;
        top: 0;
        z-index: 10;
      }
    }

    :global(body.dark-theme) .app-shell {
      background: #0b1220;
    }

    :global(body.dark-theme) .content {
      color: #e5e7eb;
    }
  `]
})
export class App implements OnInit {
  private auth = inject(AuthService);

  darkMode = false;
  username = '';
  mainRole = '';

  async ngOnInit(): Promise<void> {
    const saved = localStorage.getItem('hospital-ui-theme');
    this.darkMode = saved === 'dark';
    this.applyTheme();

    // Evita bloquear/render loop si Keycloak ya se inicializa en guard o main.ts
    this.auth.updateToken(30).catch(() => {});

    this.username = this.auth.getUsername();
    const roles = this.auth.getUserRoles();

    if (roles.includes('medico_general')) this.mainRole = 'medico_general';
    else if (roles.includes('enfermeros')) this.mainRole = 'enfermeros';
    else if (roles.includes('admin')) this.mainRole = 'admin';
    else this.mainRole = roles[0] || '';
  }

  canSeeFhirViewer(): boolean {
    return this.auth.hasRole('medico_general');
  }

  toggleTheme(): void {
    localStorage.setItem('hospital-ui-theme', this.darkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.body.classList.toggle('dark-theme', this.darkMode);
  }

  logout(): void {
    this.auth.logout();
  }
}