import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MealAnalysisProcessor } from './meal-analysis.processor';
import { MealsModule } from './meals.module';
import { MEAL_ANALYSIS_QUEUE } from './meals.constants';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAIService } from '../openai/openai.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MEAL_ANALYSIS_QUEUE,
    }),
    MealsModule,
    PrismaModule,
  ],
  providers: [MealAnalysisProcessor, OpenAIService],
  exports: [],
})
export class MealsQueueModule {}
