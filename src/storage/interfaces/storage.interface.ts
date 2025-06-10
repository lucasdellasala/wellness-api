export interface IStorageAdapter {
  uploadFile(file: Express.Multer.File): Promise<string>;
  getFileUrl(fileName: string): string;
  deleteFile(fileName: string): Promise<void>;
  initialize(): Promise<void>;
}
