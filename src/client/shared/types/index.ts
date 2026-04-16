export * from './screen';
export * from './media';
export * from './playlist';
export * from './profile';

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
}
