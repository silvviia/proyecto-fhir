import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LoggerService } from './logger.service';

export interface FhirBundleEntry<T = unknown> {
  resource: T;
}

export interface FhirBundle<T = unknown> {
  resourceType: 'Bundle';
  type?: string;
  total?: number;
  entry?: FhirBundleEntry<T>[];
}

export interface FhirCapabilityStatement {
  resourceType: 'CapabilityStatement';
  status?: string;
  date?: string;
  kind?: string;
  fhirVersion?: string;
  format?: string[];
}

export interface PatientResource {
  resourceType: 'Patient';
  id?: string;
  active?: boolean;
  gender?: string;
  birthDate?: string;
  name?: Array<{
    family?: string;
    given?: string[];
  }>;
}

export interface FhirCreateResponse {
  id?: string;
  resourceType?: string;
}

@Injectable({ providedIn: 'root' })
export class FhirService {

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private logger = inject(LoggerService);

  private baseUrl = 'http://localhost:8080/fhir';

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/fhir+json',
      'Content-Type': 'application/fhir+json'
    });
  }

  // 🔥 LOG HELPERS
  private logRequest(method: string, url: string, body?: any) {
    this.logger.info(`${method} request`, 'FHIRService', { url, body });
  }

  private logSuccess(method: string, url: string) {
    this.logger.info(`${method} success`, 'FHIRService', { url });
  }

  private logError(method: string, url: string, error: any) {
    this.logger.error(`${method} error`, 'FHIRService', { url, error });
  }

  // 🔹 GET genérico
  get(path: string): Observable<unknown> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `${this.baseUrl}/${cleanPath}`;

    this.logRequest('GET', url);

    return this.http.get<unknown>(url, {
      headers: this.authHeaders()
    }).pipe(
      tap(() => this.logSuccess('GET', url)),
      catchError(err => {
        this.logError('GET', url, err);
        return throwError(() => err);
      })
    );
  }

  // 🔹 METADATA
  getMetadata(): Observable<FhirCapabilityStatement> {
    return this.get('metadata?_pretty=true') as Observable<FhirCapabilityStatement>;
  }

  // 🔹 GENERICOS
  getResource(resourceType: string, count: number = 10): Observable<FhirBundle<unknown>> {
    return this.get(`${resourceType}?_count=${count}&_pretty=true`) as Observable<FhirBundle<unknown>>;
  }

  getPatients(count: number = 10): Observable<FhirBundle<PatientResource>> {
    return this.get(`Patient?_count=${count}&_pretty=true`) as Observable<FhirBundle<PatientResource>>;
  }

  getPatientById(id: string): Observable<PatientResource> {
    return this.get(`Patient/${encodeURIComponent(id)}?_pretty=true`) as Observable<PatientResource>;
  }

  // 🔹 CREATE / UPDATE / DELETE

  createPatient(patient: PatientResource): Observable<FhirCreateResponse> {
    const url = `${this.baseUrl}/Patient`;
    this.logRequest('POST', url, patient);

    return this.http.post<FhirCreateResponse>(url, patient, {
      headers: this.authHeaders()
    }).pipe(
      tap(() => this.logSuccess('POST', url)),
      catchError(err => {
        this.logError('POST', url, err);
        return throwError(() => err);
      })
    );
  }

  updatePatient(id: string, patient: PatientResource): Observable<FhirCreateResponse> {
    const url = `${this.baseUrl}/Patient/${encodeURIComponent(id)}`;
    this.logRequest('PUT', url, patient);

    return this.http.put<FhirCreateResponse>(url, patient, {
      headers: this.authHeaders()
    }).pipe(
      tap(() => this.logSuccess('PUT', url)),
      catchError(err => {
        this.logError('PUT', url, err);
        return throwError(() => err);
      })
    );
  }

  deletePatient(id: string): Observable<unknown> {
    const url = `${this.baseUrl}/Patient/${encodeURIComponent(id)}`;
    this.logRequest('DELETE', url);

    return this.http.delete(url, {
      headers: this.authHeaders()
    }).pipe(
      tap(() => this.logSuccess('DELETE', url)),
      catchError(err => {
        this.logError('DELETE', url, err);
        return throwError(() => err);
      })
    );
  }

  // 🔹 OBSERVATIONS / MEDICATIONS

  getObservationsByPatient(patientId: string): Observable<FhirBundle<unknown>> {
    return this.get(
      `Observation?subject=Patient/${encodeURIComponent(patientId)}&_sort=-date&_pretty=true`
    ) as Observable<FhirBundle<unknown>>;
  }

  getMedicationRequestsByPatient(patientId: string): Observable<FhirBundle<unknown>> {
    return this.get(
      `MedicationRequest?subject=Patient/${encodeURIComponent(patientId)}&_sort=-authoredon&_pretty=true`
    ) as Observable<FhirBundle<unknown>>;
  }

  createObservation(observation: unknown): Observable<FhirCreateResponse> {
    const url = `${this.baseUrl}/Observation`;
    this.logRequest('POST', url, observation);

    return this.http.post<FhirCreateResponse>(url, observation, {
      headers: this.authHeaders()
    }).pipe(
      tap(() => this.logSuccess('POST', url)),
      catchError(err => {
        this.logError('POST', url, err);
        return throwError(() => err);
      })
    );
  }

  createMedicationRequest(medicationRequest: unknown): Observable<FhirCreateResponse> {
    const url = `${this.baseUrl}/MedicationRequest`;
    this.logRequest('POST', url, medicationRequest);

    return this.http.post<FhirCreateResponse>(url, medicationRequest, {
      headers: this.authHeaders()
    }).pipe(
      tap(() => this.logSuccess('POST', url)),
      catchError(err => {
        this.logError('POST', url, err);
        return throwError(() => err);
      })
    );
  }

  // 🔹 OTROS

  getObservations(count: number = 10): Observable<FhirBundle<unknown>> {
    return this.getResource('Observation', count);
  }

  getConditions(count: number = 10): Observable<FhirBundle<unknown>> {
    return this.getResource('Condition', count);
  }

  getMedicationRequests(count: number = 10): Observable<FhirBundle<unknown>> {
    return this.getResource('MedicationRequest', count);
  }

  getServiceRequests(count: number = 10): Observable<FhirBundle<unknown>> {
    return this.getResource('ServiceRequest', count);
  }
}