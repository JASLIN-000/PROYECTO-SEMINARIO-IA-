import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateHallazgoDto } from '../src/common/dto/create-hallazgo.dto';

describe('CreateHallazgoDto validation', () => {
  it('accepts a valid minimal payload', async () => {
    const dto = plainToInstance(CreateHallazgoDto, {
      equipoId: 10,
      modulo: 'LIMPIEZA L1',
      descripcionHallazgo: 'Fuga menor detectada',
      estado: 'ABIERTO',
      cotizacion: 'SI',
      fechaHallazgo: '2026-07-16',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid estado values', async () => {
    const dto = plainToInstance(CreateHallazgoDto, {
      equipoId: 10,
      modulo: 'LIMPIEZA L1',
      descripcionHallazgo: 'Detalle',
      estado: 'INVALIDO',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((item) => item.property === 'estado')).toBe(true);
  });
});
