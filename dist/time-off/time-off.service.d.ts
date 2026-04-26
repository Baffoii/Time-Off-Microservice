import { Repository, DataSource } from 'typeorm';
import { TimeOffRequest } from '../database/entities/time-off-request.entity';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { Employee } from '../database/entities/employee.entity';
import { Location } from '../database/entities/location.entity';
import { EmployeeLocation } from '../database/entities/employee-location.entity';
import { HcmClientService } from '../hcm-client/hcm-client.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { QueryTimeOffRequestsDto } from './dto/query-time-off-requests.dto';
export declare class TimeOffService {
    private readonly requestRepo;
    private readonly balanceRepo;
    private readonly employeeRepo;
    private readonly locationRepo;
    private readonly employeeLocationRepo;
    private readonly hcmClient;
    private readonly dataSource;
    private readonly logger;
    private readonly mutexMap;
    constructor(requestRepo: Repository<TimeOffRequest>, balanceRepo: Repository<TimeOffBalance>, employeeRepo: Repository<Employee>, locationRepo: Repository<Location>, employeeLocationRepo: Repository<EmployeeLocation>, hcmClient: HcmClientService, dataSource: DataSource);
    private getMutex;
    createRequest(dto: CreateTimeOffRequestDto): Promise<TimeOffRequest>;
    private processRequest;
    findById(id: string): Promise<TimeOffRequest | null>;
    findAll(query: QueryTimeOffRequestsDto): Promise<TimeOffRequest[]>;
}
