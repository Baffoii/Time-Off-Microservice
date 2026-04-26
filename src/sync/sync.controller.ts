import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SyncService, HcmBatchBalance } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('hcm/batch')
  @HttpCode(HttpStatus.OK)
  batchSync(@Body() payload: HcmBatchBalance[]) {
    return this.syncService.batchSync(payload);
  }

  @Post('hcm/reconcile/:employeeId/:locationId')
  @HttpCode(HttpStatus.OK)
  reconcile(
    @Param('employeeId') employeeId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.syncService.reconcile(employeeId, locationId);
  }
}
