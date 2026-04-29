import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements HttpInterceptor {

  private logger = inject(LoggerService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const startTime = Date.now();

    this.logger.info('HTTP Request', 'HTTP', {
      method: req.method,
      url: req.url
    });

    return next.handle(req).pipe(
      tap({
        next: () => {
          this.logger.info('HTTP Response OK', 'HTTP', {
            method: req.method,
            url: req.url,
            duration: Date.now() - startTime
          });
        },
        error: (error) => {
          this.logger.error('HTTP Response ERROR', 'HTTP', {
            method: req.method,
            url: req.url,
            duration: Date.now() - startTime,
            error
          });
        }
      })
    );
  }
}