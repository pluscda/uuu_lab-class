export interface LoginRequest {
  userId: string;
  password: string;
}

/** Login response, kept in SESSION storage for the lifetime of the tab. */
export interface UserProfile {
  userId: string;
  userName: string;
  accessToken: string;
}

/** PUT /api/auth/profile response — the server-confirmed identity fields. */
export interface ProfileResponse {
  userId: string;
  userName: string;
}

/** POST /api/auth/change-password body — plain passwords only, never hashes. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
