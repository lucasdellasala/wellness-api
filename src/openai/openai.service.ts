import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { NutritionSchema } from './schemas/nutrition.schema';
import { z } from 'zod';

export type Nutrition = z.infer<typeof NutritionSchema>;

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeMeal(base64Image: string): Promise<Nutrition> {
    // 💡 This prompt may be a map of prompts for different languages
    const prompt =
      'Analyze this food image and return a JSON with the nutritional information and tips.';

    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      seed: 1996,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: zodResponseFormat(NutritionSchema, 'nutrition'),
    });
    let content = response.choices[0].message.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content) as string;
      } catch {
        throw new Error('La respuesta de OpenAI no es un JSON válido');
      }
    }
    const validatedResponse = NutritionSchema.parse(content);
    return validatedResponse;
  }
}
