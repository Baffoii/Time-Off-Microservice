import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { BalancesService } from './balances.service';
import { BalancesController } from './balances.controller';
import { HcmClientModule } from '../hcm-client/hcm-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([TimeOffBalance]), HcmClientModule],
  providers: [BalancesService],
  controllers: [BalancesController],
  exports: [BalancesService],
})
export class BalancesModule {}
