import { LocationsService } from './locations.service';
export declare class LocationsController {
    private readonly locationsService;
    constructor(locationsService: LocationsService);
    findAll(): Promise<import("../database/entities").Location[]>;
    findOne(id: string): Promise<import("../database/entities").Location>;
}
