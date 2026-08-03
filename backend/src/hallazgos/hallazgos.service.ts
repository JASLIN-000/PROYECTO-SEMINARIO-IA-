import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CreateHallazgoDto } from '../common/dto/create-hallazgo.dto';
import { CreateSolicitudDto } from '../common/dto/create-solicitud.dto';
import { UpdateHallazgoDto } from '../common/dto/update-hallazgo.dto';
import { Equipo } from '../common/entities/equipo.entity';
import { Hallazgo } from '../common/entities/hallazgo.entity';
import { Plantilla } from '../common/entities/plantilla.entity';
import { Solicitud } from '../common/entities/solicitud.entity';
import {
  moveToNextBusinessDay,
  loadConfiguredHolidaySet,
  toIsoDate,
} from '../common/utils/business-days';

@Injectable()
export class HallazgosService {
  private static readonly EQUIPO_CODE_REGEX = /^\d{3,5}s-\d{2}$/i;
  private readonly hallazgosFallback: Array<any> = [];
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Equipo)
    private readonly equiposRepository: Repository<Equipo>,
    @InjectRepository(Hallazgo)
    private readonly hallazgosRepository: Repository<Hallazgo>,
    @InjectRepository(Plantilla)
    private readonly plantillasRepository: Repository<Plantilla>,
    @InjectRepository(Solicitud)
    private readonly solicitudesRepository: Repository<Solicitud>,
    private readonly dataSource: DataSource,
  ) {}

  async findSolicitudesByHallazgo(hallazgoId: number) {
    await this.ensureSchema();

    if (!Number.isFinite(hallazgoId) || hallazgoId <= 0) {
      throw new BadRequestException('El id de hallazgo es invalido.');
    }

    const exists = await this.hallazgosRepository.findOne({ where: { id: hallazgoId } });
    if (!exists) {
      throw new NotFoundException('Hallazgo no encontrado.');
    }

    const rows = await this.solicitudesRepository.find({
      where: { idHallazgo: hallazgoId },
      order: { fechaCreacion: 'DESC' },
    });

    return rows.map((item) => this.toPublicSolicitud(item));
  }

  async resolveGoogleFormUrl(rawUrl?: string) {
    const urlValue = String(rawUrl || '').trim();
    if (!urlValue) {
      throw new BadRequestException('Debe enviar la URL del formulario.');
    }

    let parsed: URL;
    try {
      parsed = new URL(urlValue);
    } catch {
      throw new BadRequestException('URL de formulario invalida.');
    }

    const host = parsed.hostname.toLowerCase();
    if (host !== 'forms.gle' && host !== 'docs.google.com') {
      throw new BadRequestException('Solo se admiten URLs de Google Forms (forms.gle o docs.google.com).');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });

      const resolved = response.url || parsed.toString();
      const resolvedHost = (() => {
        try {
          return new URL(resolved).hostname.toLowerCase();
        } catch {
          return '';
        }
      })();

      return {
        inputUrl: parsed.toString(),
        resolvedUrl: resolved,
        requiresAuth: resolvedHost === 'accounts.google.com',
      };
    } catch {
      return {
        inputUrl: parsed.toString(),
        resolvedUrl: parsed.toString(),
        requiresAuth: false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async listSolicitudesByHallazgoIds(hallazgoIds: number[]) {
    await this.ensureSchema();

    const ids = Array.from(new Set((hallazgoIds || []).filter((value) => Number.isFinite(value) && value > 0)));
    if (!ids.length) {
      return [];
    }

    const rows = await this.solicitudesRepository.find({
      where: { idHallazgo: In(ids) },
      order: { fechaCreacion: 'DESC' },
    });

    return rows.map((item) => this.toPublicSolicitud(item));
  }

  async createSolicitud(hallazgoId: number, body: CreateSolicitudDto, usuarioSolicitante: string) {
    await this.ensureSchema();

    if (!Number.isFinite(hallazgoId) || hallazgoId <= 0) {
      throw new BadRequestException('El id de hallazgo es invalido.');
    }

    const hallazgo = await this.hallazgosRepository.findOne({ where: { id: hallazgoId } });
    if (!hallazgo) {
      throw new NotFoundException('Hallazgo no encontrado.');
    }

    const tipo = String(body.tipoSolicitud || '').trim().toUpperCase();
    if (tipo !== 'COTIZACION' && tipo !== 'PEDIDO') {
      throw new BadRequestException('tipoSolicitud invalido.');
    }

    const estado = String(body.estado || 'GENERADA').trim().toUpperCase();
    const estadosPermitidos = new Set(['GENERADA', 'ENVIADA', 'ATENDIDA', 'CERRADA']);
    if (!estadosPermitidos.has(estado)) {
      throw new BadRequestException('estado invalido para solicitud.');
    }

    const usuario = String(usuarioSolicitante || '').trim() || 'Tecnico ruta';

    const entity = this.solicitudesRepository.create({
      idHallazgo: hallazgo.id,
      idEquipo: Number(hallazgo.equipoId),
      tipoSolicitud: tipo as 'COTIZACION' | 'PEDIDO',
      usuarioSolicitante: usuario,
      estado: estado as 'GENERADA' | 'ENVIADA' | 'ATENDIDA' | 'CERRADA',
      urlFormulario: String(body.urlFormulario || '').trim(),
      fechaAperturaFormulario: new Date(),
    });

    const saved = await this.solicitudesRepository.save(entity);
    return this.toPublicSolicitud(saved);
  }

  async findAll(
    equipoId?: string,
    estado?: string,
    modulo?: string,
    nombreEquipo?: string,
    rutaNumero?: string,
  ) {
    await this.ensureSchema();
    const fromDate = this.getIsoDateMonthsAgo(5);
    const normalizedRoute = this.normalizeRoute(rutaNumero);
    let resolvedModulo: string | undefined;

    try {
      const query = this.hallazgosRepository
        .createQueryBuilder('hallazgo')
        .where('hallazgo.fechaHallazgo >= :fromDate', { fromDate });

      if (equipoId?.trim()) {
        const raw = equipoId.trim();
        const resolvedEquipoId = await this.resolveEquipoIdForFilter(raw, normalizedRoute);
        if (!resolvedEquipoId) {
          throw new NotFoundException('Equipo no encontrado.');
        }

        query.andWhere('hallazgo.equipoId = :equipoId', { equipoId: resolvedEquipoId });
      }

      if (estado) {
        query.andWhere('LOWER(hallazgo.estado) = :estado', {
          estado: estado.toLowerCase(),
        });
      }

      if (modulo?.trim()) {
        resolvedModulo = await this.resolveModuloFromPlantillas(modulo.trim());
        query.andWhere('LOWER(hallazgo.modulo) = :modulo', {
          modulo: resolvedModulo.toLowerCase(),
        });
      }

      if (nombreEquipo?.trim()) {
        const nombreEquipoTerm = nombreEquipo.trim();
        if (nombreEquipoTerm.length < 3) {
          throw new BadRequestException('Nombre de equipo invalido. Debe ingresar al menos 3 letras.');
        }

        const routeValidation = await this.validateNombreEquipoByRoute(nombreEquipoTerm, normalizedRoute);
        if (routeValidation === 'OUTSIDE_ROUTE') {
          throw new NotFoundException('Equipo no pertenece a la ruta.');
        }

        query.andWhere(
          `EXISTS (
            SELECT 1
            FROM equipos equipo
            WHERE equipo.id = hallazgo.equipo_id
              AND LOWER(equipo.nombre_equipo) LIKE :nombreEquipo
          )`,
          { nombreEquipo: `%${nombreEquipoTerm.toLowerCase()}%` },
        );

        if (normalizedRoute) {
          query.andWhere(
            `EXISTS (
              SELECT 1
              FROM equipos equipo_ruta
              WHERE equipo_ruta.id = hallazgo.equipo_id
                AND LOWER(equipo_ruta.ruta_numero) = :rutaNumero
            )`,
            { rutaNumero: normalizedRoute },
          );
        }
      }

      const hallazgos = await query.orderBy('hallazgo.fechaHallazgo', 'DESC').getMany();
      return this.enrichWithEquipos(hallazgos);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const filtered = this.hallazgosFallback.filter((item) => {
        const hallazgoDate = String(item.fechaHallazgo || '');
        const inRange = hallazgoDate ? hallazgoDate >= fromDate : true;
        const byEquipo = equipoId ? item.equipoId === Number(equipoId) : true;
        const byEstado = estado ? String(item.estado).toLowerCase() === estado.toLowerCase() : true;
        const byModulo = resolvedModulo
          ? String(item.modulo).toLowerCase() === resolvedModulo.toLowerCase()
          : true;
        const byNombreEquipo = nombreEquipo
          ? String(item.nombreEquipo || '').toLowerCase().includes(nombreEquipo.toLowerCase())
          : true;
        return inRange && byEquipo && byEstado && byModulo && byNombreEquipo;
      });

      return filtered.map((item) => this.toPublicHallazgo(item));
    }
  }

  async findEstadoHistorial(id: number) {
    await this.ensureSchema();

    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('El id de hallazgo es invalido.');
    }

    const exists = await this.hallazgosRepository.findOne({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Hallazgo no encontrado.');
    }

    const rows = await this.dataSource.query(
      `
        SELECT
          id,
          hallazgo_id AS "hallazgoId",
          estado_anterior AS "estadoAnterior",
          estado_nuevo AS "estadoNuevo",
          motivo,
          fecha_cambio AS "fechaCambio"
        FROM hallazgo_estado_historial
        WHERE hallazgo_id = $1
        ORDER BY fecha_cambio DESC, id DESC
      `,
      [id],
    );

    return {
      hallazgoId: id,
      totalCambios: rows.length,
      historial: rows,
    };
  }

  async create(body: CreateHallazgoDto, rutaNumero?: string) {
    await this.ensureSchema();
    const normalizedRoute = this.normalizeRoute(rutaNumero);
    const payload = await this.normalizeBusinessRules(body, false, normalizedRoute);
    this.assertRequiredFields(payload);
    const equipo = await this.assertEquipoExists(payload.equipoId, normalizedRoute);
    this.assertEquipoActivoParaRegistro(equipo);
    await this.assertNoUnintentionalDuplicate(payload);

    try {
      const saved = await this.hallazgosRepository.save(payload);
      await this.recordEstadoTransition(saved.id, null, saved.estado, 'CREATED');
      const [enriched] = await this.enrichWithEquipos([saved]);
      return enriched;
    } catch {
      const fallback = { id: this.hallazgosFallback.length + 1, ...payload };
      this.hallazgosFallback.push(fallback);
      return this.toPublicHallazgo(fallback);
    }
  }

  async update(id: number, body: UpdateHallazgoDto, rutaNumero?: string) {
    await this.ensureSchema();
    const normalizedRoute = this.normalizeRoute(rutaNumero);
    const payload = await this.normalizeBusinessRules(body, true, normalizedRoute);

    try {
      const current = await this.hallazgosRepository.findOne({ where: { id } });
      if (!current) {
        return null;
      }

      const previousEstado = String(current.estado || '').trim().toUpperCase() || null;
      const hallazgo = this.hallazgosRepository.merge(current, payload);
      if (!hallazgo) {
        return null;
      }

      if (payload.equipoId !== undefined) {
        await this.assertEquipoExists(payload.equipoId, normalizedRoute);
      }

      const saved = await this.hallazgosRepository.save(hallazgo);
      const nextEstado = String(saved.estado || '').trim().toUpperCase() || null;
      if (previousEstado !== nextEstado) {
        await this.recordEstadoTransition(saved.id, previousEstado, nextEstado, 'UPDATED');
      }
      const [enriched] = await this.enrichWithEquipos([saved]);
      return enriched;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const index = this.hallazgosFallback.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }

      this.hallazgosFallback[index] = { ...this.hallazgosFallback[index], ...payload };
      return this.toPublicHallazgo(this.hallazgosFallback[index]);
    }
  }

  async remove(id: number, rutaNumero?: string) {
    await this.ensureSchema();

    if (!Number.isFinite(id) || id <= 0) {
      throw new BadRequestException('El id de hallazgo es invalido.');
    }

    const normalizedRoute = this.normalizeRoute(rutaNumero);
    const hallazgo = await this.hallazgosRepository.findOne({ where: { id } });
    if (!hallazgo) {
      throw new NotFoundException('Hallazgo no encontrado.');
    }

    const equipo = await this.equiposRepository.findOne({ where: { id: Number(hallazgo.equipoId) } });
    if (!equipo || !this.belongsToRoute(equipo.rutaNumero, normalizedRoute)) {
      throw new NotFoundException('Hallazgo no encontrado para la ruta actual.');
    }

    await this.hallazgosRepository.delete(id);
    this.removeFromFallbackByIds([id]);

    return {
      deleted: 1,
      ids: [id],
    };
  }

  async removeMany(ids: number[], rutaNumero?: string) {
    await this.ensureSchema();

    const uniqueIds = Array.from(new Set((ids || []).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)));
    if (!uniqueIds.length) {
      throw new BadRequestException('Debe enviar al menos un id de hallazgo para eliminar.');
    }

    const normalizedRoute = this.normalizeRoute(rutaNumero);
    const hallazgos = await this.hallazgosRepository.find({ where: { id: In(uniqueIds) } });
    if (hallazgos.length !== uniqueIds.length) {
      throw new NotFoundException('Uno o más hallazgos no existen.');
    }

    const equipoIds = Array.from(
      new Set(
        hallazgos
          .map((item) => Number(item.equipoId))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    );
    const equipos = equipoIds.length
      ? await this.equiposRepository.find({ where: { id: In(equipoIds) } })
      : [];

    const equiposById = new Map<number, Equipo>();
    equipos.forEach((equipo) => {
      equiposById.set(equipo.id, equipo);
    });

    const unauthorized = hallazgos.some((hallazgo) => {
      const equipo = equiposById.get(Number(hallazgo.equipoId));
      return !equipo || !this.belongsToRoute(equipo.rutaNumero, normalizedRoute);
    });

    if (unauthorized) {
      throw new NotFoundException('Uno o más hallazgos no pertenecen a la ruta actual.');
    }

    await this.hallazgosRepository.delete({ id: In(uniqueIds) });
    this.removeFromFallbackByIds(uniqueIds);

    return {
      deleted: uniqueIds.length,
      ids: uniqueIds,
    };
  }

  private async normalizeBusinessRules(
    body: CreateHallazgoDto | UpdateHallazgoDto,
    isPartial: boolean,
    rutaNumero?: string,
  ): Promise<any> {
    const payload = { ...body };
    const normalized: Record<string, any> = {};

    if (payload.mantenimientoId !== undefined || payload.mantenimiento_id !== undefined) {
      const value = Number(payload.mantenimientoId ?? payload.mantenimiento_id);
      normalized.mantenimientoId = Number.isFinite(value) && value > 0 ? value : null;
    }

    const rawEquipoRef = payload.equipoId ?? payload.equipo_id ?? payload.codigoEquipo ?? payload.idEquipo;
    if (rawEquipoRef !== undefined) {
      normalized.equipoId = await this.resolveEquipoId(rawEquipoRef, rutaNumero);
    }

    const tipoMantenimiento = payload.tipoMantenimiento ?? payload.tipo_mantenimiento;
    if (tipoMantenimiento !== undefined) {
      normalized.tipoMantenimiento = String(tipoMantenimiento).trim() || 'PREVENTIVO';
    } else if (!isPartial) {
      normalized.tipoMantenimiento = 'PREVENTIVO';
    }

    const modulo = payload.modulo;
    if (modulo !== undefined) {
      normalized.modulo = await this.resolveModuloFromPlantillas(String(modulo).trim());
    }

    const descripcion = payload.descripcionHallazgo ?? payload.descripcion_hallazgo ?? payload.descripcion;
    if (descripcion !== undefined) {
      normalized.descripcionHallazgo = String(descripcion).trim() || 'SIN DESCRIPCION';
    } else if (!isPartial) {
      normalized.descripcionHallazgo = 'SIN DESCRIPCION';
    }

    if (payload.cotizacion !== undefined || payload.requiereCotizacion !== undefined) {
      const rawCotizacion = payload.cotizacion;
      if (rawCotizacion !== undefined) {
        const cotizacion = String(rawCotizacion).trim().toUpperCase();
        normalized.cotizacion = cotizacion === 'SÍ' ? 'SI' : (['SI', 'NO', 'NA', 'N/A'].includes(cotizacion) ? cotizacion.replace('/', '') : 'NA');
      } else {
        normalized.cotizacion = payload.requiereCotizacion ? 'SI' : 'NO';
      }
    } else if (!isPartial) {
      normalized.cotizacion = 'NA';
    }

    if (payload.observacion !== undefined) {
      const observacion = String(payload.observacion).trim();
      normalized.observacion = observacion || null;
    }

    if (payload.estado !== undefined) {
      const estado = String(payload.estado).trim().toUpperCase();
      const normalizedEstado = estado === 'CERRADO' ? 'SOLUCIONADO' : (estado === 'PROCESO' ? 'PENDIENTE' : estado);
      normalized.estado = ['ABIERTO', 'PENDIENTE', 'SOLUCIONADO'].includes(normalizedEstado)
        ? normalizedEstado
        : 'ABIERTO';
    } else if (!isPartial) {
      normalized.estado = 'ABIERTO';
    }

    if (normalized.estado === 'ABIERTO') {
      normalized.cotizacion = 'SI';
    }

    const rawFechaHallazgo = payload.fechaHallazgo ?? payload.fecha_hallazgo ?? payload.fechaMantenimiento;
    const hasDate = typeof rawFechaHallazgo === 'string' && rawFechaHallazgo.trim();

    if (hasDate) {
      const parsed = new Date(`${rawFechaHallazgo}T12:00:00-05:00`);
      if (!Number.isNaN(parsed.getTime())) {
        const holidays = await loadConfiguredHolidaySet(parsed);
        const shifted = moveToNextBusinessDay(parsed, holidays);
        normalized.fechaHallazgo = toIsoDate(shifted);
      }
    } else if (!isPartial) {
      normalized.fechaHallazgo = toIsoDate(new Date());
    }

    const rawFechaSolucion = payload.fechaSolucion ?? payload.fecha_solucion;
    if (rawFechaSolucion !== undefined) {
      const value = String(rawFechaSolucion).trim();
      normalized.fechaSolucion = value || null;
    } else if (normalized.estado === 'SOLUCIONADO') {
      normalized.fechaSolucion = toIsoDate(new Date());
    } else if (normalized.estado === 'PENDIENTE' || normalized.estado === 'ABIERTO') {
      normalized.fechaSolucion = null;
    }

    return normalized;
  }

  private getIsoDateMonthsAgo(months: number) {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - months);
    return toIsoDate(date);
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.dataSource
        .query(`
          ALTER TABLE hallazgos ADD COLUMN IF NOT EXISTS mantenimiento_id INTEGER NULL;
          ALTER TABLE hallazgos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
          ALTER TABLE hallazgos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

          CREATE TABLE IF NOT EXISTS hallazgo_estado_historial (
            id BIGSERIAL PRIMARY KEY,
            hallazgo_id BIGINT NOT NULL REFERENCES hallazgos(id) ON UPDATE CASCADE ON DELETE CASCADE,
            estado_anterior VARCHAR(20) NULL,
            estado_nuevo VARCHAR(20) NOT NULL,
            motivo VARCHAR(60) NOT NULL,
            fecha_cambio TIMESTAMP NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_hallazgos_fecha_hallazgo ON hallazgos(fecha_hallazgo DESC);
          CREATE INDEX IF NOT EXISTS idx_hallazgos_modulo ON hallazgos(modulo);
          CREATE INDEX IF NOT EXISTS idx_hallazgos_mantenimiento_id ON hallazgos(mantenimiento_id);
          CREATE INDEX IF NOT EXISTS idx_hallazgo_estado_historial_hallazgo_id ON hallazgo_estado_historial(hallazgo_id, fecha_cambio DESC);

          CREATE TABLE IF NOT EXISTS solicitudes (
            id_solicitud BIGSERIAL PRIMARY KEY,
            id_hallazgo BIGINT NOT NULL REFERENCES hallazgos(id) ON UPDATE CASCADE ON DELETE CASCADE,
            id_equipo BIGINT NOT NULL REFERENCES equipos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
            tipo_solicitud VARCHAR(20) NOT NULL CHECK (tipo_solicitud IN ('COTIZACION', 'PEDIDO')),
            fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
            usuario_solicitante VARCHAR(160) NOT NULL,
            estado VARCHAR(20) NOT NULL DEFAULT 'GENERADA' CHECK (estado IN ('GENERADA', 'ENVIADA', 'ATENDIDA', 'CERRADA')),
            url_formulario TEXT NOT NULL,
            fecha_apertura_formulario TIMESTAMP NULL
          );

          CREATE INDEX IF NOT EXISTS idx_solicitudes_hallazgo ON solicitudes(id_hallazgo, fecha_creacion DESC);
          CREATE INDEX IF NOT EXISTS idx_solicitudes_equipo ON solicitudes(id_equipo, fecha_creacion DESC);
        `)
        .then(() => undefined);
    }

    await this.schemaReady;
  }

  private assertRequiredFields(payload: Record<string, any>) {
    if (!payload.equipoId || payload.equipoId <= 0) {
      throw new BadRequestException('equipoId es obligatorio y debe corresponder a un id_equipo valido.');
    }

    if (!payload.modulo || !String(payload.modulo).trim()) {
      throw new BadRequestException('modulo es obligatorio.');
    }

    if (!payload.descripcionHallazgo || !String(payload.descripcionHallazgo).trim()) {
      throw new BadRequestException('descripcionHallazgo es obligatorio.');
    }
  }

  private async assertEquipoExists(equipoId: number, rutaNumero?: string) {
    const equipo = await this.equiposRepository.findOne({ where: { id: equipoId } });
    if (!equipo) {
      throw new NotFoundException('El equipo asociado no existe.');
    }

    if (!this.belongsToRoute(equipo.rutaNumero, rutaNumero)) {
      throw new NotFoundException('Equipo no pertenece a la ruta.');
    }

    return equipo;
  }

  private assertEquipoActivoParaRegistro(equipo: Equipo) {
    const estado = String(equipo.estado ?? '').trim().toUpperCase();
    if (estado !== 'ACTIVO') {
      throw new BadRequestException('No se permite registrar hallazgos para equipos inactivos.');
    }
  }

  private async resolveEquipoId(rawEquipoRef: unknown, rutaNumero?: string): Promise<number> {
    const value = String(rawEquipoRef ?? '').trim();
    if (!value) {
      return NaN;
    }

    const numericId = Number(value);
    if (Number.isInteger(numericId) && numericId > 0) {
      const equipoById = await this.equiposRepository.findOne({ where: { id: numericId } });
      if (!equipoById) {
        throw new NotFoundException(`No existe equipo con id ${numericId}.`);
      }

      if (!this.belongsToRoute(equipoById.rutaNumero, rutaNumero)) {
        throw new NotFoundException('Equipo no pertenece a la ruta.');
      }

      return equipoById.id;
    }

    const normalizedCode = this.normalizeEquipoCode(value);

    const equipo = await this.equiposRepository
      .createQueryBuilder('equipo')
      .where('LOWER(equipo.idEquipo) = :codigo', { codigo: normalizedCode.toLowerCase() })
      .getOne();

    if (!equipo) {
      throw new NotFoundException(`No existe equipo con id_equipo ${normalizedCode}.`);
    }

    if (!this.belongsToRoute(equipo.rutaNumero, rutaNumero)) {
      throw new NotFoundException('Equipo no pertenece a la ruta.');
    }

    return equipo.id;
  }

  private async resolveEquipoIdForFilter(rawEquipoRef: string, rutaNumero?: string): Promise<number | null> {
    const value = rawEquipoRef.trim();
    if (!value) {
      return null;
    }

    const normalizedCode = this.normalizeEquipoCode(value);

    const equipo = await this.equiposRepository
      .createQueryBuilder('equipo')
      .where('LOWER(equipo.idEquipo) = :codigo', { codigo: normalizedCode.toLowerCase() })
      .getOne();

    if (equipo && !this.belongsToRoute(equipo.rutaNumero, rutaNumero)) {
      throw new NotFoundException('Equipo no pertenece a la ruta.');
    }

    return equipo?.id ?? null;
  }

  private async validateNombreEquipoByRoute(
    nombreEquipo: string,
    rutaNumero?: string,
  ): Promise<'NOT_FOUND' | 'FOUND_ON_ROUTE' | 'OUTSIDE_ROUTE'> {
    if (!rutaNumero) {
      return 'FOUND_ON_ROUTE';
    }

    const term = `%${nombreEquipo.toLowerCase()}%`;
    const anyMatch = await this.equiposRepository
      .createQueryBuilder('equipo')
      .where('LOWER(equipo.nombreEquipo) LIKE :term', { term })
      .getCount();

    if (!anyMatch) {
      return 'NOT_FOUND';
    }

    const routeMatch = await this.equiposRepository
      .createQueryBuilder('equipo')
      .where('LOWER(equipo.nombreEquipo) LIKE :term', { term })
      .andWhere('LOWER(equipo.rutaNumero) = :rutaNumero', { rutaNumero })
      .getCount();

    return routeMatch ? 'FOUND_ON_ROUTE' : 'OUTSIDE_ROUTE';
  }

  private normalizeRoute(rutaNumero?: string): string | undefined {
    const value = String(rutaNumero ?? '').trim().toLowerCase();
    return value || undefined;
  }

  private belongsToRoute(equipoRuta?: string | null, rutaNumero?: string) {
    if (!rutaNumero) {
      return true;
    }

    return String(equipoRuta ?? '').trim().toLowerCase() === rutaNumero;
  }

  private normalizeEquipoCode(value: string) {
    const normalized = value.trim().toUpperCase();
    if (!HallazgosService.EQUIPO_CODE_REGEX.test(normalized)) {
      throw new BadRequestException('ID de equipo invalido.');
    }

    return normalized;
  }

  private async resolveModuloFromPlantillas(modulo: string) {
    const value = modulo.trim();
    if (!value) {
      throw new BadRequestException('modulo es obligatorio.');
    }

    const plantilla = await this.plantillasRepository
      .createQueryBuilder('plantilla')
      .where('LOWER(plantilla.modulo) = :modulo', { modulo: value.toLowerCase() })
      .orderBy('plantilla.id', 'ASC')
      .getOne();

    if (!plantilla?.modulo?.trim()) {
      throw new BadRequestException('modulo no valido. Debe seleccionar un modulo definido en plantillas.');
    }

    return plantilla.modulo.trim();
  }

  private async assertNoUnintentionalDuplicate(payload: Record<string, any>) {
    const fromDate = this.getIsoDateMonthsAgo(5);
    const normalizedDescription = String(payload.descripcionHallazgo || '').trim().toLowerCase();

    const duplicate = await this.hallazgosRepository
      .createQueryBuilder('hallazgo')
      .where('hallazgo.equipoId = :equipoId', { equipoId: payload.equipoId })
      .andWhere('LOWER(hallazgo.modulo) = :modulo', { modulo: String(payload.modulo).toLowerCase() })
      .andWhere('LOWER(hallazgo.descripcionHallazgo) = :descripcion', { descripcion: normalizedDescription })
      .andWhere('hallazgo.fechaHallazgo >= :fromDate', { fromDate })
      .andWhere('UPPER(hallazgo.estado) IN (:...estados)', { estados: ['ABIERTO', 'PENDIENTE'] })
      .getOne();

    if (duplicate) {
      throw new ConflictException(
        `Ya existe un hallazgo similar activo (#${duplicate.id}). Actualiza su estado u observacion para evitar duplicidad.`,
      );
    }
  }

  private async enrichWithEquipos(hallazgos: Hallazgo[]) {
    if (!hallazgos.length) {
      return [];
    }

    const equipoIds = Array.from(
      new Set(
        hallazgos
          .map((item) => Number(item.equipoId))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    );

    const equipos = equipoIds.length
      ? await this.equiposRepository.find({ where: { id: In(equipoIds) } })
      : [];

    const equiposById = new Map<number, Equipo>();
    equipos.forEach((equipo) => {
      equiposById.set(equipo.id, equipo);
    });

    return hallazgos.map((hallazgo) => {
      const equipo = equiposById.get(Number(hallazgo.equipoId));
      return this.toPublicHallazgo(hallazgo, equipo);
    });
  }

  private toPublicHallazgo(hallazgo: any, equipo?: Equipo) {
    return {
      id: hallazgo.id,
      mantenimientoId: hallazgo.mantenimientoId ?? null,
      tipoMantenimiento: hallazgo.tipoMantenimiento,
      modulo: hallazgo.modulo,
      descripcionHallazgo: hallazgo.descripcionHallazgo,
      cotizacion: hallazgo.cotizacion,
      observacion: hallazgo.observacion ?? null,
      estado: hallazgo.estado,
      fechaHallazgo: hallazgo.fechaHallazgo,
      fechaSolucion: hallazgo.fechaSolucion ?? null,
      idEquipo: equipo?.idEquipo ?? hallazgo.idEquipo ?? null,
      nombreEquipo: equipo?.nombreEquipo ?? hallazgo.nombreEquipo ?? null,
    };
  }

  private async recordEstadoTransition(
    hallazgoId: number,
    estadoAnterior: string | null,
    estadoNuevo: string | null,
    motivo: 'CREATED' | 'UPDATED',
  ) {
    const normalizedNuevo = String(estadoNuevo || '').trim().toUpperCase();
    if (!normalizedNuevo) {
      return;
    }

    const normalizedAnterior = estadoAnterior ? String(estadoAnterior).trim().toUpperCase() : null;

    await this.dataSource.query(
      `
        INSERT INTO hallazgo_estado_historial (hallazgo_id, estado_anterior, estado_nuevo, motivo)
        VALUES ($1, $2, $3, $4)
      `,
      [hallazgoId, normalizedAnterior, normalizedNuevo, motivo],
    );
  }

  private toPublicSolicitud(solicitud: Solicitud) {
    return {
      idSolicitud: Number(solicitud.idSolicitud),
      idHallazgo: Number(solicitud.idHallazgo),
      idEquipo: Number(solicitud.idEquipo),
      tipoSolicitud: solicitud.tipoSolicitud,
      fechaCreacion: solicitud.fechaCreacion,
      usuarioSolicitante: solicitud.usuarioSolicitante,
      estado: solicitud.estado,
      urlFormulario: solicitud.urlFormulario,
      fechaAperturaFormulario: solicitud.fechaAperturaFormulario,
    };
  }

  private removeFromFallbackByIds(ids: number[]) {
    const idSet = new Set(ids);
    if (!idSet.size) {
      return;
    }

    for (let index = this.hallazgosFallback.length - 1; index >= 0; index -= 1) {
      const row = this.hallazgosFallback[index];
      if (row && idSet.has(Number(row.id))) {
        this.hallazgosFallback.splice(index, 1);
      }
    }
  }
}
