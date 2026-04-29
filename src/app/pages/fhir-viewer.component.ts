import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FhirService } from '../services/fhir.service';

@Component({
  selector: 'app-fhir-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fhir-viewer.component.html'
})
export class FhirViewerComponent {
  private fhir = inject(FhirService);

  loading = false;
  error = '';
  statusInfo = '';

  resourceType = 'Patient';
  resourceId = '';
  query = '_count=20';

  prettyJson = '';
  rawData: unknown = null;

  // navegación simple
  history: string[] = [];
  historyIndex = -1;

  run(): void {
    const type = this.resourceType.trim();
    const id = this.resourceId.trim();
    const q = this.query.trim();

    this.loading = true;
    this.error = '';
    this.statusInfo = '';

    const obs$ = id
      ? this.fhir.get(`${type}/${encodeURIComponent(id)}`)
      : this.fhir.get(`${type}${q ? `?${q}` : ''}`);

    obs$.subscribe({
      next: (data: unknown) => {
        this.rawData = data;
        this.prettyJson = JSON.stringify(data, null, 2);

        const bundle = data as any;
        if (bundle?.resourceType === 'Bundle') {
          this.statusInfo = `Bundle total: ${bundle.total ?? '-'} · entries: ${bundle.entry?.length ?? 0}`;
        } else {
          this.statusInfo = `${(data as any)?.resourceType ?? 'Resource'} / ${(data as any)?.id ?? '-'}`;
        }

        const urlKey = id ? `${type}/${id}` : `${type}?${q}`;
        this.pushHistory(urlKey);

        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = this.parseFhirError(err);
      }
    });
  }

  // click sobre referencia tipo Patient/123
  openReference(ref: string): void {
    const [type, id] = ref.split('/');
    if (!type || !id) return;
    this.resourceType = type;
    this.resourceId = id;
    this.run();
  }

  copyJson(): void {
    if (!this.prettyJson) return;
    navigator.clipboard.writeText(this.prettyJson);
  }

  downloadJson(): void {
    if (!this.prettyJson) return;
    const blob = new Blob([this.prettyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const file = `${this.resourceType}${this.resourceId ? '-' + this.resourceId : ''}.json`;
    a.href = url;
    a.download = file;
    a.click();
    URL.revokeObjectURL(url);
  }

  back(): void {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreFromHistory(this.history[this.historyIndex]);
  }

  forward(): void {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreFromHistory(this.history[this.historyIndex]);
  }

  private restoreFromHistory(key: string): void {
    const [path, qs] = key.split('?');
    const [type, id] = path.split('/');
    this.resourceType = type || 'Patient';
    this.resourceId = id || '';
    this.query = qs ?? '_count=20';
    this.runWithoutHistoryPush();
  }

  private runWithoutHistoryPush(): void {
    const type = this.resourceType.trim();
    const id = this.resourceId.trim();
    const q = this.query.trim();

    this.loading = true;
    this.error = '';
    this.statusInfo = '';

    const obs$ = id
      ? this.fhir.get(`${type}/${encodeURIComponent(id)}`)
      : this.fhir.get(`${type}${q ? `?${q}` : ''}`);

    obs$.subscribe({
      next: (data: unknown) => {
        this.rawData = data;
        this.prettyJson = JSON.stringify(data, null, 2);

        const bundle = data as any;
        if (bundle?.resourceType === 'Bundle') {
          this.statusInfo = `Bundle total: ${bundle.total ?? '-'} · entries: ${bundle.entry?.length ?? 0}`;
        } else {
          this.statusInfo = `${(data as any)?.resourceType ?? 'Resource'} / ${(data as any)?.id ?? '-'}`;
        }

        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = this.parseFhirError(err);
      }
    });
  }

  private pushHistory(key: string): void {
    if (this.history[this.historyIndex] === key) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(key);
    this.historyIndex = this.history.length - 1;
  }

  private parseFhirError(err: HttpErrorResponse): string {
    const oo = err.error;
    const issue = oo?.issue?.[0];
    const details = issue?.details?.text || issue?.diagnostics || err.message;
    return `Error ${err.status} ${err.statusText}: ${details}`;
  }
}