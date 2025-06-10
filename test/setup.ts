import { config } from 'dotenv';
import * as path from 'path';

// Load test environment variables FIRST (before anything else)
config({ path: path.join(process.cwd(), '.env.test') });

process.env.NODE_ENV = 'test';
