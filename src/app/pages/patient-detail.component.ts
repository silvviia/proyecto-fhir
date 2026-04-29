import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FhirService, FhirBundle, PatientResource } from '../services/fhir.service';

type ObservationResource = {
  resourceType: 'Observation';
  id?: string;
  status?: string;
  code?: { text?: string };
  valueString?: string;
  valueQuantity?: { value?: number; unit?: string };
  effectiveDateTime?: string;
  subject?: { reference?: string };
};

type MedicationRequestResource = {
  resourceType: 'MedicationRequest';
  id?: string;
  status?: string;
  intent?: string;
  medicationCodeableConcept?: { text?: string };
  subject?: { reference?: string };
  authoredOn?: string;
  dosageInstruction?: Array<{ text?: string }>;
};

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container">
      <div class="card">
        <div class="flex items-center justify-between wrap gap-2 mb-3">
          <div>
            <h2>Detalle de paciente</h2>
            <p class="muted">ID: <code>{{ patientId }}</code></p>
          </div>
          <a class="btn" routerLink="/patients">← Volver</a>
        </div>

        <p *ngIf="loading">Cargando...</p>
        <p *ngIf="error" class="text-danger">{{ error }}</p>

        <div *ngIf="patient && !loading" class="grid grid-2">
          <div class="card">
            <h3 class="mb-2">Datos generales</h3>
            <p><strong>Nombre:</strong> {{ patientName(patient) }}</p>
            <p><strong>Género:</strong> {{ patient.gender || '-' }}</p>
            <p><strong>Nacimiento:</strong> {{ patient.birthDate || '-' }}</p>
            <p>
              <strong>Estado:</strong>
              <span class="badge" [ngClass]="patient.active ? 'badge-success' : 'badge-warning'">
                {{ patient.active ? 'Activo' : 'Inactivo' }}
              </span>
            </p>
          </div>

          <div class="card">
            <h3 class="mb-2">Acciones rápidas</h3>
            <div class="flex gap-2 wrap">
              <button class="btn" (click)="loadObservations()">Recargar Observations</button>
              <button class="btn" (click)="loadMedicationRequests()">Recargar MedicationRequests</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Observation -->
      <div class="card mt-3">
        <div class="flex items-center justify-between wrap gap-2 mb-2">
          <h3>Observations</h3>
          <button class="btn btn-primary" (click)="toggleObsForm()">
            {{ showObsForm ? 'Cancelar' : '+ Nueva Observation' }}
          </button>
        </div>

        <div *ngIf="showObsForm" class="card mb-3" style="background: var(--surface-2);">
          <div class="grid grid-2">
            <label>
              Código / Nombre
              <input [(ngModel)]="obsCodeText" placeholder="Ej: Presión arterial" />
            </label>
            <label>
              Valor texto
              <input [(ngModel)]="obsValueText" placeholder="Ej: 120/80" />
            </label>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-primary" (click)="createObservation()" [disabled]="savingObs">
              {{ savingObs ? 'Guardando...' : 'Guardar Observation' }}
            </button>
          </div>
        </div>

        <div class="table-wrap" *ngIf="observations.length; else noObs">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Estado</th>
                <th>Código</th>
                <th>Valor</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let o of observations">
                <td><code>{{ o.id || '-' }}</code></td>
                <td>{{ o.status || '-' }}</td>
                <td>{{ o.code?.text || '-' }}</td>
                <td>{{ observationValue(o) }}</td>
                <td>{{ o.effectiveDateTime || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noObs><p class="muted">Sin observations.</p></ng-template>
      </div>

      <!-- MedicationRequest -->
      <div class="card mt-3">
        <div class="flex items-center justify-between wrap gap-2 mb-2">
          <h3>MedicationRequests</h3>
          <button class="btn btn-primary" (click)="toggleMedForm()">
            {{ showMedForm ? 'Cancelar' : '+ Nueva MedicationRequest' }}
          </button>
        </div>

        <div *ngIf="showMedForm" class="card mb-3" style="background: var(--surface-2);">
          <div class="grid grid-2">
            <label>
              Medicamento
              <input [(ngModel)]="medText" placeholder="Ej: Paracetamol 500mg" />
            </label>
            <label>
              Instrucción de dosis
              <input [(ngModel)]="medDoseText" placeholder="Ej: 1 tableta cada 8 horas" />
            </label>
          </div>
          <div class="flex gap-2 mt-2">
            <button class="btn btn-primary" (click)="createMedicationRequest()" [disabled]="savingMed">
              {{ savingMed ? 'Guardando...' : 'Guardar MedicationRequest' }}
            </button>
          </div>
        </div>

        <div class="table-wrap" *ngIf="medicationRequests.length; else noMed">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Estado</th>
                <th>Intent</th>
                <th>Medicamento</th>
                <th>Dosis</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of medicationRequests">
                <td><code>{{ m.id || '-' }}</code></td>
                <td>{{ m.status || '-' }}</td>
                <td>{{ m.intent || '-' }}</td>
                <td>{{ m.medicationCodeableConcept?.text || '-' }}</td>
                <td>{{ m.dosageInstruction?.[0]?.text || '-' }}</td>
                <td>{{ m.authoredOn || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noMed><p class="muted">Sin medication requests.</p></ng-template>
      </div>
    </div>
  `
})
export class PatientDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fhir = inject(FhirService);

  patientId = '';
  loading = false;
  error = '';

  patient: PatientResource | null = null;

  observations: ObservationResource[] = [];
  medicationRequests: MedicationRequestResource[] = [];

  showObsForm = false;
  showMedForm = false;

  savingObs = false;
  savingMed = false;

  obsCodeText = '';
  obsValueText = '';

  medText = '';
  medDoseText = '';

  ngOnInit(): void {
    this.patientId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.patientId) {
      this.error = 'No se encontró el ID del paciente en la URL.';
      return;
    }

    this.loadPatient();
    this.loadObservations();
    this.loadMedicationRequests();
  }

  loadPatient(): void {
    this.loading = true;
    this.error = '';

    this.fhir.getPatientById(this.patientId).subscribe({
      next: (p: PatientResource) => {
        this.patient = p;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.error = `Error cargando paciente: ${err.status} ${err.statusText}`;
        this.loading = false;
      }
    });
  }

  loadObservations(): void {
    this.fhir.getObservationsByPatient(this.patientId).subscribe({
      next: (bundle: FhirBundle<unknown>) => {
        this.observations = (bundle.entry ?? [])
          .map((e) => e.resource as ObservationResource)
          .filter((r) => r?.resourceType === 'Observation');
      },
      error: (err: HttpErrorResponse) => {
        this.error = `Error cargando observations: ${err.status} ${err.statusText}`;
      }
    });
  }

  loadMedicationRequests(): void {
    this.fhir.getMedicationRequestsByPatient(this.patientId).subscribe({
      next: (bundle: FhirBundle<unknown>) => {
        this.medicationRequests = (bundle.entry ?? [])
          .map((e) => e.resource as MedicationRequestResource)
          .filter((r) => r?.resourceType === 'MedicationRequest');
      },
      error: (err: HttpErrorResponse) => {
        this.error = `Error cargando medication requests: ${err.status} ${err.statusText}`;
      }
    });
  }

  patientName(p: PatientResource): string {
    const n = p.name?.[0];
    const given = n?.given?.join(' ') ?? '';
    const family = n?.family ?? '';
    return `${given} ${family}`.trim() || '(sin nombre)';
  }

  observationValue(o: ObservationResource): string {
    if (o.valueString) return o.valueString;
    if (o.valueQuantity?.value !== undefined) {
      return `${o.valueQuantity.value} ${o.valueQuantity.unit ?? ''}`.trim();
    }
    return '-';
  }

  toggleObsForm(): void {
    this.showObsForm = !this.showObsForm;
  }

  toggleMedForm(): void {
    this.showMedForm = !this.showMedForm;
  }

  createObservation(): void {
    if (!this.obsCodeText.trim()) {
      this.error = 'El código/nombre de la observation es obligatorio.';
      return;
    }

    const body: ObservationResource = {
      resourceType: 'Observation',
      status: 'final',
      code: { text: this.obsCodeText.trim() },
      valueString: this.obsValueText.trim() || undefined,
      subject: { reference: `Patient/${this.patientId}` },
      effectiveDateTime: new Date().toISOString()
    };

    this.savingObs = true;
    this.error = '';

    this.fhir.createObservation(body).subscribe({
      next: () => {
        this.savingObs = false;
        this.obsCodeText = '';
        this.obsValueText = '';
        this.showObsForm = false;
        this.loadObservations();
      },
      error: (err: HttpErrorResponse) => {
        this.savingObs = false;
        this.error = `Error creando observation: ${err.status} ${err.statusText}`;
      }
    });
  }

  createMedicationRequest(): void {
    if (!this.medText.trim()) {
      this.error = 'El medicamento es obligatorio.';
      return;
    }

    const body: MedicationRequestResource = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: { text: this.medText.trim() },
      subject: { reference: `Patient/${this.patientId}` },
      authoredOn: new Date().toISOString().slice(0, 10),
      dosageInstruction: this.medDoseText.trim()
        ? [{ text: this.medDoseText.trim() }]
        : undefined
    };

    this.savingMed = true;
    this.error = '';

    this.fhir.createMedicationRequest(body).subscribe({
      next: () => {
        this.savingMed = false;
        this.medText = '';
        this.medDoseText = '';
        this.showMedForm = false;
        this.loadMedicationRequests();
      },
      error: (err: HttpErrorResponse) => {
        this.savingMed = false;
        this.error = `Error creando medication request: ${err.status} ${err.statusText}`;
      }
    });
  }
}