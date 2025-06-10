import { Injectable } from '@nestjs/common';
import { IStorageAdapter } from '../interfaces/storage.interface';

@Injectable()
export class TestAdapter implements IStorageAdapter {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  uploadFile(file: Express.Multer.File): Promise<string> {
    return Promise.resolve(
      `http://test-storage/${Date.now()}-${file.originalname}`,
    );
  }

  getFileUrl(fileName: string): string {
    return `http://test-storage/${fileName}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteFile(_: string): Promise<void> {
    return Promise.resolve();
  }
}
