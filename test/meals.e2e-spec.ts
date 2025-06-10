import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { MealAnalysisStatus } from '@prisma/client';
import { MealsModule } from '../src/meals/meals.module';
import { StorageModule } from '../src/storage/storage.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MEAL_ANALYSIS_QUEUE } from '../src/meals/meals.constants';
import { AppModule } from '../src/app.module';

interface MealAnalysisResponse {
  id: string;
  eventId: string;
  status: MealAnalysisStatus;
  userId: string;
  imageUrl: string;
  result?: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    tips: string[];
    aiInsights: string;
  };
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

describe('MealsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventId: string;
  const testUserId = 'test-user-e2e';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        StorageModule,
        PrismaModule,
        MealsModule,
      ],
    })
      .overrideProvider(getQueueToken(MEAL_ANALYSIS_QUEUE))
      .useValue({ add: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test users in database
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: `${testUserId}@test.com`,
        name: 'Test User E2E',
      },
    });

    // Also create the default test-user for the mocked tests
    await prisma.user.upsert({
      where: { id: 'test-user' },
      update: {},
      create: {
        id: 'test-user',
        email: 'test-user@test.com',
        name: 'Test User Default',
      },
    });
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await prisma.meal.deleteMany({
        where: { userId: { in: [testUserId, 'test-user'] } },
      });
      await prisma.mealAnalysisEvent.deleteMany({
        where: { userId: { in: [testUserId, 'test-user'] } },
      });
      await prisma.user
        .delete({
          where: { id: testUserId },
        })
        .catch(() => {
          // Ignore if user doesn't exist
        });
      await prisma.user
        .delete({
          where: { id: 'test-user' },
        })
        .catch(() => {
          // Ignore if user doesn't exist
        });

      // Close connections properly
      await prisma.$disconnect();
    } catch (error) {
      console.warn('Cleanup error (ignored):', error);
    } finally {
      await app.close();
    }
  }, 30000);

  describe('Mocked Queue Tests', () => {
    it('should upload and analyze a meal image', async () => {
      const imagePath = path.join(__dirname, 'test-meal.jpg');
      const imageBuffer = fs.readFileSync(imagePath);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .post('/meals/analyze')
        .attach('image', imageBuffer, {
          filename: 'test-meal.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const body = response.body as { eventId: string };
      expect(body).toHaveProperty('eventId');
      eventId = body.eventId;
      expect(eventId).toBeDefined();
    });

    it('should get initial pending status', async () => {
      // Waiting for the event to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .get(`/meals/status/${eventId}`)
        .expect(200);

      const body = response.body as MealAnalysisResponse;
      expect(body).toMatchObject({
        id: eventId,
        userId: 'test-user',
        status: MealAnalysisStatus.PENDING,
        imageUrl: body.imageUrl,
      });
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('should maintain pending status (processor is mocked)', async () => {
      // Wait a bit to ensure the status doesn't change (processor is mocked)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const response = await request(app.getHttpServer())
        .get(`/meals/status/${eventId}`)
        .expect(200);

      const body = response.body as MealAnalysisResponse;
      expect(body).toMatchObject({
        id: eventId,
        status: MealAnalysisStatus.PENDING,
        userId: 'test-user',
        imageUrl: body.imageUrl,
      });
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = 'non-existent-id';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await request(app.getHttpServer())
        .get(`/meals/status/${nonExistentId}`)
        .expect(404);
    });

    it('should verify event was created in database', async () => {
      const dbEvent = await prisma.mealAnalysisEvent.findUnique({
        where: { id: eventId },
      });

      expect(dbEvent).toBeDefined();
      expect(dbEvent).toMatchObject({
        id: eventId,
        userId: 'test-user',
        status: MealAnalysisStatus.PENDING,
      });
      expect(dbEvent?.imageUrl).toBeDefined();
      expect(dbEvent?.createdAt).toBeDefined();
      expect(dbEvent?.updatedAt).toBeDefined();
    });
  });
});

describe.skip('MealsController with Real Processor (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let realEventId: string;
  const testUserId = 'test-user-processor';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        StorageModule,
        PrismaModule,
        MealsModule,
        AppModule,
      ],
    })
      // Don't override the queue - let the real processor run
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test users in database
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: `${testUserId}@test.com`,
        name: 'Test User Processor',
      },
    });

    // Also create the default test-user for the processor
    await prisma.user.upsert({
      where: { id: 'test-user' },
      update: {},
      create: {
        id: 'test-user',
        email: 'test-user@test.com',
        name: 'Test User Default',
      },
    });
  });

  afterAll(async () => {
    try {
      // Clean up test data
      await prisma.meal.deleteMany({
        where: { userId: { in: [testUserId, 'test-user'] } },
      });
      await prisma.mealAnalysisEvent.deleteMany({
        where: { userId: { in: [testUserId, 'test-user'] } },
      });
      await prisma.user
        .delete({
          where: { id: testUserId },
        })
        .catch(() => {
          // Ignore if user doesn't exist
        });
      await prisma.user
        .delete({
          where: { id: 'test-user' },
        })
        .catch(() => {
          // Ignore if user doesn't exist
        });

      // Close connections properly
      await prisma.$disconnect();
    } catch (error) {
      console.warn('Cleanup error (ignored):', error);
    } finally {
      await app.close();
    }
  }, 30000);

  // Tests with real Redis/Bull queue processor
  it('should process meal analysis and create meal record', async () => {
    const imagePath = path.join(__dirname, 'test-meal.jpg');
    const imageBuffer = fs.readFileSync(imagePath);

    // Upload and analyze
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .post('/meals/analyze')
      .attach('image', imageBuffer, {
        filename: 'test-meal.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const body = response.body as { eventId: string };
    realEventId = body.eventId;

    // Wait for processor to complete (it simulates 2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify event was updated to COMPLETED
    const updatedEvent = await prisma.mealAnalysisEvent.findUnique({
      where: { id: realEventId },
    });

    expect(updatedEvent).toBeDefined();
    expect(updatedEvent?.status).toBe(MealAnalysisStatus.COMPLETED);
    expect(updatedEvent?.result).toBeDefined();

    // Verify meal was created
    const createdMeal = await prisma.meal.findFirst({
      where: {
        userId: 'test-user',
        analysisEventId: realEventId,
      },
    });

    expect(createdMeal).toBeDefined();
    expect(createdMeal).toMatchObject({
      userId: 'test-user',
      analysisEventId: realEventId,
      calories: 450,
      proteins: 25,
      carbs: 45,
      fats: 15,
    });
    expect(createdMeal?.tips).toEqual([
      'Considera agregar más vegetales',
      'Buena fuente de proteínas',
    ]);
    expect(createdMeal?.aiInsights).toBe(
      'Esta comida parece ser una opción balanceada...',
    );
  }, 15000); // 15 second timeout for processor

  it('should verify API returns completed status with result', async () => {
    // Check API response shows completed status
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/meals/status/${realEventId}`)
      .expect(200);

    const body = response.body as MealAnalysisResponse;
    expect(body.status).toBe(MealAnalysisStatus.COMPLETED);
    expect(body.result).toBeDefined();
    expect(body.result).toMatchObject({
      calories: 450,
      proteins: 25,
      carbs: 45,
      fats: 15,
      tips: ['Considera agregar más vegetales', 'Buena fuente de proteínas'],
      aiInsights: 'Esta comida parece ser una opción balanceada...',
    });
  });
});
