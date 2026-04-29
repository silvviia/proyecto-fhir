import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { FhirService, FhirCapabilityStatement, FhirBundle } from '../services/fhir.service';

type StatCard = {
  label: string;
  value: number;
  icon: string;
  route?: string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="hospital-page container">
      <section class="page-header card">
        <div>
          <p class="eyebrow">Panel clínico</p>
          <h2>Dashboard Hospitalario FHIR</h2>
          <p class="muted">Resumen operativo del servidor y recursos clínicos.</p>
        </div>

        <div class="header-actions">
          <button class="btn" (click)="reloadAll()" [disabled]="loading">
            {{ loading ? 'Actualizando...' : 'Actualizar dashboard' }}
          </button>
        </div>
      </section>

      <section class="card">
        <h3>Estado del servidor FHIR</h3>

        <div *ngIf="loading && !metadata" class="muted">Cargando metadata...</div>
        <div *ngIf="error" class="alert alert-error">{{ error }}</div>

        <div class="server-grid" *ngIf="metadata">
          <div class="server-item">
            <span class="label">FHIR Version</span>
            <strong>{{ metadata.fhirVersion || 'N/A' }}</strong>
          </div>
          <div class="server-item">
            <span class="label">Status</span>
            <strong>{{ metadata.status || 'N/A' }}</strong>
          </div>
          <div class="server-item">
            <span class="label">Kind</span>
            <strong>{{ metadata.kind || 'N/A' }}</strong>
          </div>
          <div class="server-item">
            <span class="label">Última fecha</span>
            <strong>{{ metadata.date || 'N/A' }}</strong>
          </div>
        </div>
      </section>

      <section class="stats-grid">
        <article class="stat-card card" *ngFor="let s of stats">
          <div class="stat-top">
            <div class="icon">{{ s.icon }}</div>
            <div>
              <p class="muted" style="margin:0;">{{ s.label }}</p>
              <h2 style="margin:4px 0 0;">{{ s.value }}</h2>
            </div>
          </div>

          <div class="stat-actions" *ngIf="s.route">
            <a class="btn btn-primary" [routerLink]="s.route">Ver módulo</a>
          </div>
        </article>
      </section>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
    }

    .stat-card {
      min-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .stat-top {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 22px;
      background: color-mix(in oklab, var(--primary) 14%, var(--surface));
      border: 1px solid color-mix(in oklab, var(--primary) 26%, var(--border));
    }

    .stat-actions {
      margin-top: 10px;
    }

    .server-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .server-item {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      background: var(--surface-2);
      display: grid;
      gap: 4px;
    }

    .server-item .label {
      font-size: .82rem;
      color: var(--text-muted);
    }

    @media (max-width: 1200px) {
      .stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    @media (max-width: 800px) {
      .stats-grid { grid-template-columns: 1fr; }
      .server-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 560px) {
      .server-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class HomeComponent implements OnInit {
  private fhir = inject(FhirService);

  loading = false;
  error = '';
  metadata: FhirCapabilityStatement | null = null;

  totals = {
    patients: 0,
    observations: 0,
    conditions: 0,
    medicationRequests: 0,
    serviceRequests: 0
  };

  get stats(): StatCard[] {
    return [
      { label: 'Pacientes', value: this.totals.patients, icon: '🧑‍⚕️', route: '/patients' },
      { label: 'Observations', value: this.totals.observations, icon: '🧪' },
      { label: 'Conditions', value: this.totals.conditions, icon: '📋' },
      { label: 'MedicationRequests', value: this.totals.medicationRequests, icon: '💊' },
      { label: 'ServiceRequests', value: this.totals.serviceRequests, icon: '🩺' }
    ];
  }

  ngOnInit(): void {
    this.reloadAll();
  }

  reloadAll(): void {
    this.loading = true;
    this.error = '';

    this.fhir.getMetadata().subscribe({
      next: (m: FhirCapabilityStatement) => {
        this.metadata = m;
      },
      error: (err: HttpErrorResponse) => {
        this.error = `Metadata error: ${err.status} ${err.statusText}`;
      }
    });

    this.fhir.getPatients(1).subscribe({
      next: (b: FhirBundle) => (this.totals.patients = b.total ?? 0),
      error: () => (this.totals.patients = 0)
    });

    this.fhir.getObservations(1).subscribe({
      next: (b: FhirBundle) => (this.totals.observations = b.total ?? 0),
      error: () => (this.totals.observations = 0)
    });

    this.fhir.getConditions(1).subscribe({
      next: (b: FhirBundle) => (this.totals.conditions = b.total ?? 0),
      error: () => (this.totals.conditions = 0)
    });

    this.fhir.getMedicationRequests(1).subscribe({
      next: (b: FhirBundle) => (this.totals.medicationRequests = b.total ?? 0),
      error: () => (this.totals.medicationRequests = 0)
    });

    this.fhir.getServiceRequests(1).subscribe({
      next: (b: FhirBundle) => (this.totals.serviceRequests = b.total ?? 0),
      error: () => (this.totals.serviceRequests = 0),
      complete: () => (this.loading = false)
    });
  }
}