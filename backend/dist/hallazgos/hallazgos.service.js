"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HallazgosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const hallazgo_entity_1 = require("../common/entities/hallazgo.entity");
let HallazgosService = class HallazgosService {
    hallazgosRepository;
    constructor(hallazgosRepository) {
        this.hallazgosRepository = hallazgosRepository;
    }
    findAll(equipoId, estado) {
        const query = this.hallazgosRepository.createQueryBuilder('hallazgo');
        if (equipoId) {
            query.andWhere('hallazgo.equipoId = :equipoId', { equipoId: Number(equipoId) });
        }
        if (estado) {
            query.andWhere('LOWER(hallazgo.estado) = :estado', {
                estado: estado.toLowerCase(),
            });
        }
        return query.getMany();
    }
    create(body) {
        return this.hallazgosRepository.save(body);
    }
    async update(id, body) {
        const hallazgo = await this.hallazgosRepository.preload({ id, ...body });
        if (!hallazgo) {
            return null;
        }
        return this.hallazgosRepository.save(hallazgo);
    }
};
exports.HallazgosService = HallazgosService;
exports.HallazgosService = HallazgosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(hallazgo_entity_1.Hallazgo)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], HallazgosService);
//# sourceMappingURL=hallazgos.service.js.map