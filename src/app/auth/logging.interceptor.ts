import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoggerService } from '../services/logger.service';
import { AuthService } from './auth.service';
import { TraceService } from '../services/trace.service';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {

  private logger = inject(LoggerService);
  private auth = inject(AuthService);
  private trace = inject(TraceService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const startTime = Date.now();

    // Reuse an existing trace_id propagated from outside, or generate a new one.
    const traceId = req.headers.get('X-Trace-Id') ?? this.trace.generate();
    const user = this.auth.getUsername() || 'anonymous';
    const action = this.extractAction(req.method, req.url);

    // Propagate trace_id to the backend via request header.
    const tracedReq = req.clone({
      setHeaders: { 'X-Trace-Id': traceId }
    });

    this.logger.info('HTTP Request', 'HTTP', {
      action,
      user,
      trace_id: traceId,
      method: req.method,
      url: req.url
    });

    return next.handle(tracedReq).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            this.logger.info('HTTP Response OK', 'HTTP', {
              action,
              user,
              trace_id: traceId,
              method: req.method,
              url: req.url,
              status: event.status,
              duration: Date.now() - startTime
            });
          }
        },
        error: (error) => {
          this.logger.error('HTTP Response ERROR', 'HTTP', {
            action,
            user,
            trace_id: traceId,
            method: req.method,
            url: req.url,
            duration: Date.now() - startTime,
            status: error?.status,
            error_message: error?.message
          });
        }
      })
    );
  }

  /** Derives a human-readable action string from the HTTP method and URL path. */
  private extractAction(method: string, rawUrl: string): string {
    let pathname = rawUrl;
    try {
      pathname = new URL(rawUrl).pathname;
    } catch {
      try {
        pathname = new URL(rawUrl, window.location.origin).pathname;
      } catch {
        // keep rawUrl as fallback
      }
    }
    return `${method} ${pathname}`;
  }
}