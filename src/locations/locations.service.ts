import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../database/entities/location.entity';
import { LocationNotFoundException } from '../common/exceptions';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async findAll(): Promise<Location[]> {
    return this.locationRepo.find();
  }

  async findById(id: string): Promise<Location> {
    const location = await this.locationRepo.findOne({ where: { id } });
    if (!location) {
      throw new LocationNotFoundException(id);
    }
    return location;
  }
}
