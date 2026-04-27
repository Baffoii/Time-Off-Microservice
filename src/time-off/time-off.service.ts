import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindManyOptions } from 'typeorm';
import { Mutex } from 'async-mutex';
import { TimeOffRequest } from '../database/entities/time-off-request.entity';
import { TimeOffBalance } from '../database/entities/time-off-balance.entity';
import { Employee } from '../database/entities/employee.entity';
import { Location } from '../database/entities/location.entity';
import { EmployeeLocation } from '../database/entities/employee-location.entity';
import { HcmClientService } from '../hcm-client/hcm-client.service';
import {
  EmployeeNotFoundException,
  LocationNotFoundException,
  InactiveEmployeeException,
  InactiveEmployeeLocationException,
  InsufficientBalanceException,
  HcmTimeoutError,
} from '../common/exceptions';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { QueryTimeOffRequestsDto } from './dto/query-time-off-requests.dto';

@Injectable()
export class TimeOffService {
  private readonly logger = new Logger(TimeOffService.name);
  private readonly mutexMap = new Map<string, Mutex>();

  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly requestRepo: Repository<TimeOffRequest>,
    @InjectRepository(TimeOffBalance)
    private readonly balanceRepo: Repository<TimeOffBalance>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(EmployeeLocation)
    private readonly employeeLocationRepo: Repository<EmployeeLocation>,
    private readonly hcmClient: HcmClientService,
    private readonly dataSource: DataSource,
  ) {}

  private getMutex(employeeId: string, locationId: string): Mutex {
    const key = `${employeeId}:${locationId}`;
    if (!this.mutexMap.has(key)) {
      this.mutexMap.set(key, new Mutex());
    }
    return this.mutexMap.get(key);
  }

  async createRequest(dto: CreateTimeOffRequestDto): Promise<TimeOffRequest> {
    const { employeeId, locationId, requestedDays, idempotencyKey } = dto;

    // 1. Validate requestedDays > 0
    if (requestedDays <= 0) {
      throw new BadRequestException('requestedDays must be greater than 0');
    }

    // 2. Validate employee exists and is ACTIVE
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new EmployeeNotFoundException(employeeId);
    }
    if (employee.status !== 'ACTIVE') {
      throw new InactiveEmployeeException(employeeId);
    }

    // 3. Validate location exists
    const location = await this.locationRepo.findOne({
      where: { id: locationId },
    });
    if (!location) {
      throw new LocationNotFoundException(locationId);
    }

    // 4. Validate EmployeeLocation pairing is active
    const el = await this.employeeLocationRepo.findOne({
      where: { employeeId, locationId },
    });
    if (!el || !el.active) {
      throw new InactiveEmployeeLocationException(employeeId, locationId);
    }

    // 5. Check idempotency key
    if (idempotencyKey) {
      const existing = await this.requestRepo.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        this.logger.log(
          `Idempotency key ${idempotencyKey} already exists, returning existing request`,
        );
        return existing;
      }
    }

    // Use per-employee-location mutex for concurrency control
    const mutex = this.getMutex(employeeId, locationId);
    return mutex.runExclusive(async () => {
      return this.processRequest(employeeId, locationId, requestedDays, idempotencyKey);
    });
  }

  private async processRequest(
    employeeId: string,
    locationId: string,
    requestedDays: number,
    idempotencyKey?: string,
  ): Promise<TimeOffRequest> {
    // 6. Load local balance - reject if insufficient
    const localBalance = await this.balanceRepo.findOne({
      where: { employeeId, locationId },
    });

    const localDays = localBalance ? Number(localBalance.balanceDays) : 0;
    if (localDays < requestedDays - 0.001) {
      throw new InsufficientBalanceException(localDays, requestedDays);
    }

    // 7. Fetch realtime HCM balance
    let hcmDays: number;
    try {
      const hcmBalance = await this.hcmClient.getBalance(employeeId, locationId);
      hcmDays = Number(hcmBalance.balanceDays);
    } catch (err) {
      // 8. If HCM call times out → create FAILED request
      if (err instanceof HcmTimeoutError) {
        const failedRequest = this.requestRepo.create({
          employeeId,
          locationId,
          requestedDays,
          status: 'FAILED',
          failureReason: `HCM timeout during balance check: ${err.message}`,
          idempotencyKey: idempotencyKey || null,
          hcmTransactionId: null,
        });
        return this.requestRepo.save(failedRequest);
      }
      throw err;
    }

    // 9. Update local balance if HCM differs
    if (Math.abs(hcmDays - localDays) > 0.001) {
      this.logger.log(
        `Updating local balance for ${employeeId}/${locationId}: ${localDays} -> ${hcmDays}`,
      );
      if (localBalance) {
        localBalance.balanceDays = hcmDays;
        localBalance.source = 'HCM_REALTIME';
        localBalance.lastSyncedAt = new Date();
        await this.balanceRepo.save(localBalance);
      }
    }

    // 10. Defensive check: if updated balance still < requestedDays → reject
    const effectiveDays = hcmDays;
    if (effectiveDays < requestedDays - 0.001) {
      throw new InsufficientBalanceException(effectiveDays, requestedDays);
    }

    // 11-14. Submit to HCM and handle response (in a DB transaction)
    return this.dataSource.transaction(async (manager) => {
      const balanceRepoTx = manager.getRepository(TimeOffBalance);
      const requestRepoTx = manager.getRepository(TimeOffRequest);

      let hcmResult: { transactionId: string | null; success: boolean };

      // 11. Submit deduction to HCM
      try {
        hcmResult = await this.hcmClient.submitTimeOff(
          employeeId,
          locationId,
          requestedDays,
        );
      } catch (err) {
        // 12. If HCM times out or errors → create FAILED request (do NOT deduct locally)
        const failedRequest = requestRepoTx.create({
          employeeId,
          locationId,
          requestedDays,
          status: 'FAILED',
          failureReason: `HCM error during submit: ${err.message}`,
          idempotencyKey: idempotencyKey || null,
          hcmTransactionId: null,
        });
        return requestRepoTx.save(failedRequest);
      }

      if (!hcmResult.success) {
        const failedRequest = requestRepoTx.create({
          employeeId,
          locationId,
          requestedDays,
          status: 'FAILED',
          failureReason: `HCM rejected the request`,
          idempotencyKey: idempotencyKey || null,
          hcmTransactionId: null,
        });
        return requestRepoTx.save(failedRequest);
      }

      // Deduct local balance
      const balanceToDeduct = await balanceRepoTx.findOne({
        where: { employeeId, locationId },
      });
      if (balanceToDeduct) {
        balanceToDeduct.balanceDays = parseFloat(
          (Number(balanceToDeduct.balanceDays) - requestedDays).toFixed(2),
        );
        await balanceRepoTx.save(balanceToDeduct);
      }

      let status: 'APPROVED' | 'APPROVED_WITH_WARNING';

      // 13. If HCM returns success with no transaction ID → APPROVED_WITH_WARNING
      // 14. If HCM returns success with transaction ID → APPROVED
      if (!hcmResult.transactionId) {
        status = 'APPROVED_WITH_WARNING';
        this.logger.warn(
          `HCM returned no transaction ID for ${employeeId}/${locationId}, marking APPROVED_WITH_WARNING`,
        );
      } else {
        status = 'APPROVED';
      }

      const approvedRequest = requestRepoTx.create({
        employeeId,
        locationId,
        requestedDays,
        status,
        failureReason: null,
        hcmTransactionId: hcmResult.transactionId || null,
        idempotencyKey: idempotencyKey || null,
      });
      return requestRepoTx.save(approvedRequest);
    });
  }

  async findById(id: string): Promise<TimeOffRequest | null> {
    return this.requestRepo.findOne({ where: { id } });
  }

  async findAll(query: QueryTimeOffRequestsDto): Promise<TimeOffRequest[]> {
    const where: FindManyOptions<TimeOffRequest>['where'] = {};
    if (query.employeeId) where['employeeId'] = query.employeeId;
    if (query.locationId) where['locationId'] = query.locationId;
    if (query.status) where['status'] = query.status as any;
    return this.requestRepo.find({ where, order: { createdAt: 'DESC' } });
  }
}
