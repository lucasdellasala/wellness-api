# Wellness API 🥗💚

A scalable and modular API built with Node.js and NestJS for analyzing food images, extracting nutritional information using OpenAI, and managing user meals. The project uses MinIO for image storage, Redis (with Bull) for job queues, and Prisma for database access.

---

## Features

- User management (CRUD)
- Meal analysis from images using OpenAI Vision
- Asynchronous processing with Bull (Redis)
- Image storage abstraction (MinIO, easily swappable for S3, etc.)
- Fully tested (unit and e2e)
- Scalable and decoupled architecture

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/lucasdellasala/wellness-api.git
cd wellness-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
cp .env.example .env.test
```

- Set your database URL in both `.env` and `.env.test` (for testing).

- Set your OpenAI API key and MinIO/Redis configs as needed.

### 4. Start Redis and MinIO with Docker Compose

```bash
docker-compose up -d redis minio
```

### 5. Run database migrations

```bash
npx prisma migrate deploy
```

### 6. Start the API

```bash
npm run start:dev
```

---

## Running Tests

```bash
npm run test
npm run test:e2e
```

> [!NOTE]
> e2e tests require a real database connection with a schema similar to production. Make sure your `.env.test` points to a dedicated test database and that migrations have been applied. 

> [!CAUTION]
> **Do not use the same url from production.**

---

## Deployment

1. **Set environment variables** on your server/host (see `.env.example`).
2. **Provision a PostgreSQL database**, Redis, and MinIO (or S3-compatible storage).
3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```
4. **Build and start the app**:
   ```bash
   npm run build
   npm run start:prod
   ```
5. (Optional) Use Docker Compose for Redis/MinIO in production, or connect to managed services.

---

## Notes

- The storage layer is abstracted; you can swap MinIO for AWS S3 or other providers by implementing the adapter.
- All queue/job names are centralized in constants for easy maintenance.
- For unit testing, the storage and queue layers are mocked to avoid external dependencies.
