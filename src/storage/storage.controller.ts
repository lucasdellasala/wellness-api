import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const fileUrl = await this.storageService.uploadFile(file);
    return { url: fileUrl };
  }

  @Get('url/:fileName')
  getFileUrl(@Param('fileName') fileName: string) {
    return { url: this.storageService.getFileUrl(fileName) };
  }

  @Delete(':fileName')
  async deleteFile(@Param('fileName') fileName: string) {
    await this.storageService.deleteFile(fileName);
    return { message: 'File deleted successfully' };
  }
}
