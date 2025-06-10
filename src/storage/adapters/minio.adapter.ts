import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { IStorageAdapter } from '../interfaces/storage.interface';

@Injectable()
export class MinioAdapter implements IStorageAdapter {
  private readonly logger = new Logger(MinioAdapter.name);
  private minioClient: Minio.Client | null = null;
  private bucketName: string | null = null;
  private endpoint: string | null = null;
  private port: number | null = null;

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    this.port = parseInt(
      this.configService.get<string>('MINIO_PORT') ?? '9000',
    );
    this.endpoint =
      this.configService.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET') ?? 'wellness-images';

    this.minioClient = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') ?? '',
    });

    if (!this.minioClient || !this.bucketName) {
      throw new Error('MinIO no está inicializado');
    }

    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    if (!accessKey || !secretKey) {
      throw new Error(
        'MINIO_ACCESS_KEY and MINIO_SECRET_KEY should be configured in .env',
      );
    }

    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error initializing storage: ${errorMessage}`);
      throw error;
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!this.minioClient || !this.bucketName) {
      throw new Error('MinIO no está inicializado');
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      const fileUrl = `http://${this.endpoint}:${this.port}/${this.bucketName}/${fileName}`;
      this.logger.log(`File uploaded successfully: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error uploading file: ${errorMessage}`);
      throw error;
    }
  }

  getFileUrl(fileName: string): string {
    if (!this.bucketName) {
      throw new Error('MinIO no está inicializado');
    }
    return `http://${this.endpoint}:${this.port}/${this.bucketName}/${fileName}`;
  }

  async deleteFile(fileName: string): Promise<void> {
    if (!this.minioClient || !this.bucketName) {
      throw new Error('MinIO no está inicializado');
    }
    try {
      await this.minioClient.removeObject(this.bucketName, fileName);
      this.logger.log(`File ${fileName} deleted successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting file: ${errorMessage}`);
      throw error;
    }
  }
}
