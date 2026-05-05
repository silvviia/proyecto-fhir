import { Injectable } from '@angular/core';

/**
 * Generates RFC-4122 v4 UUIDs used as trace identifiers for end-to-end
 * request correlation across frontend logs and backend (Nginx/FHIR) logs.
 */
@Injectable({ providedIn: 'root' })
export class TraceService {
  generate(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
