import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HcmClientService } from './hcm-client.service';
import { HCM_CLIENT_SERVICE } from './hcm-client.interface';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('HCM_TIMEOUT_MS', 5000),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    HcmClientService,
    {
      provide: HCM_CLIENT_SERVICE,
      useExisting: HcmClientService,
    },
  ],
  exports: [HcmClientService, HCM_CLIENT_SERVICE],
})
export class HcmClientModule {}
