import { Injectable } from '@angular/core';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  module?: string;
  url?: string;
  details?: any;
}

// Logstash HTTP input endpoint.
// In Docker mode Logstash is accessible on localhost:5000.
// Override via the LOGSTASH_URL environment variable at build time if needed.
const LOGSTASH_URL =
  (window as any).__LOGSTASH_URL__ ?? 'http://localhost:5000';

@Injectable({ providedIn: 'root' })
export class LoggerService {

  private logs: LogEntry[] = [];

  private sendToServer(log: LogEntry): void {
    // Use sendBeacon when available (non-blocking, survives page unload).
    // Fall back to fetch for environments that do not support it.
    const body = JSON.stringify(log);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(LOGSTASH_URL, blob);
    } else {
      fetch(LOGSTASH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch((err) => {
        // Log to console in development so misconfigured endpoints are visible,
        // but never throw – logging must never break the app.
        console.warn('[LoggerService] Failed to ship log to Logstash:', err);
      });
    }
  }

  private log(level: LogLevel, message: string, module?: string, extra?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      ...extra
    };

    // Guardar logs en memoria
    this.logs.push(entry);

    // Mostrar en consola
    console.log(entry);

    this.sendToServer(entry);
  }

  info(message: string, module?: string, extra?: any) {
    this.log('INFO', message, module, extra);
  }

  warn(message: string, module?: string, extra?: any) {
    this.log('WARN', message, module, extra);
  }

  error(message: string, module?: string, extra?: any) {
    this.log('ERROR', message, module, extra);
  }

  //  necesario para dashboard
  getLogs(): LogEntry[] {
    return this.logs;
  }
}