import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { MinioAdapter } from './adapters/minio.adapter';
import { TestAdapter } from './adapters/test.adapter';
import { IStorageAdapter } from './interfaces/storage.interface';
import { STORAGE_ADAPTER } from './storage.constants';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    StorageService,
    MinioAdapter,
    TestAdapter,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (configService: ConfigService): IStorageAdapter => {
        const isTestEnvironment =
          configService.get<string>('NODE_ENV') === 'test';
        return isTestEnvironment
          ? new TestAdapter()
          : new MinioAdapter(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
