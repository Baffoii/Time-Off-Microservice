import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { MockHcmModule } from './mock-hcm.module';

@Module({ imports: [MockHcmModule] })
class MockHcmAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(MockHcmAppModule, { logger: ['log', 'error', 'warn'] });
  const port = process.env.MOCK_HCM_PORT || 3001;
  await app.listen(port);
  console.log(`Mock HCM server running on http://localhost:${port}`);
  console.log(`  GET  /hcm/balances/batch`);
  console.log(`  GET  /hcm/balances/:employeeId/:locationId`);
  console.log(`  POST /hcm/time-off`);
  console.log(`  POST /hcm/admin/balances   (set balance directly)`);
  console.log(`  POST /hcm/admin/mode       (normal|unreliableValidation|timeout|serverError)`);
  console.log(`  POST /hcm/admin/reset`);
}

bootstrap();
