# Contributing to TavernKeeper

Welcome! This guide will help you get set up to contribute to the project.

## Initial Setup

### 1. Clone the Repository

```bash
git clone git@github.com:dutchiono/Tavernkeeper.git
cd Tavernkeeper
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. See `apps/web/MONAD_CONFIG.md` for details on required variables.

**Important:** Never commit your `.env` file - it contains secrets!

### 4. Set Up Database

The project uses Supabase for PostgreSQL. You'll need:
- A Supabase project (free tier works)
- Run the migrations in `supabase/migrations/`

### 5. Start Development

From the project root:

```bash
# Start the Next.js dev server
pnpm dev

# In a separate terminal, start workers
cd apps/web
pnpm start-worker
```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- Create feature branches from `main`
- Use descriptive branch names: `feature/map-page`, `fix/party-bug`, etc.

### Making Changes

1. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Test your changes:**
   ```bash
   # Run unit tests
   pnpm test

   # Run E2E tests
   cd apps/web
   pnpm test:e2e
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub.

## Project Structure

### Key Directories

- `apps/web/` - Next.js frontend application
  - `app/` - Next.js App Router pages and API routes
  - `components/` - React components
  - `lib/` - Shared utilities and services
  - `e2e/` - Playwright E2E tests

- `packages/` - Shared packages
  - `engine/` - Game engine (deterministic, seeded RNG)
  - `contracts/` - Solidity smart contracts
  - `agents/` - ElizaOS agent wrappers
  - `lib/` - Shared TypeScript types and utilities

### Areas for Contribution

**Map Page** (`apps/web/app/map/page.tsx`):
- Map rendering and interaction
- Dungeon visualization
- Navigation and exploration

**Party Page** (`apps/web/app/party/page.tsx`):
- Hero management
- Party composition
- Equipment and inventory display

**Game Design**:
- Balance adjustments
- New features
- UI/UX improvements

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns
- Run `pnpm lint` before committing
- Write tests for new features

## Testing

- **Unit Tests:** `pnpm test` (Vitest)
- **E2E Tests:** `cd apps/web && pnpm test:e2e` (Playwright)
- **Watch Mode:** `pnpm test:e2e:ui` for interactive E2E testing

## Questions?

Feel free to ask questions or reach out if you need help getting set up!

