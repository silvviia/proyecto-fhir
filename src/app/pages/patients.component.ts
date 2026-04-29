import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FhirService,
  FhirBundle,
  PatientResource,
  FhirCreateResponse
} from '../services/fhir.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patients.component.html'
})
export class PatientsComponent implements OnInit {
  private fhir = inject(FhirService);

  loading = false;  // carga inicial / botón actualizar
  saving = false;   // guardar/editar
  syncing = false;  // sync silenciosa

  error = '';
  success = '';

  patients: PatientResource[] = [];

  // Pacientes recién creados que aún pueden no aparecer en el server list
  private pendingCreated = new Map<string, PatientResource>();

  // Crear
  formGiven = '';
  formFamily = '';
  formGender = '';
  formBirthDate = '';

  // Editar inline
  editingId: string | null = null;
  editGiven = '';
  editFamily = '';
  editGender = '';
  editBirthDate = '';

  // Filtros + búsqueda
  searchTerm = '';
  genderFilter = '';

  // Mostrar inactivos (borrado lógico)
  showInactive = false;

  // Paginación
  page = 1;
  pageSize = 8;

  ngOnInit(): void {
    this.loadPatients();
  }

  // -------------------------
  // Helpers de merge
  // -------------------------
  private mergeById(primary: PatientResource[], secondary: PatientResource[]): PatientResource[] {
    const map = new Map<string, PatientResource>();

    for (const p of primary) {
      if (p?.id) map.set(p.id, p);
    }

    for (const p of secondary) {
      if (!p?.id) continue;
      if (!map.has(p.id)) map.set(p.id, p);
    }

    return Array.from(map.values());
  }

  // -------------------------
  // Carga normal (con spinner)
  // -------------------------
  loadPatients(): void {
    this.loading = true;
    this.error = '';

    this.fhir.getPatients(200).subscribe({
      next: (bundle: FhirBundle<PatientResource>) => {
        const server = (bundle.entry ?? []).map((e) => e.resource).filter(Boolean);
        const pending = Array.from(this.pendingCreated.values());

        this.patients = this.mergeById(server, pending);

        // limpiar pendientes que ya aparecieron en server
        const serverIds = new Set(server.map((p) => p.id).filter(Boolean) as string[]);
        for (const id of this.pendingCreated.keys()) {
          if (serverIds.has(id)) this.pendingCreated.delete(id);
        }

        this.loading = false;
        this.page = 1;
      },
      error: (err: HttpErrorResponse) => {
        this.error = `Error cargando pacientes: ${err.status} ${err.statusText}`;
        this.loading = false;
      }
    });
  }

  // -------------------------
  // Sync silenciosa
  // -------------------------
  private syncPatientsSilently(): void {
    this.syncing = true;

    this.fhir.getPatients(200).subscribe({
      next: (bundle: FhirBundle<PatientResource>) => {
        const server = (bundle.entry ?? []).map((e) => e.resource).filter(Boolean);
        const pending = Array.from(this.pendingCreated.values());

        // NO perder recién creados mientras el server "se pone al día"
        this.patients = this.mergeById(server, pending);

        // limpiar pendientes confirmados por server
        const serverIds = new Set(server.map((p) => p.id).filter(Boolean) as string[]);
        for (const id of this.pendingCreated.keys()) {
          if (serverIds.has(id)) this.pendingCreated.delete(id);
        }

        this.syncing = false;

        // por si la página actual quedó fuera de rango
        const max = this.totalPages();
        if (this.page > max) this.page = max;
      },
      error: () => {
        this.syncing = false;
      }
    });
  }

  // -------------------------
  // Utilidades UI
  // -------------------------
  fullName(p: PatientResource): string {
    const n = p.name?.[0];
    const given = n?.given?.join(' ') ?? '';
    const family = n?.family ?? '';
    return `${given} ${family}`.trim() || '(sin nombre)';
  }

  genderLabel(g?: string): string {
    if (g === 'male') return 'Masculino';
    if (g === 'female') return 'Femenino';
    if (g === 'other') return 'Otro';
    if (g === 'unknown') return 'No especifica';
    return '-';
  }

  filteredPatients(): PatientResource[] {
    const t = this.searchTerm.trim().toLowerCase();

    return this.patients.filter((p) => {
      const isActive = p.active !== false; // si no viene active, se asume activo
      const byActive = this.showInactive ? true : isActive;
      const byGender = !this.genderFilter || (p.gender ?? '') === this.genderFilter;
      const bySearch =
        !t ||
        (p.id ?? '').toLowerCase().includes(t) ||
        this.fullName(p).toLowerCase().includes(t);

      return byActive && byGender && bySearch;
    });
  }

  pagedPatients(): PatientResource[] {
    const arr = this.filteredPatients();
    const start = (this.page - 1) * this.pageSize;
    return arr.slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPatients().length / this.pageSize));
  }

  goToPage(p: number): void {
    const max = this.totalPages();
    this.page = Math.min(Math.max(1, p), max);
  }

  // -------------------------
  // Crear
  // -------------------------
  createPatient(): void {
    if (!this.formGiven.trim() || !this.formFamily.trim()) {
      this.error = 'Nombres y apellidos son obligatorios.';
      this.success = '';
      return;
    }

    const body: PatientResource = {
      resourceType: 'Patient',
      active: true,
      name: [{ given: [this.formGiven.trim()], family: this.formFamily.trim() }],
      gender: this.formGender || undefined,
      birthDate: this.formBirthDate || undefined
    };

    this.saving = true;
    this.error = '';
    this.success = '';

    this.fhir.createPatient(body).subscribe({
      next: (created: FhirCreateResponse) => {
        this.saving = false;

        // Solo usar ID real (evita desapariciones por tmp-id)
        if (!created?.id) {
          this.success = 'Paciente creado. Sincronizando listado...';
          this.resetCreateForm();
          setTimeout(() => this.syncPatientsSilently(), 800);
          return;
        }

        const newPatient: PatientResource = { ...body, id: created.id };

        // UI inmediata
        this.patients = this.mergeById([newPatient], this.patients);
        this.pendingCreated.set(created.id, newPatient);

        this.page = 1;
        this.success = `Paciente creado (ID: ${created.id}).`;
        this.resetCreateForm();

        // Sync diferida sin bloquear
        setTimeout(() => this.syncPatientsSilently(), 1200);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.error = `Error creando paciente: ${err.status} ${err.statusText}`;
      }
    });
  }

  resetCreateForm(): void {
    this.formGiven = '';
    this.formFamily = '';
    this.formGender = '';
    this.formBirthDate = '';
  }

  // -------------------------
  // Reactivar (active=true)
  // -------------------------
  reactivatePatient(p: PatientResource): void {
    const id = p.id;
    if (!id) return;

    this.error = '';
    this.success = '';

    const body: PatientResource = {
      ...p,
      resourceType: 'Patient',
      id,
      active: true
    };

    this.fhir.updatePatient(id, body).subscribe({
      next: () => {
        this.success = 'Paciente reactivado correctamente.';
        this.patients = this.patients.map((x) =>
          x.id === id ? { ...x, active: true } : x
        );
        setTimeout(() => this.syncPatientsSilently(), 800);
      },
      error: (err: HttpErrorResponse) => {
        this.error = `Error reactivando paciente: ${err.status} ${err.statusText}`;
      }
    });
  }

  // -------------------------
  // Editar
  // -------------------------
  startEdit(p: PatientResource): void {
    this.editingId = p.id ?? null;
    const n = p.name?.[0];
    this.editGiven = n?.given?.join(' ') ?? '';
    this.editFamily = n?.family ?? '';
    this.editGender = p.gender ?? '';
    this.editBirthDate = p.birthDate ?? '';
    this.error = '';
    this.success = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editGiven = '';
    this.editFamily = '';
    this.editGender = '';
    this.editBirthDate = '';
  }

  saveEdit(): void {
    if (!this.editingId) return;

    const previous = this.patients.find((x) => x.id === this.editingId);

    const body: PatientResource = {
      resourceType: 'Patient',
      id: this.editingId,
      active: previous?.active ?? true, // no forzar siempre true
      name: [{ given: [this.editGiven.trim()], family: this.editFamily.trim() }],
      gender: this.editGender || undefined,
      birthDate: this.editBirthDate || undefined
    };

    this.saving = true;
    this.error = '';
    this.success = '';

    this.fhir.updatePatient(this.editingId, body).subscribe({
      next: () => {
        this.saving = false;
        this.success = 'Paciente actualizado.';
        this.cancelEdit();

        // update local inmediato
        this.patients = this.patients.map((p) => (p.id === body.id ? { ...p, ...body } : p));

        // sync silenciosa
        setTimeout(() => this.syncPatientsSilently(), 1000);
      },
      error: (err: HttpErrorResponse) => {
        this.saving = false;
        this.error = `Error actualizando: ${err.status} ${err.statusText}`;
      }
    });
  }

  // -------------------------
  // Eliminar (DELETE con fallback a borrado lógico)
  // -------------------------
  removePatient(p: PatientResource): void {
    const id = p.id;
    if (!id) return;
    if (!confirm(`¿Borrar paciente ${this.fullName(p)} (${id})?`)) return;

    this.error = '';
    this.success = '';

    // 1) Intento de DELETE físico
    this.fhir.deletePatient(id).subscribe({
      next: () => {
        this.success = 'Paciente eliminado.';

        // quitar local al instante
        this.patients = this.patients.filter((x) => x.id !== id);
        this.pendingCreated.delete(id);

        // corregir página si se vació
        const max = this.totalPages();
        if (this.page > max) this.page = max;

        // sync silenciosa
        setTimeout(() => this.syncPatientsSilently(), 1000);
      },
      error: () => {
        // 2) Fallback profesional: borrado lógico (active=false)
        const softDeleteBody: PatientResource = {
          ...p,
          resourceType: 'Patient',
          id,
          active: false
        };

        this.fhir.updatePatient(id, softDeleteBody).subscribe({
          next: () => {
            this.success = 'Paciente dado de baja correctamente.';

            // actualizar local inmediato
            this.patients = this.patients.map((x) =>
              x.id === id ? { ...x, active: false } : x
            );

            this.pendingCreated.delete(id);

            // si no se muestran inactivos, ajustar página
            const max = this.totalPages();
            if (this.page > max) this.page = max;

            setTimeout(() => this.syncPatientsSilently(), 1000);
          },
          error: (err2: HttpErrorResponse) => {
            this.error = `No se pudo eliminar ni desactivar: ${err2.status} ${err2.statusText}`;
          }
        });
      }
    });
  }
}