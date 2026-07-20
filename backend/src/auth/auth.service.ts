import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { LoginDto } from '../common/dto/login.dto';
import { Equipo } from '../common/entities/equipo.entity';
import { TecnicoAcceso } from '../common/entities/tecnico-acceso.entity';
import { getBusinessDayContext, loadConfiguredHolidaySet } from '../common/utils/business-days';

@Injectable()
export class AuthService {
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(TecnicoAcceso)
    private readonly tecnicosRepository: Repository<TecnicoAcceso>,
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    private readonly dataSource: DataSource,
  ) {}

  async login(body: LoginDto) {
    await this.ensureSchema();
    await this.normalizeActiveServiceDayIndexes();

    const usuario = this.normalizeUsuario(body.usuario);
    const holidays = await loadConfiguredHolidaySet(new Date());
    const calendario = getBusinessDayContext(new Date(), holidays);
    const tecnico = await this.tecnicosRepository
      .createQueryBuilder('tecnico')
      .where('tecnico.activo = :activo', { activo: true })
      .andWhere('LOWER(tecnico.usuario) = :usuario', { usuario })
      .getOne();

    if (!tecnico) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!this.passwordsMatch(body.password, tecnico.passwordHash, tecnico.cedula)) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const rutaNumero = (body.rutaNumero?.trim() || tecnico.rutaNumero || '').trim();
    let effectiveRutaNumero = rutaNumero;

    let equipos = calendario.isBusinessDay
      ? await this.loadEquiposByRoute(effectiveRutaNumero, calendario.businessDayIndex)
      : [];
    let mensaje = 'Acceso concedido';

    if (!equipos.length) {
      const rutasConfiguradas = await this.getConfiguredRoutes();
      if (
        rutasConfiguradas.length === 1
        && rutasConfiguradas[0].toLowerCase() !== effectiveRutaNumero.toLowerCase()
      ) {
        effectiveRutaNumero = rutasConfiguradas[0];
        tecnico.rutaNumero = effectiveRutaNumero;
        await this.tecnicosRepository.save(tecnico);

        equipos = calendario.isBusinessDay
          ? await this.loadEquiposByRoute(effectiveRutaNumero, calendario.businessDayIndex)
          : [];

        mensaje = `Acceso concedido. Tu ruta fue ajustada automaticamente a ${effectiveRutaNumero} segun la configuracion de equipos.`;
      }

      const hayRutasAsignadas = await this.equiposRepository
        .createQueryBuilder('equipo')
        .where('equipo.rutaNumero IS NOT NULL')
        .andWhere("BTRIM(equipo.rutaNumero) <> ''")
        .getCount();

      if (!hayRutasAsignadas) {
        await this.equiposRepository
          .createQueryBuilder()
          .update(Equipo)
          .set({ rutaNumero: effectiveRutaNumero })
          .where('estado = :estado', { estado: 'ACTIVO' })
          .andWhere('(ruta_numero IS NULL OR BTRIM(ruta_numero) = \'\')')
          .execute();

        equipos = calendario.isBusinessDay
          ? await this.loadEquiposByRoute(effectiveRutaNumero, calendario.businessDayIndex)
          : [];

        if (!calendario.isBusinessDay) {
          mensaje = 'Acceso concedido. Hoy no es dia habil, por eso no se muestran equipos para intervenir.';
        } else {
          mensaje = 'Acceso concedido. Como aun no habia rutas cargadas, se asigno temporalmente esta ruta a todos los equipos activos.';
        }
      }

      if (!calendario.isBusinessDay) {
        mensaje = 'Acceso concedido. Hoy no es dia habil, por eso no se muestran equipos para intervenir.';
      }
    }

    return {
      ok: true,
      mensaje,
      tecnico: {
        id: tecnico.id,
        usuario: tecnico.usuario,
        cedula: tecnico.cedula,
        nombre: tecnico.nombre,
        rutaNumero: effectiveRutaNumero,
      },
      calendario,
      equipos: equipos.map((equipo) => ({
        id: equipo.id,
        idEquipo: equipo.idEquipo,
        nombreEquipo: equipo.nombreEquipo,
        acuerdoNivelServicioDh: equipo.acuerdoNivelServicioDh,
        estado: equipo.estado,
        rutaNumero: equipo.rutaNumero ?? null,
      })),
    };
  }

  private async loadEquiposByRoute(rutaNumero: string, businessDayIndex: number) {
    if (!rutaNumero.trim()) {
      return [];
    }

    return this.equiposRepository
      .createQueryBuilder('equipo')
      .where('LOWER(equipo.rutaNumero) = :rutaNumero', { rutaNumero: rutaNumero.toLowerCase() })
      .andWhere('equipo.acuerdoNivelServicioDh = :businessDayIndex', { businessDayIndex })
      .orderBy('equipo.nombreEquipo', 'ASC')
      .getMany();
  }

  private async getConfiguredRoutes() {
    const rows = await this.equiposRepository
      .createQueryBuilder('equipo')
      .select('DISTINCT BTRIM(equipo.rutaNumero)', 'rutaNumero')
      .where('equipo.rutaNumero IS NOT NULL')
      .andWhere("BTRIM(equipo.rutaNumero) <> ''")
      .orderBy('rutaNumero', 'ASC')
      .getRawMany<{ rutaNumero: string }>();

    return rows
      .map((row) => String(row.rutaNumero || '').trim())
      .filter((value) => value.length > 0);
  }

  private async normalizeActiveServiceDayIndexes() {
    await this.dataSource.query(`
      WITH ranked AS (
        SELECT
          id,
          DENSE_RANK() OVER (
            PARTITION BY LOWER(BTRIM(ruta_numero))
            ORDER BY acuerdo_nivel_servicio_dh
          ) AS normalized_dh
        FROM equipos
        WHERE UPPER(estado) = 'ACTIVO'
          AND ruta_numero IS NOT NULL
          AND BTRIM(ruta_numero) <> ''
          AND acuerdo_nivel_servicio_dh IS NOT NULL
      )
      UPDATE equipos equipo
      SET acuerdo_nivel_servicio_dh = ranked.normalized_dh
      FROM ranked
      WHERE equipo.id = ranked.id
        AND equipo.acuerdo_nivel_servicio_dh IS DISTINCT FROM ranked.normalized_dh;
    `);
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource
        .query(`
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ruta_numero VARCHAR(20);
          CREATE INDEX IF NOT EXISTS idx_equipos_ruta_numero ON equipos(ruta_numero);

          CREATE TABLE IF NOT EXISTS tecnicos_acceso (
            id BIGSERIAL PRIMARY KEY,
            usuario VARCHAR(120),
            cedula VARCHAR(30) NOT NULL UNIQUE,
            nombre VARCHAR(120) NOT NULL,
            ruta_numero VARCHAR(20) NOT NULL,
            password_hash VARCHAR(64) NOT NULL,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );

          ALTER TABLE tecnicos_acceso ADD COLUMN IF NOT EXISTS usuario VARCHAR(120);

          CREATE INDEX IF NOT EXISTS idx_tecnicos_acceso_ruta_numero ON tecnicos_acceso(ruta_numero);
        `)
        .then(async () => {
          await this.dataSource.query(`
            CREATE OR REPLACE FUNCTION fn_set_updated_at()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$;
          `);

          await this.dataSource.query(`
            DROP TRIGGER IF EXISTS trg_tecnicos_acceso_updated_at ON tecnicos_acceso;
            CREATE TRIGGER trg_tecnicos_acceso_updated_at
            BEFORE UPDATE ON tecnicos_acceso
            FOR EACH ROW
            EXECUTE FUNCTION fn_set_updated_at();
          `);

          await this.backfillUsuariosAndPasswords();

          await this.dataSource.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename = 'tecnicos_acceso'
                  AND indexname = 'ux_tecnicos_usuario_ci'
              ) THEN
                CREATE UNIQUE INDEX ux_tecnicos_usuario_ci ON tecnicos_acceso (LOWER(usuario));
              END IF;
            END
            $$;
          `);

          const total = await this.tecnicosRepository.count();
          if (!total) {
            const defaultCedula = this.normalizeCedula(process.env.AUTH_DEFAULT_CEDULA || '1010101010');
            const defaultNombre = process.env.AUTH_DEFAULT_NOMBRE || 'Tecnico Demo';
            const defaultUsuario = this.normalizeUsuario(
              process.env.AUTH_DEFAULT_USUARIO || this.buildUsuario(defaultNombre, defaultCedula),
            );
            const defaultPassword = process.env.AUTH_DEFAULT_PASSWORD || this.buildDerivedPassword(defaultCedula);

            await this.tecnicosRepository.save(
              this.tecnicosRepository.create({
                usuario: defaultUsuario,
                cedula: defaultCedula,
                nombre: defaultNombre,
                rutaNumero: process.env.AUTH_DEFAULT_RUTA || 'R1',
                passwordHash: this.hashPassword(defaultPassword),
                activo: true,
              }),
            );
          }
        });
    }

    await this.schemaReady;
  }

  private passwordsMatch(password: string, storedHash: string, cedula: string) {
    const rawPassword = String(password);
    const expectedDerived = this.buildDerivedPassword(cedula);

    if (rawPassword === expectedDerived) {
      return true;
    }

    if (/^[0-9a-fA-F]{64}$/.test(storedHash)) {
      const expectedHash = Buffer.from(storedHash, 'hex');
      const receivedHash = Buffer.from(this.hashPassword(rawPassword), 'hex');
      if (expectedHash.length === receivedHash.length && timingSafeEqual(expectedHash, receivedHash)) {
        return true;
      }
    }

    return storedHash === rawPassword;
  }

  private hashPassword(password: string) {
    const salt = process.env.AUTH_PASSWORD_SALT || 'mantenimiento-mvp';
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
  }

  private buildDerivedPassword(cedula: string) {
    const normalizedCedula = this.coerceCedula10(cedula);
    if (!normalizedCedula) {
      throw new UnauthorizedException('Cedula invalida. Debe tener exactamente 10 digitos.');
    }

    return `trazaDH${normalizedCedula.slice(-4)}`;
  }

  private normalizeCedula(value: string) {
    const cedula = this.coerceCedula10(value);
    if (!cedula) {
      throw new UnauthorizedException('Cedula invalida. Debe tener exactamente 10 digitos.');
    }

    return cedula;
  }

  private coerceCedula10(value: string) {
    const raw = String(value || '').trim();
    if (!/^\d{1,10}$/.test(raw)) {
      return null;
    }

    return raw.padStart(10, '0');
  }

  private normalizeUsuario(value: string) {
    return String(value || '').trim().toLowerCase();
  }

  private buildUsuario(nombre: string, cedula: string) {
    const clean = String(nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

    const tokens = clean.split(' ').filter(Boolean);
    const firstName = tokens[0] || 'tecnico';
    const firstLastName = tokens[1] || `usuario${String(cedula).slice(-2)}`;
    return `${firstName}.${firstLastName}@trazadh.com`;
  }

  private async backfillUsuariosAndPasswords() {
    const tecnicos = await this.tecnicosRepository.find();
    if (!tecnicos.length) {
      return;
    }

    const seenUsuarios = new Set<string>();
    tecnicos.forEach((item) => {
      if (item.usuario) {
        seenUsuarios.add(String(item.usuario).trim().toLowerCase());
      }
    });

    for (const tecnico of tecnicos) {
      let dirty = false;

      const normalizedCedula = this.coerceCedula10(String(tecnico.cedula || '').trim());

      if (!normalizedCedula) {
        continue;
      }

      if (tecnico.cedula !== normalizedCedula) {
        tecnico.cedula = normalizedCedula;
        dirty = true;
      }

      const baseUsuario = this.buildUsuario(tecnico.nombre, normalizedCedula);
      let candidate = this.normalizeUsuario(baseUsuario);
      let suffix = 1;
      while (seenUsuarios.has(candidate) && candidate !== this.normalizeUsuario(String(tecnico.usuario || ''))) {
        candidate = `${baseUsuario.replace('@trazadh.com', '')}${suffix}@trazadh.com`;
        candidate = this.normalizeUsuario(candidate);
        suffix += 1;
      }

      if (this.normalizeUsuario(String(tecnico.usuario || '')) !== candidate) {
        tecnico.usuario = candidate;
        seenUsuarios.add(candidate);
        dirty = true;
      }

      const expectedHash = this.hashPassword(this.buildDerivedPassword(normalizedCedula));
      if (String(tecnico.passwordHash || '').trim() !== expectedHash) {
        tecnico.passwordHash = expectedHash;
        dirty = true;
      }

      if (dirty) {
        await this.tecnicosRepository.save(tecnico);
      }
    }
  }
}