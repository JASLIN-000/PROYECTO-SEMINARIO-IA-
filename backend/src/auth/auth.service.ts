import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { LoginDto } from '../common/dto/login.dto';
import { Equipo } from '../common/entities/equipo.entity';
import { TecnicoAcceso } from '../common/entities/tecnico-acceso.entity';
import { getBusinessDayContext, getConfiguredHolidaySet } from '../common/utils/business-days';

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

    const cedula = body.cedula.trim();
    const calendario = getBusinessDayContext(new Date(), getConfiguredHolidaySet());
    const tecnico = await this.tecnicosRepository.findOne({
      where: { cedula, activo: true },
    });

    if (!tecnico) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (!this.passwordsMatch(body.password, tecnico.passwordHash)) {
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

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource
        .query(`
          ALTER TABLE equipos ADD COLUMN IF NOT EXISTS ruta_numero VARCHAR(20);
          CREATE INDEX IF NOT EXISTS idx_equipos_ruta_numero ON equipos(ruta_numero);

          CREATE TABLE IF NOT EXISTS tecnicos_acceso (
            id BIGSERIAL PRIMARY KEY,
            cedula VARCHAR(30) NOT NULL UNIQUE,
            nombre VARCHAR(120) NOT NULL,
            ruta_numero VARCHAR(20) NOT NULL,
            password_hash VARCHAR(64) NOT NULL,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );

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

          const total = await this.tecnicosRepository.count();
          if (!total) {
            await this.tecnicosRepository.save(
              this.tecnicosRepository.create({
                cedula: process.env.AUTH_DEFAULT_CEDULA || '10101010',
                nombre: process.env.AUTH_DEFAULT_NOMBRE || 'Tecnico Demo',
                rutaNumero: process.env.AUTH_DEFAULT_RUTA || 'R1',
                passwordHash: this.hashPassword(process.env.AUTH_DEFAULT_PASSWORD || '123456'),
                activo: true,
              }),
            );
          }
        });
    }

    await this.schemaReady;
  }

  private passwordsMatch(password: string, storedHash: string) {
    const rawPassword = String(password);

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
}