export type LoginPayload = {
  usuario: string;
  password: string;
  rutaNumero?: string;
};

export type AuthUser = {
  id: number;
  usuario?: string;
  cedula: string;
  nombre: string;
  rutaNumero: string;
};

export type LoginResponse = {
  ok: boolean;
  mensaje: string;
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  expiresIn: number;
  tecnico: AuthUser;
};
