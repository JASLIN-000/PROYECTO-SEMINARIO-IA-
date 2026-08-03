import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthTokenGuard } from '../src/auth/auth-token.guard';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { EquiposController } from '../src/equipos/equipos.controller';
import { EquiposService } from '../src/equipos/equipos.service';
import { HallazgosController } from '../src/hallazgos/hallazgos.controller';
import { HallazgosService } from '../src/hallazgos/hallazgos.service';
import { InformesController } from '../src/informes/informes.controller';
import { InformesService } from '../src/informes/informes.service';
import { MantenimientosController } from '../src/mantenimientos/mantenimientos.controller';
import { MantenimientosService } from '../src/mantenimientos/mantenimientos.service';
import { ModulosController } from '../src/modulos/modulos.controller';
import { ModulosService } from '../src/modulos/modulos.service';
import { PlantillasController } from '../src/plantillas/plantillas.controller';
import { PlantillasService } from '../src/plantillas/plantillas.service';
import { DataSource } from 'typeorm';

describe('RNF-06 endpoint authorization (HTTP)', () => {
  let app: INestApplication;
  type SecuredEndpoint = {
    method: 'get' | 'post' | 'patch' | 'put';
    path: string;
    body?: Record<string, unknown>;
  };

  beforeAll(async () => {
    process.env.AUTH_TOKEN_SECRET = 'test-secret-rnf06';

    const moduleRef = await Test.createTestingModule({
      controllers: [
        AuthController,
        EquiposController,
        HallazgosController,
        InformesController,
        MantenimientosController,
        ModulosController,
        PlantillasController,
      ],
      providers: [
        AuthTokenGuard,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn().mockResolvedValue([{ tokenVersion: 1, activo: true }]),
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            logout: jest.fn().mockResolvedValue({ ok: true }),
          },
        },
        {
          provide: EquiposService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ ok: true, equipos: [] }),
          },
        },
        {
          provide: HallazgosService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            findEstadoHistorial: jest.fn().mockResolvedValue({ hallazgoId: 1, historial: [] }),
            create: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn().mockResolvedValue({ id: 1, estado: 'PENDIENTE' }),
          },
        },
        {
          provide: InformesService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            preview: jest.fn().mockResolvedValue({ textoGenerado: '' }),
            create: jest.fn().mockResolvedValue({ id: 1 }),
            finalize: jest.fn().mockResolvedValue({ id: 1, estado: 'FINALIZADO' }),
          },
        },
        {
          provide: MantenimientosService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({ idMantenimiento: 1 }),
          },
        },
        {
          provide: ModulosService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: PlantillasService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const securedEndpoints: SecuredEndpoint[] = [
    { method: 'get', path: '/equipos' },
    { method: 'post', path: '/auth/logout', body: {} },
    { method: 'get', path: '/hallazgos' },
    { method: 'post', path: '/hallazgos', body: {} },
    { method: 'patch', path: '/hallazgos/1', body: { estado: 'PENDIENTE' } },
    { method: 'put', path: '/hallazgos/1', body: { estado: 'SOLUCIONADO' } },
    { method: 'get', path: '/informes' },
    { method: 'post', path: '/informes/preview', body: {} },
    { method: 'post', path: '/informes', body: {} },
    { method: 'patch', path: '/informes/1/finalizar', body: {} },
    { method: 'get', path: '/mantenimientos' },
    { method: 'post', path: '/mantenimientos', body: {} },
    { method: 'get', path: '/modulos' },
    { method: 'get', path: '/plantillas' },
  ];

  it.each(securedEndpoints)('returns 401 without bearer token for $method $path', async ({ method, path, body }) => {
    let req = request(app.getHttpServer())[method](path);
    if (body !== undefined) {
      req = req.send(body);
    }

    await req.expect(401);
  });

  it.each(securedEndpoints)('returns 401 with invalid bearer token for $method $path', async ({ method, path, body }) => {
    let req = request(app.getHttpServer())[method](path)
      .set('Authorization', 'Bearer malformed-token');
    if (body !== undefined) {
      req = req.send(body);
    }

    await req.expect(401);
  });
});
