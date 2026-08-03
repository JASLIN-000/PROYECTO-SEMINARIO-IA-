import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

export type AuthSession = {
  sub: number;
  usuario: string;
  cedula: string;
  nombre: string;
  rutaNumero: string;
  tokenVersion: number;
};

type AuthTokenPayload = AuthSession & {
  iat: number;
  exp: number;
};

type IssuedAuthToken = {
  token: string;
  expiresAt: string;
  expiresIn: number;
};

const AUTH_SCHEME = 'Bearer';
const DEFAULT_TTL_SECONDS = 60 * 60 * 8;

export function issueAuthToken(session: AuthSession): IssuedAuthToken {
  const now = Math.floor(Date.now() / 1000);
  const ttl = resolveTokenTtlSeconds();
  const exp = now + ttl;

  const payload: AuthTokenPayload = {
    ...session,
    iat: now,
    exp,
  };

  const headerSegment = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadSegment = toBase64Url(JSON.stringify(payload));
  const signatureSegment = sign(`${headerSegment}.${payloadSegment}`);

  return {
    token: `${headerSegment}.${payloadSegment}.${signatureSegment}`,
    expiresAt: new Date(exp * 1000).toISOString(),
    expiresIn: ttl,
  };
}

export function verifyAuthToken(token: string): AuthSession {
  const [headerSegment, payloadSegment, signatureSegment] = String(token || '').split('.');
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new UnauthorizedException('Token de sesion invalido.');
  }

  const expectedSignature = sign(`${headerSegment}.${payloadSegment}`);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signatureSegment);
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new UnauthorizedException('Token de sesion invalido.');
  }

  const payloadRaw = fromBase64Url(payloadSegment);
  let payload: AuthTokenPayload;

  try {
    payload = JSON.parse(payloadRaw) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedException('Token de sesion invalido.');
  }

  if (!isValidPayload(payload)) {
    throw new UnauthorizedException('Token de sesion invalido.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new UnauthorizedException('La sesion expiro.');
  }

  return {
    sub: payload.sub,
    usuario: payload.usuario,
    cedula: payload.cedula,
    nombre: payload.nombre,
    rutaNumero: payload.rutaNumero,
    tokenVersion: payload.tokenVersion,
  };
}

export function resolveBearerToken(authHeader?: string): string {
  const raw = String(authHeader || '').trim();
  if (!raw) {
    throw new UnauthorizedException('Token de sesion requerido.');
  }

  const [scheme, token] = raw.split(' ').filter(Boolean);
  if (scheme !== AUTH_SCHEME || !token) {
    throw new UnauthorizedException('Encabezado Authorization invalido.');
  }

  return token;
}

function sign(value: string) {
  return createHmac('sha256', resolveTokenSecret()).update(value).digest('base64url');
}

function resolveTokenSecret() {
  return process.env.AUTH_TOKEN_SECRET || 'mantenimiento-mvp-token-secret-change-me';
}

function resolveTokenTtlSeconds() {
  const raw = Number(process.env.AUTH_TOKEN_TTL_SECONDS || DEFAULT_TTL_SECONDS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_TTL_SECONDS;
  }

  return Math.floor(raw);
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function isValidPayload(value: AuthTokenPayload) {
  return (
    Number.isFinite(value?.sub)
    && typeof value?.usuario === 'string'
    && typeof value?.cedula === 'string'
    && typeof value?.nombre === 'string'
    && typeof value?.rutaNumero === 'string'
    && Number.isFinite(value?.tokenVersion)
    && Number.isFinite(value?.iat)
    && Number.isFinite(value?.exp)
  );
}
