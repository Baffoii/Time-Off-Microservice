import { Repository } from 'typeorm';
import { Location } from '../database/entities/location.entity';
export declare class LocationsService {
    private readonly locationRepo;
    constructor(locationRepo: Repository<Location>);
    findAll(): Promise<Location[]>;
    findById(id: string): Promise<Location>;
}
