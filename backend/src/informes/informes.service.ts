import { Injectable } from '@nestjs/common';

@Injectable()
export class InformesService {
  private readonly informes = [] as Array<any>;

  findAll() {
    return this.informes;
  }

  create(body: any) {
    const nuevo = {
      id: this.informes.length + 1,
      fechaGeneracion: new Date().toISOString(),
      ...body,
    };
    this.informes.push(nuevo);
    return nuevo;
  }
}
