import { Injectable } from '@nestjs/common';

@Injectable()
export class HallazgosService {
  private readonly hallazgos = [
    {
      id: 1,
      equipoId: 1,
      estado: 'Pendiente',
      descripcion: 'Vibración anormal en el compresor',
      requiereCotizacion: true,
      fechaMantenimiento: '2026-07-01',
    },
    {
      id: 2,
      equipoId: 1,
      estado: 'Solucionado',
      descripcion: 'Se ajustó el sistema de lubricación',
      requiereCotizacion: false,
      fechaMantenimiento: '2026-06-20',
    },
  ];

  findAll(equipoId?: string, estado?: string) {
    return this.hallazgos.filter((hallazgo) => {
      const byEquipo = !equipoId || hallazgo.equipoId === +equipoId;
      const byEstado = !estado || hallazgo.estado.toLowerCase() === estado.toLowerCase();
      return byEquipo && byEstado;
    });
  }

  create(body: any) {
    const nuevo = { id: this.hallazgos.length + 1, ...body };
    this.hallazgos.push(nuevo);
    return nuevo;
  }

  update(id: number, body: any) {
    const index = this.hallazgos.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    this.hallazgos[index] = { ...this.hallazgos[index], ...body };
    return this.hallazgos[index];
  }
}
