import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChangePasswordRequest, LoginRequest, ProfileResponse, UserProfile } from '../models/auth.model';

export const AUTH_STORAGE_KEY = 'auth-profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly loginUrl = `${environment.apiUrl}/auth/login`;

  private readonly profileSignal = signal<UserProfile | null>(readStoredProfile());

  readonly profile = this.profileSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.profileSignal() !== null);
  readonly userName = computed(() => this.profileSignal()?.userName ?? '');
  /** Role claims decoded from the access token — no extra API call. */
  readonly roles = computed(() => decodeRoles(this.profileSignal()?.accessToken));
  readonly isAdmin = computed(() => this.roles().includes('Admin'));

  get accessToken(): string | null {
    return this.profileSignal()?.accessToken ?? null;
  }

  login(request: LoginRequest): Observable<UserProfile> {
    return this.http.post<UserProfile>(this.loginUrl, request).pipe(
      tap(profile => {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        this.profileSignal.set(profile);
      })
    );
  }

  /**
   * Updates the signed-in user's UserName (the server identifies the user from
   * the JWT) and refreshes the stored profile so the shell picks up the change.
   */
  updateUserName(userName: string): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${environment.apiUrl}/auth/profile`, { userName }).pipe(
      tap(response => {
        const current = this.profileSignal();
        if (!current) return;
        const updated: UserProfile = { ...current, userName: response.userName };
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        this.profileSignal.set(updated);
      })
    );
  }

  /**
   * Changes the signed-in user's password (the server identifies the user from
   * the JWT and verifies the current password). The stored profile/token are
   * untouched — the session stays valid.
   */
  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, request);
  }

  /** Clears the session and returns to the Login page. */
  logout(): void {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    this.profileSignal.set(null);
    this.router.navigate(['/login']);
  }
}

function readStoredProfile(): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function decodeRoles(accessToken: string | undefined): string[] {
  if (!accessToken) return [];
  try {
    const payload = accessToken.split('.')[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const role: unknown = claims['role'];
    if (Array.isArray(role)) return role as string[];
    return typeof role === 'string' && role ? [role] : [];
  } catch {
    return [];
  }
}
