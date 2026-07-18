import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Modulo } from '../common/entities/modulo.entity';

const DEFAULT_ALLOWED_MODULES = [
  'VERIFICACION DE SEGURIDAD Y CALIDAD',
  'LIMPIEZA L1',
  'LIMPIEZA L2',
  'SISTEMA PARACAIDA, LIMITADOR DE VELOCIDAD Y PESACARGAS',
  'LIMPIEZA L3',
  'SISTEMA MAQUINA FRENO',
  'SISTEMA SUSPENSION',
  'SISTEMA ELECTRIFICACION',
  'SISTEMA PUERTAS DE CABINA',
  'SISTEMA PUERTAS DE PISO',
  'ACTUALIZAR EQUIPO',
  'CAMBIO DE CABLES',
];

@Injectable()
export class ModulosService {
  private schemaReady?: Promise<void>;

  constructor(
    @InjectRepository(Modulo)
    private readonly modulosRepository: Repository<Modulo>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    await this.ensureSchema();

    const modulos = await this.modulosRepository.find({
      where: { activo: true },
      order: { nombreModulo: 'ASC' },
    });

    return modulos.map((modulo) => ({
      id: modulo.id,
      nombreModulo: modulo.nombreModulo,
    }));
  }

  private async ensureSchema() {
    if (!this.schemaReady) {
      const moduloInserts = DEFAULT_ALLOWED_MODULES.map(
        (moduleName) =>
          `INSERT INTO modulos (nombre_modulo) VALUES ('${moduleName.replace(/'/g, "''")}') ON CONFLICT (nombre_modulo) DO NOTHING;`,
      ).join('\n');

      this.schemaReady = this.dataSource
        .query(`
          CREATE TABLE IF NOT EXISTS modulos (
            id BIGSERIAL PRIMARY KEY,
            nombre_modulo VARCHAR(200) NOT NULL UNIQUE,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );

          ${moduloInserts}
        `)
        .then(() => undefined);
    }

    await this.schemaReady;
  }
}
