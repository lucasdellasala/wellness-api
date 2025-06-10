import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { MealsService } from './meals.service';
import { MealAnalysisStatus } from '@prisma/client';
import { MEAL_ANALYSIS_QUEUE, MEAL_ANALYSIS_JOB } from './meals.constants';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from '../openai/openai.service';

@Processor(MEAL_ANALYSIS_QUEUE)
export class MealAnalysisProcessor {
  constructor(
    private readonly mealsService: MealsService,
    private readonly prisma: PrismaService,
    private readonly openaiService: OpenAIService,
  ) {}

  @Process(MEAL_ANALYSIS_JOB)
  async handleMealAnalysis(
    job: Job<{
      eventId: string;
      userId: string;
      imageUrl: string;
      imageBase64: string;
    }>,
  ) {
    try {
      const imageBase64 = job.data.imageBase64;
      const analysisResult = await this.openaiService.analyzeMeal(imageBase64);

      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: job.data.userId },
        });

        if (!user) {
          throw new Error(`User with ID ${job.data.userId} not found`);
        }

        const meal = await tx.meal.create({
          data: {
            userId: job.data.userId,
            calories: analysisResult.calories,
            proteins: analysisResult.proteins,
            carbs: analysisResult.carbs,
            fats: analysisResult.fats,
            tips: analysisResult.tips,
            aiInsights: analysisResult.aiInsights,
            imageUrl: job.data.imageUrl,
            analysisEventId: job.data.eventId,
            name: analysisResult.name,
          },
        });

        // 3. Actualizar el evento de análisis
        await this.mealsService.updateEventResult(
          job.data.eventId,
          analysisResult,
          MealAnalysisStatus.COMPLETED,
        );

        return meal;
      });

      return analysisResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      console.error('Error processing meal analysis:', errorMessage);

      await this.mealsService.updateEventResult(
        job.data.eventId,
        null,
        MealAnalysisStatus.FAILED,
        errorMessage,
      );
      throw error;
    }
  }
}
