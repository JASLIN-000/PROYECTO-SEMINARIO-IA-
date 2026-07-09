import { Injectable } from '@nestjs/common';

@Injectable()
export class EquiposService {
  private readonly equipos = [
    {
      idEquipo: 1,
      nombreEquipo: 'Compresor principal',
      acuerdoNivelServicio: 'DH-01',
      estado: 'Operativo',
      diaHabil: true,
    },
    {
      idEquipo: 2,
      nombreEquipo: 'Sistema de bombeo',
      acuerdoNivelServicio: 'DH-02',
      estado: 'Mantenimiento',
      diaHabil: true,
    },
    {
      idEquipo: 3,
      nombreEquipo: 'Panel eléctrico A',
      acuerdoNivelServicio: 'DH-03',
      estado: 'Operativo',
      diaHabil: false,
    },
  ];

  findAll(q?: string) {
    const term = (q ?? '').toLowerCase().trim();
    const filtered = this.equipos.filter((equipo) => {
      if (!term) {
        return equipo.diaHabil;
      }
      return (
        equipo.nombreEquipo.toLowerCase().includes(term) ||
        String(equipo.idEquipo).includes(term)
      );
    });

    return filtered;
  }
}
