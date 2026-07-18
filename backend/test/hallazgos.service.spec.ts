import { describe, expect, it, jest } from '@jest/globals';
import { HallazgosService } from '../src/hallazgos/hallazgos.service';

describe('HallazgosService', () => {
  it('records estado transition when update changes estado', async () => {
    const mockEquiposRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as any;

    const mockHallazgosRepository = {
      findOne: jest.fn(),
      merge: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as any;

    const mockPlantillasRepository = {
      createQueryBuilder: jest.fn(),
    } as any;

    const mockDataSource = {
      query: jest.fn(),
    } as any;

    const current = {
      id: 5,
      equipoId: 22,
      estado: 'PENDIENTE',
      modulo: 'LIMPIEZA L1',
      descripcionHallazgo: 'detalle',
      cotizacion: 'NO',
      observacion: null,
      fechaHallazgo: '2026-07-10',
      fechaSolucion: null,
      tipoMantenimiento: 'PREVENTIVO',
      mantenimientoId: null,
    };

    const saved = {
      ...current,
      estado: 'SOLUCIONADO',
      fechaSolucion: '2026-07-16',
    };

    mockHallazgosRepository.findOne.mockResolvedValueOnce(current);
    mockHallazgosRepository.merge.mockReturnValue(saved);
    mockHallazgosRepository.save.mockResolvedValue(saved);
    mockEquiposRepository.find.mockResolvedValue([{ id: 22, idEquipo: '1234S-01', nombreEquipo: 'EQ 1' }]);
    mockDataSource.query.mockResolvedValue(undefined);

    const service = new HallazgosService(
      mockEquiposRepository,
      mockHallazgosRepository,
      mockPlantillasRepository,
      mockDataSource,
    );

    const result = await service.update(5, { estado: 'SOLUCIONADO' } as any);

    expect(result).toBeTruthy();
    const insertCalls = mockDataSource.query.mock.calls.filter((call: any[]) =>
      String(call[0]).includes('INSERT INTO hallazgo_estado_historial'),
    );
    expect(insertCalls.length).toBe(1);
    expect(insertCalls[0][1][0]).toBe(5);
    expect(insertCalls[0][1][1]).toBe('PENDIENTE');
    expect(insertCalls[0][1][2]).toBe('SOLUCIONADO');
  });
});
