// PasswordHash is backend-only and never appears in any frontend model.
export interface AppUser {
  pkid: number;
  userId: string;
  userName: string;
  isActive: boolean;
  passwordUpdatedTime: string | null;
  roleCount: number;
  roleIds: string[];
}

export interface AppUserRequest {
  userId: string;
  userName: string;
  isActive: boolean;
  roleIds: string[];
}

export interface AppUserQuery {
  keyword?: string | null;
  isActive?: boolean | null;
  passwordUpdatedTimeFrom?: string | null;
  passwordUpdatedTimeTo?: string | null;
}

export interface AppRoleLookup {
  roleId: string;
  roleName: string;
}
