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

@Injectable({ providedIn: 'root' })
export class LoggerService {

  private logs: LogEntry[] = [];

  private sendToServer(log: LogEntry) {
    // 🔥 Aquí puedes enviar logs a backend o Logstash
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