import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';
import { HomeComponent } from './pages/home.component';
import { PatientsComponent } from './pages/patients.component';
import { PatientDetailComponent } from './pages/patient-detail.component';
import { FhirViewerComponent } from './pages/fhir-viewer.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuard, roleGuard(['enfermeros', 'medico_general'])]
  },
  {
    path: 'patients',
    component: PatientsComponent,
    canActivate: [authGuard, roleGuard(['enfermeros', 'medico_general'])]
  },
  {
    path: 'patients/:id',
    component: PatientDetailComponent,
    canActivate: [authGuard, roleGuard(['enfermeros', 'medico_general'])]
  },
  {
    path: 'fhir',
    component: FhirViewerComponent,
    canActivate: [authGuard, roleGuard(['medico_general'])]
  },

  // fallback
  { path: '**', redirectTo: '' }
];