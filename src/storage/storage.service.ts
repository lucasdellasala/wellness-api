import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { IStorageAdapter } from './interfaces/storage.interface';
import { STORAGE_ADAPTER } from './storage.constants';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_ADAPTER) private readonly storageAdapter: IStorageAdapter,
  ) {}

  async onModuleInit() {
    try {
      await this.storageAdapter.initialize();
      this.logger.log('Storage adapter initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error initializing storage: ${errorMessage}`);
      throw error;
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return this.storageAdapter.uploadFile(file);
  }

  getFileUrl(fileName: string): string {
    return this.storageAdapter.getFileUrl(fileName);
  }

  async deleteFile(fileName: string): Promise<void> {
    return this.storageAdapter.deleteFile(fileName);
  }
}
