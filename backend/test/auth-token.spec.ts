import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { AuthTokenGuard } from '../src/auth/auth-token.guard';
import {
  issueAuthToken,
  resolveBearerToken,
  verifyAuthToken,
  type AuthSession,
} from '../src/auth/auth-token';

describe('Auth token security', () => {
  const originalSecret = process.env.AUTH_TOKEN_SECRET;
  const originalTtl = process.env.AUTH_TOKEN_TTL_SECONDS;

  beforeEach(() => {
    process.env.AUTH_TOKEN_SECRET = 'test-secret-rnf06';
    process.env.AUTH_TOKEN_TTL_SECONDS = '3600';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_TOKEN_SECRET;
    } else {
      process.env.AUTH_TOKEN_SECRET = originalSecret;
    }

    if (originalTtl === undefined) {
      delete process.env.AUTH_TOKEN_TTL_SECONDS;
    } else {
      process.env.AUTH_TOKEN_TTL_SECONDS = originalTtl;
    }

    jest.restoreAllMocks();
  });

  it('issues and verifies a valid session token', () => {
    const session: AuthSession = {
      sub: 7,
      usuario: 'tecnico.demo@trazadh.com',
      cedula: '0000001234',
      nombre: 'Tecnico Demo',
      rutaNumero: 'R-12',
      tokenVersion: 1,
    };

    const issued = issueAuthToken(session);
    const verified = verifyAuthToken(issued.token);

    expect(verified).toEqual(session);
    expect(issued.token).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(issued.expiresIn).toBeGreaterThan(0);
  });

  it('rejects tampered token payload', () => {
    const issued = issueAuthToken({
      sub: 9,
      usuario: 'tecnico.demo@trazadh.com',
      cedula: '0000005678',
      nombre: 'Tecnico Demo',
      rutaNumero: 'R-99',
      tokenVersion: 1,
    });

    const [header, payload, signature] = issued.token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    decoded.rutaNumero = 'R-01';
    const tamperedPayload = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
    const tampered = `${header}.${tamperedPayload}.${signature}`;

    expect(() => verifyAuthToken(tampered)).toThrow(UnauthorizedException);
  });

  it('rejects expired token', () => {
    process.env.AUTH_TOKEN_TTL_SECONDS = '1';
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_700_000_000_000);

    const issued = issueAuthToken({
      sub: 3,
      usuario: 'tecnico.demo@trazadh.com',
      cedula: '0000007777',
      nombre: 'Tecnico Demo',
      rutaNumero: 'R-10',
      tokenVersion: 1,
    });

    nowSpy.mockReturnValue(1_700_000_000_000 + 2_000);
    expect(() => verifyAuthToken(issued.token)).toThrow('La sesion expiro.');
  });

  it('parses bearer token and rejects malformed auth header', () => {
    expect(resolveBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(() => resolveBearerToken('Basic test')).toThrow(UnauthorizedException);
    expect(() => resolveBearerToken('')).toThrow(UnauthorizedException);
  });

  it('guard enforces bearer token and binds auth session to request', async () => {
    const issued = issueAuthToken({
      sub: 12,
      usuario: 'tecnico.demo@trazadh.com',
      cedula: '0000009988',
      nombre: 'Tecnico Demo',
      rutaNumero: 'R-77',
      tokenVersion: 2,
    });

    const request: Record<string, unknown> = {
      headers: {
        authorization: `Bearer ${issued.token}`,
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    const guard = new AuthTokenGuard({
      query: jest.fn().mockResolvedValue([{ tokenVersion: 2, activo: true }]),
    } as any);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as { auth?: AuthSession }).auth?.rutaNumero).toBe('R-77');
  });

  it('guard rejects revoked session token version', async () => {
    const issued = issueAuthToken({
      sub: 21,
      usuario: 'tecnico.demo@trazadh.com',
      cedula: '0000000011',
      nombre: 'Tecnico Demo',
      rutaNumero: 'R-20',
      tokenVersion: 1,
    });

    const request: Record<string, unknown> = {
      headers: {
        authorization: `Bearer ${issued.token}`,
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    const guard = new AuthTokenGuard({
      query: jest.fn().mockResolvedValue([{ tokenVersion: 2, activo: true }]),
    } as any);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
