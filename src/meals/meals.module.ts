import { Module } from '@nestjs/common';
import { MealsController } from './meals.controller';
import { MealsService } from './meals.service';
import { StorageModule } from '../storage/storage.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { MEAL_ANALYSIS_QUEUE } from './meals.constants';

@Module({
  imports: [
    StorageModule,
    PrismaModule,
    BullModule.registerQueue({
      name: MEAL_ANALYSIS_QUEUE,
    }),
  ],
  controllers: [MealsController],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}
