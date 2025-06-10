import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { MealsModule } from './meals/meals.module';
import { MealsQueueModule } from './meals/meals-queue.module';
import { OpenAIModule } from './openai/openai.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StorageModule,
    MealsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        if (nodeEnv === 'production') {
          return {
            redis: {
              host: configService.get<string>('REDIS_HOST'), // IP IPv6 de Redis
              port: Number(configService.get<string>('REDIS_PORT')) || 6379,
              family: 6,
            },
          };
        } else {
          return {
            redis: configService.get<string>('REDIS_URL'),
          };
        }
      },
      inject: [ConfigService],
    }),
    MealsQueueModule,
    OpenAIModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
