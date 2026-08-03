import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { resolveBearerToken, verifyAuthToken } from './auth-token';
import type { AuthenticatedRequest } from './auth-request.interface';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = resolveBearerToken(request.headers.authorization);
    const session = verifyAuthToken(token);

    const rows = await this.dataSource.query(
      `
        SELECT token_version AS "tokenVersion", activo
        FROM tecnicos_acceso
        WHERE id = $1
        LIMIT 1
      `,
      [session.sub],
    );

    const current = rows?.[0] as { tokenVersion?: number; activo?: boolean } | undefined;
    if (!current || current.activo !== true) {
      throw new UnauthorizedException('Sesion invalida.');
    }

    const tokenVersion = Number(current.tokenVersion);
    if (!Number.isFinite(tokenVersion) || tokenVersion !== session.tokenVersion) {
      throw new UnauthorizedException('Sesion revocada. Inicia sesion nuevamente.');
    }

    request.auth = session;
    return true;
  }
}
