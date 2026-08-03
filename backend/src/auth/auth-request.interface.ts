import type { Request } from 'express';
import type { AuthSession } from './auth-token';

export type AuthenticatedRequest = Request & {
  auth?: AuthSession;
};
