import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TimeOffService } from './time-off.service';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { QueryTimeOffRequestsDto } from './dto/query-time-off-requests.dto';

@Controller('time-off-requests')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateTimeOffRequestDto) {
    return this.timeOffService.createRequest(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const request = await this.timeOffService.findById(id);
    if (!request) {
      throw new NotFoundException(`Time-off request with id ${id} not found`);
    }
    return request;
  }

  @Get()
  findAll(@Query() query: QueryTimeOffRequestsDto) {
    return this.timeOffService.findAll(query);
  }
}
