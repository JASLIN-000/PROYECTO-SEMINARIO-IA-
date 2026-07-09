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
exports.EquiposController = void 0;
const common_1 = require("@nestjs/common");
const equipos_service_1 = require("./equipos.service");
let EquiposController = class EquiposController {
    equiposService;
    constructor(equiposService) {
        this.equiposService = equiposService;
    }
    findAll(q) {
        return this.equiposService.findAll(q);
    }
};
exports.EquiposController = EquiposController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EquiposController.prototype, "findAll", null);
exports.EquiposController = EquiposController = __decorate([
    (0, common_1.Controller)('equipos'),
    __metadata("design:paramtypes", [equipos_service_1.EquiposService])
], EquiposController);
//# sourceMappingURL=equipos.controller.js.map