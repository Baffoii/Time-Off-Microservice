import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { MockHcmService } from './mock-hcm.service';

@Controller('hcm')
export class MockHcmController {
  constructor(private readonly mockHcmService: MockHcmService) {}

  @Get('balances/batch')
  getBatchBalances() {
    return this.mockHcmService.getBatchBalances();
  }

  @Get('balances/:employeeId/:locationId')
  getBalance(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.mockHcmService.getBalance(employeeId, locationId);
  }

  @Post('time-off')
  @HttpCode(HttpStatus.OK)
  submitTimeOff(
    @Body()
    body: { employeeId: string; locationId: string; days: number },
  ) {
    return this.mockHcmService.submitTimeOff(
      body.employeeId,
      body.locationId,
      body.days,
    );
  }

  @Post('admin/balances')
  @HttpCode(HttpStatus.OK)
  setBalance(
    @Body()
    body: { employeeId: string; locationId: string; balanceDays: number },
  ) {
    return this.mockHcmService.setBalance(
      body.employeeId,
      body.locationId,
      body.balanceDays,
    );
  }

  @Post('admin/mode')
  @HttpCode(HttpStatus.OK)
  setMode(@Body() body: { mode: string }) {
    return this.mockHcmService.setMode(body.mode as any);
  }

  @Post('admin/reset')
  @HttpCode(HttpStatus.OK)
  reset() {
    return this.mockHcmService.reset();
  }
}
