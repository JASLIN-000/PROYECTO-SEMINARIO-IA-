"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallazgosService = void 0;
const common_1 = require("@nestjs/common");
let HallazgosService = class HallazgosService {
    hallazgos = [
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
    findAll(equipoId, estado) {
        return this.hallazgos.filter((hallazgo) => {
            const byEquipo = !equipoId || hallazgo.equipoId === +equipoId;
            const byEstado = !estado || hallazgo.estado.toLowerCase() === estado.toLowerCase();
            return byEquipo && byEstado;
        });
    }
    create(body) {
        const nuevo = { id: this.hallazgos.length + 1, ...body };
        this.hallazgos.push(nuevo);
        return nuevo;
    }
    update(id, body) {
        const index = this.hallazgos.findIndex((item) => item.id === id);
        if (index === -1) {
            return null;
        }
        this.hallazgos[index] = { ...this.hallazgos[index], ...body };
        return this.hallazgos[index];
    }
};
exports.HallazgosService = HallazgosService;
exports.HallazgosService = HallazgosService = __decorate([
    (0, common_1.Injectable)()
], HallazgosService);
//# sourceMappingURL=hallazgos.service.js.map