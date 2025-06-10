import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpStatus,
  HttpCode,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MealsService } from './meals.service';

@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async analyzeMeal(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      }),
    )
    file: Express.Multer.File,
    @Body('userId') userId: string,
  ) {
    if (!file?.mimetype?.startsWith('image/')) {
      throw new Error(
        'The file must be an image (mimetype must start with "image/").',
      );
    }
    return await this.mealsService.analyzeMealImage(file, userId);
  }

  @Get('status/:eventId')
  @HttpCode(HttpStatus.OK)
  async getMealAnalysisStatus(@Param('eventId') eventId: string) {
    return await this.mealsService.getMealAnalysisStatus(eventId);
  }
}
