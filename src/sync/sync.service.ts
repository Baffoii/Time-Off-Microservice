import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { HcmClientService } from '../hcm-client/hcm-client.service';

export interface HcmBatchBalance {
  employeeId: string;
  locationId: string;
  balanceDays: number;
}

export interface BatchSyncSummary {
  updated: number;
  inserted: number;
  skipped: number;
  quarantined: number;
  stillMissing: number;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    private readonly hcmClient: HcmClientService,
    private readonly dataSource: DataSource,
  ) {}

  async batchSync(payload: HcmBatchBalance[]): Promise<BatchSyncSummary> {
    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    let quarantined = 0;

    await this.dataSource.transaction(async (manager) => {
      const balanceRepoTx = manager.getRepository(TimeOffBalance);

      // Step 1: Mark all existing balances as missingFromLatestBatch = true
      await manager
        .createQueryBuilder()
        .update(TimeOffBalance)
        .set({ missingFromLatestBatch: true })
        .execute();

      // Step 2: Deduplicate payload (last-wins by order)
      const seen = new Map<string, HcmBatchBalance>();
      const conflicts: string[] = [];

      for (const item of payload) {
        const key = `${item.employeeId}:${item.locationId}`;
        if (seen.has(key)) {
          conflicts.push(key);
          this.logger.warn(
            `Duplicate record in batch for ${key}, using last occurrence`,
          );
        }
        seen.set(key, item);
      }

      if (conflicts.length > 0) {
        skipped += conflicts.length;
      }

      // Step 3: Process each unique balance
      for (const [, item] of seen.entries()) {
        // Validate: skip/quarantine negative balance
        if (item.balanceDays < 0) {
          this.logger.warn(
            `Quarantining negative balance for ${item.employeeId}/${item.locationId}: ${item.balanceDays}`,
          );
          quarantined++;
          continue;
        }

        const existing = await balanceRepoTx.findOne({
          where: {
            employeeId: item.employeeId,
            locationId: item.locationId,
          },
        });

        if (existing) {
          existing.balanceDays = parseFloat(item.balanceDays.toFixed(2));
          existing.source = 'HCM_BATCH';
          existing.lastSyncedAt = new Date();
          existing.missingFromLatestBatch = false;
          await balanceRepoTx.save(existing);
          updated++;
        } else {
          const newBalance = balanceRepoTx.create({
            employeeId: item.employeeId,
            locationId: item.locationId,
            balanceDays: parseFloat(item.balanceDays.toFixed(2)),
            source: 'HCM_BATCH',
            lastSyncedAt: new Date(),
            missingFromLatestBatch: false,
          });
          await balanceRepoTx.save(newBalance);
          inserted++;
        }
      }
    });

    // Count still-missing after transaction
    const stillMissing = await this.balanceRepo.count({
      where: { missingFromLatestBatch: true },
    });

    this.logger.log(
      `Batch sync complete: updated=${updated}, inserted=${inserted}, skipped=${skipped}, quarantined=${quarantined}, stillMissing=${stillMissing}`,
    );

    return { updated, inserted, skipped, quarantined, stillMissing };
  }

  async reconcile(
    employeeId: string,
    locationId: string,
  ): Promise<TimeOffBalance> {
    const hcmBalance = await this.hcmClient.getBalance(employeeId, locationId);

    let balance = await this.balanceRepo.findOne({
      where: { employeeId, locationId },
    });

    if (balance) {
      balance.balanceDays = parseFloat(hcmBalance.balanceDays.toFixed(2));
      balance.source = 'HCM_REALTIME';
      balance.lastSyncedAt = new Date();
      balance.missingFromLatestBatch = false;
    } else {
      balance = this.balanceRepo.create({
        employeeId,
        locationId,
        balanceDays: parseFloat(hcmBalance.balanceDays.toFixed(2)),
        source: 'HCM_REALTIME',
        lastSyncedAt: new Date(),
        missingFromLatestBatch: false,
      });
    }

    return this.balanceRepo.save(balance);
  }
}
