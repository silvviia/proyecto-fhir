import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { TraceService } from './trace.service';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private trace = inject(TraceService);

  private user(): string {
    return this.auth.getUsername() || 'anonymous';
  }

  private sessionTraceId(): string {
    return this.trace.getSessionTraceId();
  }

  /**
   * Sends audit events to Nginx so they are captured by Filebeat -> Logstash -> Elasticsearch.
   * We send values as headers because Nginx can log them easily via $http_* variables.
   */
  private send(action: string, details?: any): void {
    const headers = new HttpHeaders({
      'X-Audit-User': this.user(),
      'X-Audit-Action': action,
      'X-Trace-Id': this.sessionTraceId(),
    });

    const body = details ?? null;

    this.http.post('/audit', body, { headers }).subscribe({
      error: () => {},
    });
  }

  loginSuccess(): void {
    this.send('LOGIN_SUCCESS');
  }

  navigate(url: string): void {
    this.send(`NAVIGATE ${url}`);
  }

  action(action: string, details?: any): void {
    this.send(action, details);
  }

  actionError(action: string, error: any, details?: any): void {
    this.send(`${action} ERROR`, {
      error_message: error?.message,
      details: details ?? error,
    });
  }
}