import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AuthService } from './app/auth/auth.service';

(async () => {
  const appRef = await bootstrapApplication(App, appConfig);
  const auth = appRef.injector.get(AuthService);
  await auth.init();
})();