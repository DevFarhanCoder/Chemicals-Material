# Chemical Materials Aggregation Dashboard

## ⚡ QUICK START - First Time Here?

**→ Open [START_HERE.md](START_HERE.md) for the fastest setup guide!**

Just copy & paste a few commands and you'll be running in 5 minutes.

**Having errors?** They're normal! Dependencies just need to be installed first.

---

## 🎯 Project Overview

A production-ready admin dashboard that aggregates chemical and laboratory material data from multiple supplier websites, presenting it in a structured, filterable table with real-time editing capabilities.

## 🏗️ Architecture

### Tech Stack Justification

#### Frontend

- **React 18** with **TypeScript**: Type safety, component reusability, excellent ecosystem
- **TanStack Table v8**: Best-in-class table library with powerful filtering, sorting, and pagination
- **Tailwind CSS**: Rapid UI development with consistent design system
- **Axios**: HTTP client for API communication

#### Backend

- **Node.js + Express**: JavaScript ecosystem consistency, excellent for REST APIs
- **TypeScript**: End-to-end type safety
- **Prisma ORM**: Type-safe database access, excellent migrations

#### Database

- **PostgreSQL**:
  - ACID compliance for data integrity
  - Excellent full-text search capabilities
  - Structured schema perfect for tabular data
  - Support for JSON fields for flexible metadata

#### Scraping

- **Puppeteer**:
  - Node.js native (ecosystem consistency)
  - Handles JavaScript-heavy sites
  - Full browser automation
  - Screenshot debugging capabilities

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN DASHBOARD (React)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TanStack Table with filters, sorting, inline edit  │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              EXPRESS API SERVER (TypeScript)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Materials  │  │    Admin     │  │   Scraping      │  │
│  │   Routes     │  │   Actions    │  │   Controller    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ Prisma ORM
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                             │
│  Tables: materials, scraping_logs, admin_actions            │
└─────────────────────────────────────────────────────────────┘
                     ↑
                     │ Puppeteer Scrapers
┌─────────────────────────────────────────────────────────────┐
│              SCRAPING MODULE (Isolated)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Site-specific scrapers (modular, extensible)        │  │
│  │  • Combi-blocks  • Chemsworth  • OttoKemi            │  │
│  │  • ChemScene     • Sigma-Aldrich                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
chemical-materials-dashboard/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API endpoints
│   │   ├── models/            # Database models (Prisma)
│   │   ├── services/          # Business logic
│   │   ├── scrapers/          # Web scraping modules
│   │   │   ├── base/          # Base scraper class
│   │   │   ├── combi-blocks.ts
│   │   │   ├── chemsworth.ts
│   │   │   ├── ottokemi.ts
│   │   │   ├── chemscene.ts
│   │   │   └── sigmaaldrich.ts
│   │   ├── config/            # Configuration
│   │   └── server.ts          # Express app entry
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── MaterialsTable.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   └── EditModal.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and Install Dependencies**

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Database Setup**

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/chemicals_db"

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

3. **Run Development Servers**

```bash
# Terminal 1: Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Frontend (http://localhost:3000)
cd frontend
npm run dev
```

4. **Run Scrapers**

```bash
cd backend
npm run scrape           # Scrape all sources
npm run scrape:combi     # Specific source
```

## 📊 Database Schema

### Materials Table

```sql
materials (
  id: uuid PRIMARY KEY,
  case_no: varchar(50) UNIQUE,
  product_name: text,
  email: varchar(255),
  mobile: varchar(50),
  company_name: varchar(255),
  location: varchar(255),
  price: varchar(100),
  status: enum(Pending, Contacted, NotInterested, Converted),
  remarks: text,
  last_contacted: timestamp,
  source_url: text,
  scraped_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
)
```

## 🎨 Dashboard Features

### Table Capabilities

- ✅ Multi-column filtering (product, company, location, price)
- ✅ Instant client-side search
- ✅ Column sorting (ASC/DESC)
- ✅ Inline status editing
- ✅ Remarks/notes per material
- ✅ Pagination with customizable page size
- ✅ Sticky header
- ✅ Responsive design
- ✅ Export to CSV

### Admin Actions

- Update status (Pending → Contacted → Converted)
- Add/edit remarks
- Record contact dates
- Bulk actions (future: bulk status update, bulk delete)

## 🔧 API Endpoints

### Materials

- `GET /api/materials` - List all materials (with filters)
- `GET /api/materials/:id` - Get single material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

### Scraping

- `POST /api/scrape` - Trigger scraping (with source filter)
- `GET /api/scrape/status` - Check scraping status
- `GET /api/scrape/logs` - View scraping logs

### Stats

- `GET /api/stats` - Dashboard statistics

## 🕷️ Scraping Strategy

### Base Scraper Architecture

All scrapers extend a base class with:

- Retry logic
- Error handling
- Rate limiting
- User-agent rotation
- Proxy support (configurable)

### Site-Specific Scrapers

Each supplier website has a dedicated scraper module that:

1. Navigates to product listing pages
2. Extracts material data (name, price, specifications)
3. Extracts company contact info
4. Normalizes data to common schema
5. Handles pagination
6. Logs scraping results

### Demo Implementation

For this demo, scrapers will:

- Extract ~50-100 products per source
- Focus on main product listing pages
- Skip deep nested categories (can be expanded)
- Store raw HTML for debugging

## 🎯 Scalability Considerations

### Current (Demo) Scale

- ~500 materials total
- Manual scraping trigger
- Client-side filtering

### Production Enhancements (Future)

- **Database**: Add indexes on searchable columns
- **Caching**: Redis for frequently accessed data
- **Scraping**:
  - Scheduled jobs (cron/Bull queue)
  - Distributed scraping (worker nodes)
  - Change detection (only update modified data)
- **API**:
  - Server-side pagination
  - Rate limiting
  - Authentication/Authorization (JWT)
- **Frontend**:
  - Virtual scrolling for 1000s of rows
  - Advanced filters (date ranges, multi-select)
  - Real-time updates (WebSocket)

## 🔐 Security (Production Checklist)

- [ ] JWT-based authentication
- [ ] Role-based access control
- [ ] API rate limiting
- [ ] Input validation/sanitization
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS protection
- [ ] CORS configuration
- [ ] Environment variable management
- [ ] Scraping: Respect robots.txt

## 📝 Development Guidelines

### Code Style

- ESLint + Prettier configured
- TypeScript strict mode
- Functional components (React)
- Async/await over promises

### Commit Convention

```
feat: Add filtering to materials table
fix: Correct price parsing in Chemsworth scraper
docs: Update API documentation
refactor: Extract scraper base class
```

## 🧪 Testing (Future Enhancement)

- Backend: Jest + Supertest
- Frontend: React Testing Library
- E2E: Playwright
- Scraper: Mock HTML responses

## 📦 Deployment

### Backend (Node.js)

- Deploy to: Railway, Render, AWS EC2
- Environment: Production .env
- Database: Managed PostgreSQL

### Frontend (React)

- Build: `npm run build`
- Deploy to: Vercel, Netlify, AWS S3 + CloudFront
- Environment: API_URL configuration

### Database Migration

```bash
npx prisma migrate deploy
```

## 🤝 Contributing

This is a demo project. For production use:

1. Add comprehensive testing
2. Implement authentication
3. Add monitoring (Sentry, DataDog)
4. Set up CI/CD pipeline

## 📄 License

MIT

## 👥 Author

Senior Full-Stack Engineer

---

**Note**: This is a DEMO implementation. Scraping should respect website terms of service. Always check robots.txt and consider API access if available.
