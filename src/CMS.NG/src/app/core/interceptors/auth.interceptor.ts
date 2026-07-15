import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the session-stored access token as a Bearer header, and treats any
 * 401 as an expired/invalid session: clear session storage and go to Login.
 * A 401 from the login endpoint itself is the "wrong credentials" case and is
 * left to the Login page to display.
 *
 * 500-class errors get a global friendly toast using the safe message the API
 * puts in the body ({ message }); other statuses (400 validation, 403, 409)
 * keep propagating untouched so pages can surface them on the form.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const messageService = inject(MessageService);
  const token = auth.accessToken;
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.endsWith('/auth/login')) {
        auth.logout();
      } else if (error.status >= 500) {
        messageService.add({
          severity: 'error',
          summary: '系統錯誤',
          detail: error.error?.message || '系統發生錯誤，請稍後再試。'
        });
      }
      return throwError(() => error);
    })
  );
};
