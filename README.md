# Financial Management ERP API

Multi-Company ERP and Financial Management System backend built with Node.js, Express, TypeScript, and MongoDB Atlas.

## Features

- Multi-tenant architecture with `companyId` scoping
- Clean Architecture with feature-based modules
- JWT authentication with RBAC (Phase 2+)
- MongoDB Atlas with GridFS file storage (Phase 6)
- Swagger/OpenAPI documentation
- Docker & CI/CD ready

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js 5
- **Language:** TypeScript
- **Database:** MongoDB Atlas (Mongoose)
- **Validation:** Zod
- **Logging:** Winston + Morgan
- **Testing:** Jest + Supertest

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas cluster (or local MongoDB for development)

### Installation

```bash
npm install
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and JWT secrets
```

### Development

```bash
npm run dev
```

API: `http://localhost:3000/api/v1`  
Swagger: `http://localhost:3000/api/docs`

### Testing

```bash
npm test
npm run test:coverage
```

### Production Build

```bash
npm run build
npm start
```

### Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

## Project Structure

```
src/
├── config/           # Environment & Swagger config
├── infrastructure/   # Database, logging, storage
├── modules/          # Feature modules (auth, company, finance, travel...)
├── routes/           # Route aggregation
└── shared/           # Middleware, errors, DI, utils
```

## API Conventions

- Base path: `/api/v1`
- Pagination: `?page=1&limit=20`
- Auth header: `Authorization: Bearer <token>`
- Company switch (Super Admin): `X-Company-Id: <companyId>`

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Complete | Foundation, Docker, CI/CD, health check |
| 2 | Pending | Auth, RBAC, users, roles |
| 3 | Pending | Company, employee, attendance, dashboard |
| 4 | Pending | Finance & accounting |
| 5 | Pending | Travel, sales, proposals |
| 6 | Pending | Notifications, audit, GridFS, deployment |

## License

ISC
