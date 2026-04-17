export * from './screen';
export * from './media';
export * from './playlist';
export * from './profile';

export type UserRole = 'admin' | 'screen_manager';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  screenId: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
}

export interface ManagedUser {
  id: string;
  username: string;
  role: 'screen_manager';
  screenId: string;
  createdAt: string;
  screen?: { id: string; name: string; location: string | null } | null;
}
