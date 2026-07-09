import { InformesService } from './informes.service';
export declare class InformesController {
    private readonly informesService;
    constructor(informesService: InformesService);
    findAll(): any[];
    create(body: any): any;
}
