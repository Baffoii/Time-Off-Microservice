import { TimeOffService } from './time-off.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { QueryTimeOffRequestsDto } from './dto/query-time-off-requests.dto';
export declare class TimeOffController {
    private readonly timeOffService;
    constructor(timeOffService: TimeOffService);
    create(dto: CreateTimeOffRequestDto): Promise<import("../database/entities").TimeOffRequest>;
    findOne(id: string): Promise<import("../database/entities").TimeOffRequest>;
    findAll(query: QueryTimeOffRequestsDto): Promise<import("../database/entities").TimeOffRequest[]>;
}
