import { z } from 'zod';

export const NutritionSchema = z.object({
  calories: z.number(),
  proteins: z.number(),
  carbs: z.number(),
  fats: z.number(),
  tips: z.array(z.string()),
  aiInsights: z.string(),
  name: z.string(),
});
