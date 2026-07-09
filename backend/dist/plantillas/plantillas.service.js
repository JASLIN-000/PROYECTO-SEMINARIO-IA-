"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlantillasService = void 0;
const common_1 = require("@nestjs/common");
let PlantillasService = class PlantillasService {
    plantillas = [
        {
            id: 1,
            modulo: 'Electrico',
            plantillaObservacion: 'Se realizó revisión eléctrica del equipo y se verificó el estado general.',
            plantillaRecomendacion: 'Se recomienda mantener vigilancia en el tablero principal.',
        },
        {
            id: 2,
            modulo: 'Mecánico',
            plantillaObservacion: 'Se realizó revisión mecánica del sistema y se registraron hallazgos pendientes.',
            plantillaRecomendacion: 'Se recomienda revisar el estado de lubricación.',
        },
    ];
    findAll(modulo) {
        if (!modulo) {
            return this.plantillas;
        }
        return this.plantillas.filter((item) => item.modulo.toLowerCase() === modulo.toLowerCase());
    }
};
exports.PlantillasService = PlantillasService;
exports.PlantillasService = PlantillasService = __decorate([
    (0, common_1.Injectable)()
], PlantillasService);
//# sourceMappingURL=plantillas.service.js.map