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
