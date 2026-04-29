import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

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

  private baseUrl = 'http://localhost:8080/fhir';

  private authHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      Accept: 'application/fhir+json',
      'Content-Type': 'application/fhir+json'
    });
  }

  /** Método genérico para FHIR Viewer: get('Patient/123') o get('Observation?_count=20') */
  get(path: string): Observable<unknown> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return this.http.get<unknown>(`${this.baseUrl}/${cleanPath}`, {
      headers: this.authHeaders()
    });
  }

  getMetadata(): Observable<FhirCapabilityStatement> {
    return this.http.get<FhirCapabilityStatement>(`${this.baseUrl}/metadata?_pretty=true`, {
      headers: this.authHeaders()
    });
  }

  getResource(resourceType: string, count: number = 10): Observable<FhirBundle<unknown>> {
    return this.http.get<FhirBundle<unknown>>(
      `${this.baseUrl}/${resourceType}?_count=${count}&_pretty=true`,
      { headers: this.authHeaders() }
    );
  }

  getPatients(count: number = 10): Observable<FhirBundle<PatientResource>> {
    return this.http.get<FhirBundle<PatientResource>>(
      `${this.baseUrl}/Patient?_count=${count}&_pretty=true`,
      { headers: this.authHeaders() }
    );
  }

  getPatientById(id: string): Observable<PatientResource> {
    return this.http.get<PatientResource>(
      `${this.baseUrl}/Patient/${encodeURIComponent(id)}?_pretty=true`,
      { headers: this.authHeaders() }
    );
  }

  createPatient(patient: PatientResource): Observable<FhirCreateResponse> {
    return this.http.post<FhirCreateResponse>(`${this.baseUrl}/Patient`, patient, {
      headers: this.authHeaders()
    });
  }

  updatePatient(id: string, patient: PatientResource): Observable<FhirCreateResponse> {
    return this.http.put<FhirCreateResponse>(`${this.baseUrl}/Patient/${encodeURIComponent(id)}`, patient, {
      headers: this.authHeaders()
    });
  }

  deletePatient(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/Patient/${encodeURIComponent(id)}`, {
      headers: this.authHeaders()
    });
  }

  getObservationsByPatient(patientId: string): Observable<FhirBundle<unknown>> {
    return this.http.get<FhirBundle<unknown>>(
      `${this.baseUrl}/Observation?subject=Patient/${encodeURIComponent(patientId)}&_sort=-date&_pretty=true`,
      { headers: this.authHeaders() }
    );
  }

  getMedicationRequestsByPatient(patientId: string): Observable<FhirBundle<unknown>> {
    return this.http.get<FhirBundle<unknown>>(
      `${this.baseUrl}/MedicationRequest?subject=Patient/${encodeURIComponent(patientId)}&_sort=-authoredon&_pretty=true`,
      { headers: this.authHeaders() }
    );
  }

  createObservation(observation: unknown): Observable<FhirCreateResponse> {
    return this.http.post<FhirCreateResponse>(`${this.baseUrl}/Observation`, observation, {
      headers: this.authHeaders()
    });
  }

  createMedicationRequest(medicationRequest: unknown): Observable<FhirCreateResponse> {
    return this.http.post<FhirCreateResponse>(`${this.baseUrl}/MedicationRequest`, medicationRequest, {
      headers: this.authHeaders()
    });
  }

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