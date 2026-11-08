import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LockScreenComponent } from './features/lock-screen/lock-screen';
import { LayoutComponent } from './features/layout/layout.component';
import { HomeComponent } from './features/home/home.component';
import { WikiComponent } from './features/wiki/wiki.component';
import { ShoppingComponent } from './features/shopping/shopping.component';
import { TodoComponent } from './features/todo/todo.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  {
    path: 'lock',
    component: LockScreenComponent,
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomeComponent,
      },
      {
        path: 'wiki',
        component: WikiComponent,
      },
      {
        path: 'wiki/:id',
        component: WikiComponent,
      },
      {
        path: 'shopping',
        component: ShoppingComponent,
      },
      {
        path: 'todo',
        component: TodoComponent,
      },
      {
        path: 'calendar',
        component: CalendarComponent,
      },
      {
        path: 'settings',
        component: SettingsComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
