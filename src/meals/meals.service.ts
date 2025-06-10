import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import {
  MealAnalysisStatus,
  MealAnalysisEvent as PrismaMealAnalysisEvent,
  Prisma,
} from '@prisma/client';
import { MEAL_ANALYSIS_QUEUE, MEAL_ANALYSIS_JOB } from './meals.constants';

export interface MealAnalysisEvent {
  id: string;
  userId: string; // TODO: Implement authentication
  imageUrl: string;
  imageBase64: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  result?: {
    calories?: number;
    proteins?: number;
    carbs?: number;
    fats?: number;
    tips?: string[];
    aiInsights?: string;
  };
  error?: string;
}

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    @InjectQueue(MEAL_ANALYSIS_QUEUE) private readonly mealAnalysisQueue: Queue,
  ) {}

  private fileToBase64(file: Express.Multer.File): string {
    return file.buffer.toString('base64');
  }

  async analyzeMealImage(
    file: Express.Multer.File,
    userId: string = 'test-user',
  ): Promise<{ eventId: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const imageUrl = await this.storageService.uploadFile(file);
      const imageBase64 = this.fileToBase64(file);

      const createdEvent = await this.prisma.mealAnalysisEvent.create({
        data: {
          userId,
          imageUrl,
          status: MealAnalysisStatus.PENDING,
        },
      });

      await this.mealAnalysisQueue.add(MEAL_ANALYSIS_JOB, {
        eventId: createdEvent.id,
        userId,
        imageUrl,
        imageBase64,
      });

      return { eventId: createdEvent.id };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error analyzing meal image: ${errorMessage}`);
      throw error;
    }
  }

  async getMealAnalysisStatus(
    eventId: string,
  ): Promise<PrismaMealAnalysisEvent> {
    const event = await this.prisma.mealAnalysisEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  async updateEventResult(
    eventId: string,
    result: {
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
      tips: string[];
      aiInsights: string;
    } | null,
    status: MealAnalysisStatus,
    error?: string,
  ): Promise<PrismaMealAnalysisEvent> {
    return await this.prisma.mealAnalysisEvent.update({
      where: { id: eventId },
      data: {
        status,
        result: result ?? Prisma.DbNull,
        error: error ?? null,
      },
    });
  }
}
