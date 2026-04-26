import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffBalance, BalanceSource } from '../database/entities/time-off-balance.entity';
import { HcmClientService } from '../hcm-client/hcm-client.service';

@Injectable()
export class BalancesService {
  private readonly logger = new Logger(BalancesService.name);

  constructor(
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    private readonly hcmClient: HcmClientService,
  ) {}

  async getByEmployee(employeeId: string): Promise<TimeOffBalance[]> {
    return this.balanceRepo.find({ where: { employeeId } });
  }

  async getByEmployeeAndLocation(
    employeeId: string,
    locationId: string,
    refresh = false,
  ): Promise<TimeOffBalance | null> {
    if (refresh) {
      try {
        const hcmBalance = await this.hcmClient.getBalance(employeeId, locationId);
        await this.upsertBalance(
          employeeId,
          locationId,
          hcmBalance.balanceDays,
          'HCM_REALTIME',
        );
      } catch (err) {
        this.logger.warn(
          `Failed to refresh balance from HCM for ${employeeId}/${locationId}: ${err.message}`,
        );
      }
    }
    return this.balanceRepo.findOne({ where: { employeeId, locationId } });
  }

  async upsertBalance(
    employeeId: string,
    locationId: string,
    days: number,
    source: BalanceSource,
    missingFromLatestBatch = false,
  ): Promise<TimeOffBalance> {
    let balance = await this.balanceRepo.findOne({
      where: { employeeId, locationId },
    });

    if (balance) {
      balance.balanceDays = parseFloat(days.toFixed(2));
      balance.source = source;
      balance.lastSyncedAt = new Date();
      balance.missingFromLatestBatch = missingFromLatestBatch;
    } else {
      balance = this.balanceRepo.create({
        employeeId,
        locationId,
        balanceDays: parseFloat(days.toFixed(2)),
        source,
        lastSyncedAt: new Date(),
        missingFromLatestBatch,
      });
    }

    return this.balanceRepo.save(balance);
  }

  async deductBalance(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<TimeOffBalance> {
    const balance = await this.balanceRepo.findOne({
      where: { employeeId, locationId },
    });
    if (!balance) {
      throw new Error(`Balance not found for ${employeeId}/${locationId}`);
    }
    const newBalance = parseFloat((balance.balanceDays - days).toFixed(2));
    balance.balanceDays = newBalance;
    return this.balanceRepo.save(balance);
  }
}
