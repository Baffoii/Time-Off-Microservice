import { Module } from '@nestjs/common';
import { MockHcmController } from './mock-hcm.controller';
import { MockHcmService } from './mock-hcm.service';
import { MockHcmStore } from './mock-hcm-store';

@Module({
  controllers: [MockHcmController],
  providers: [MockHcmService, MockHcmStore],
  exports: [MockHcmService, MockHcmStore],
})
export class MockHcmModule {}
