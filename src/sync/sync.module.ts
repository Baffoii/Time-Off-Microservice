import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { HcmClientModule } from '../hcm-client/hcm-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([TimeOffBalance]), HcmClientModule],
  providers: [SyncService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
