import { Controller, Get, Param, Query } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { GetBalanceQueryDto } from './dto/get-balance.dto';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get(':employeeId')
  getByEmployee(@Param('employeeId') employeeId: string) {
    return this.balancesService.getByEmployee(employeeId);
  }

  @Get(':employeeId/:locationId')
  getByEmployeeAndLocation(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
    @Query() query: GetBalanceQueryDto,
  ) {
    return this.balancesService.getByEmployeeAndLocation(
      employeeId,
      locationId,
      query.refresh,
    );
  }
}
