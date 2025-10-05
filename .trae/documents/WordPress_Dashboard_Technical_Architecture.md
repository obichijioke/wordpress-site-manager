# WordPress Dashboard Management System - Technical Architecture Document

## 1. Architecture Design

```mermaid
graph TD
  A[User Browser] --> B[React Frontend Application]
  B --> C[Express.js Backend API]
  C --> D[SQLite Database]
  C --> E[WordPress REST API]
  C --> F[Local File Storage]

  subgraph "Frontend Layer"
    B
  end

  subgraph "Backend Layer"
    C
  end

  subgraph "Data Layer"
    D
  end

  subgraph "External Services"
    E
  end

  subgraph "Storage Layer"
    F
  end
```

## 2. Technology Description

- Frontend: React@18 + TypeScript@5 + Tailwind CSS@3 + Vite@5 + React Query@4
- Backend: Express@4 + TypeScript@5 + Prisma@5 + JWT Authentication
- Database: SQLite@3 (Development) / PostgreSQL (Production)
- ORM: Prisma@5 (Database abstraction layer)
- File Storage: Local filesystem (Development) / Cloud storage (Production)
- Authentication: JWT with bcrypt password hashing

## 2.1 Database Migration Strategy

The application uses Prisma ORM to provide database abstraction, enabling seamless migration from SQLite (development) to PostgreSQL (production):

**Development Environment:**
- SQLite database file (`./data/database.db`)
- Local file storage in `./uploads/` directory
- No external dependencies required

**Production Environment:**
- PostgreSQL database (recommended: Railway, Supabase, or AWS RDS)
- Cloud file storage (AWS S3, Cloudinary, or similar)
- Environment-based configuration switching

**Migration Process:**
1. Update `DATABASE_URL` in environment variables
2. Run `npx prisma migrate deploy` for production schema
3. Use `npx prisma db push` for development iterations
4. Data migration scripts included for content transfer

## 3. Route Definitions

| Route | Purpose |
|-------|---------|
| / | Dashboard home page with site overview and activity feed |
| /sites | Site management page for connecting and monitoring WordPress sites |
| /sites/:id | Individual site management and configuration |
| /editor | Content creation interface for articles and pages |
| /editor/:type/:id | Edit existing content (article or page) |
| /categories | Category management interface with hierarchy view |
| /media | Media library for file upload and organization |
| /analytics | Analytics overview with performance metrics |
| /login | User authentication page |
| /register | User registration and onboarding |
| /profile | User profile and account settings |

## 4. API Definitions

### 4.1 Core API

**Authentication**
```
POST /api/auth/login
```

Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| email | string | true | User email address |
| password | string | true | User password |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| success | boolean | Authentication status |
| token | string | JWT access token |
| user | object | User profile information |

**WordPress Site Management**
```
POST /api/sites
```

Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| name | string | true | Site display name |
| url | string | true | WordPress site URL |
| username | string | true | WordPress admin username |
| password | string | true | WordPress application password |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| id | string | Unique site identifier |
| status | string | Connection status |
| health | object | Site health metrics |

**Content Management**
```
POST /api/content
```

Request:
| Param Name | Param Type | isRequired | Description |
|------------|------------|------------|-------------|
| siteId | string | true | Target WordPress site ID |
| type | string | true | Content type (post/page) |
| title | string | true | Content title |
| content | string | true | HTML content body |
| categories | array | false | Category IDs array |
| status | string | false | Publish status (draft/publish) |

Response:
| Param Name | Param Type | Description |
|------------|------------|-------------|
| id | string | WordPress content ID |
| url | string | Published content URL |
| status | string | Current publish status |

Example Request:
```json
{
  "siteId": "site_123",
  "type": "post",
  "title": "Getting Started with WordPress",
  "content": "<p>This is the content body...</p>",
  "categories": ["cat_1", "cat_2"],
  "status": "publish"
}
```

## 5. Server Architecture Diagram

```mermaid
graph TD
  A[Client / Frontend] --> B[Controller Layer]
  B --> C[Service Layer]
  C --> D[Repository Layer]
  D --> E[(SQLite Database)]
  C --> F[WordPress API Client]
  F --> G[WordPress Sites]
  C --> H[File System]
  H --> I[Local Storage]

  subgraph Server
    B
    C
    D
    F
    H
  end
```

## 6. Data Model

### 6.1 Data Model Definition

```mermaid
erDiagram
  USER ||--o{ SITE : manages
  USER ||--o{ CONTENT_DRAFT : creates
  SITE ||--o{ CONTENT_SYNC : contains
  SITE ||--o{ CATEGORY : has
  CONTENT_SYNC ||--o{ CONTENT_DRAFT : syncs_from
  CATEGORY ||--o{ CONTENT_SYNC : categorizes

  USER {
    uuid id PK
    string email
    string name
    string role
    timestamp created_at
    timestamp updated_at
  }
  
  SITE {
    uuid id PK
    uuid user_id FK
    string name
    string url
    string wp_username
    string wp_password_hash
    json health_status
    timestamp last_sync
    timestamp created_at
  }
  
  CONTENT_DRAFT {
    uuid id PK
    uuid user_id FK
    uuid site_id FK
    string type
    string title
    text content
    json metadata
    string status
    timestamp created_at
    timestamp updated_at
  }
  
  CONTENT_SYNC {
    uuid id PK
    uuid site_id FK
    string wp_post_id
    string type
    string title
    json categories
    timestamp wp_modified
    timestamp last_sync
  }
  
  CATEGORY {
    uuid id PK
    uuid site_id FK
    string wp_category_id
    string name
    string slug
    string description
    uuid parent_id FK
    timestamp created_at
  }
```

### 6.2 Prisma Schema Definition

**Prisma Schema (schema.prisma)**
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = env("DATABASE_PROVIDER") // "sqlite" for dev, "postgresql" for prod
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  passwordHash String  @map("password_hash")
  name        String
  role        UserRole @default(SITE_MANAGER)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  sites         Site[]
  contentDrafts ContentDraft[]

  @@map("users")
}

model Site {
  id               String    @id @default(cuid())
  userId           String    @map("user_id")
  name             String
  url              String
  wpUsername       String    @map("wp_username")
  wpPasswordHash   String    @map("wp_password_hash")
  healthStatus     Json      @default("{}") @map("health_status")
  lastSync         DateTime? @map("last_sync")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  contentDrafts ContentDraft[]
  contentSync   ContentSync[]
  categories    Category[]

  @@map("sites")
}

model ContentDraft {
  id        String        @id @default(cuid())
  userId    String        @map("user_id")
  siteId    String        @map("site_id")
  type      ContentType
  title     String
  content   String?
  metadata  Json          @default("{}")
  status    ContentStatus @default(DRAFT)
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@map("content_drafts")
}

model ContentSync {
  id         String      @id @default(cuid())
  siteId     String      @map("site_id")
  wpPostId   String      @map("wp_post_id")
  type       ContentType
  title      String
  categories Json        @default("[]")
  wpModified DateTime?   @map("wp_modified")
  lastSync   DateTime    @default(now()) @map("last_sync")

  // Relations
  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@unique([siteId, wpPostId])
  @@map("content_sync")
}

model Category {
  id           String    @id @default(cuid())
  siteId       String    @map("site_id")
  wpCategoryId String    @map("wp_category_id")
  name         String
  slug         String
  description  String?
  parentId     String?   @map("parent_id")
  createdAt    DateTime  @default(now()) @map("created_at")

  // Relations
  site     Site       @relation(fields: [siteId], references: [id], onDelete: Cascade)
  parent   Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children Category[] @relation("CategoryHierarchy")

  @@unique([siteId, wpCategoryId])
  @@map("categories")
}

// Enums
enum UserRole {
  SITE_MANAGER
  CONTENT_EDITOR
  VIEWER
}

enum ContentType {
  POST
  PAGE
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
}
```

### 6.3 Environment Configuration

**Development (.env.development)**
```env
# Database Configuration
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./data/database.db"

# Application Configuration
NODE_ENV="development"
PORT=3001
JWT_SECRET="your-development-jwt-secret"

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760  # 10MB

# WordPress API Configuration
WP_API_TIMEOUT=30000
```

**Production (.env.production)**
```env
# Database Configuration
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://username:password@localhost:5432/wordpress_dashboard"

# Application Configuration
NODE_ENV="production"
PORT=3001
JWT_SECRET="your-production-jwt-secret"

# File Storage (Cloud)
UPLOAD_PROVIDER="s3"  # or "cloudinary"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_BUCKET_NAME="your-bucket-name"

# WordPress API Configuration
WP_API_TIMEOUT=30000
```

### 6.4 Database Setup Commands

**Development Setup**
```bash
# Install dependencies
npm install prisma @prisma/client

# Initialize Prisma (if not already done)
npx prisma init

# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name init

# Seed database (optional)
npx prisma db seed
```

**Production Migration**
```bash
# Deploy migrations to production
npx prisma migrate deploy

# Generate production client
npx prisma generate
```