import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoggerService, LogEntry } from '../services/logger.service';

@Component({
  standalone: true,
  selector: 'app-log-dashboard',
  imports: [CommonModule],
  template: `
    <h2>📊 Dashboard de Logs</h2>

    <div>
      <strong>Total logs:</strong> {{ logs.length }}
    </div>

    <div>
      <strong>Errores:</strong> {{ errorCount }}
    </div>

    <div>
      <strong>Requests:</strong> {{ requestCount }}
    </div>

    <hr>

    <table border="1" width="100%">
      <tr>
        <th>Hora</th>
        <th>Nivel</th>
        <th>Mensaje</th>
        <th>Módulo</th>
      </tr>

      <tr *ngFor="let log of logs">
        <td>{{ log.timestamp }}</td>
        <td>{{ log.level }}</td>
        <td>{{ log.message }}</td>
        <td>{{ log.module }}</td>
      </tr>
    </table>
  `
})
export class LogDashboardComponent {

  private logger = inject(LoggerService);

  logs: LogEntry[] = [];
  errorCount = 0;
  requestCount = 0;

  ngOnInit() {
    this.logs = this.logger.getLogs();

    this.errorCount = this.logs.filter(l => l.level === 'ERROR').length;
    this.requestCount = this.logs.filter(l => l.message.includes('request')).length;
  }
}