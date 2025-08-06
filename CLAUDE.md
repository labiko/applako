# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Information

**Project Path**: `C:\Users\diall\Documents\IonicProjects\Claude\AppLakoChauffeur`

This is an Ionic + Angular + Capacitor application for a chauffeur service (AppLakoChauffeur).

**IMPORTANT - Timezone Configuration**: 
- The application operates in **GMT+0 (Conakry, Guinea timezone)**
- All timestamps in database are stored in UTC
- All date/time displays must be converted to GMT+0 for correct local time
- When calculating time differences (e.g., "Il y a 2h"), always use GMT+0 timezone

## Development Commands

- `npm install` - Install dependencies
- `npm start` or `ionic serve` - Start development server
- `npm run build` or `ionic build` - Build for production
- `npm test` - Run unit tests
- `npm run lint` - Run linting

## Project Architecture

### Technology Stack
- **Framework**: Ionic 7 with Angular 17 (Standalone Components)
- **Mobile**: Capacitor 5 for native functionality
- **Database**: Supabase (PostgreSQL)
- **Styling**: Custom CSS variables with Lako brand colors

### Theme Colors
The application uses a custom color scheme:
- Primary: #C1F11D (Lako Green)
- Secondary: #797979 (Gray)
- Tertiary: #FFFEE9 (Cream)
- Dark: #151515 (Almost Black)
- White: #FFFFFF

### Application Structure
- **Tab-based navigation** with 3 main sections:
  - **Reservations**: Displays pending reservations with accept/refuse actions
  - **Historique**: Shows processed reservations (accepted/refused/completed)
  - **Profile**: Driver profile and statistics

### Key Services
- **SupabaseService** (`src/app/services/supabase.service.ts`): Handles all database operations
  - `getPendingReservations()`: Fetches reservations with status 'pending'
  - `updateReservationStatus()`: Updates reservation status to 'accepted' or 'refused'
  - `getReservationHistory()`: Fetches processed reservations

### Data Models
- **Reservation** (`src/app/models/reservation.model.ts`): Main data model with fields like customer_name, pickup_location, destination, status, etc.

### Environment Configuration
- Update `src/environments/environment.ts` and `src/environments/environment.prod.ts` with actual Supabase credentials:
  - `supabaseUrl`: Your Supabase project URL
  - `supabaseKey`: Your Supabase anon key

### Database Requirements
The application expects a `reservations` table in Supabase with these columns:
- `id`: Primary key (UUID)
- `customer_name`: Text
- `customer_phone`: Text
- `pickup_location`: Text
- `destination`: Text
- `pickup_date`: Date
- `pickup_time`: Time
- `status`: Text ('pending', 'accepted', 'refused', 'completed')
- `price`: Numeric (optional)
- `notes`: Text (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Database Structure Reference
For complete database structure analysis and schema details, refer to:
`C:\Users\diall\Documents\LABICOTAXI\SCRIPT\db_structure.sql`

This file contains the complete database schema including all tables, columns, relationships, and constraints. Always consult this file when analyzing database structure or implementing new features that require database modifications.

## Git Repository & Deployment

### Repository Information
- **Git Repository**: https://github.com/labiko/applako.git
- **Deployment Platform**: Vercel

### IMPORTANT: Commit Strategy
⚠️ **CRITICAL**: When committing this project to Git, you MUST commit ALL files including configuration files. 

**Files that MUST be committed:**
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
- All configuration files (angular.json, ionic.config.json, capacitor.config.ts, etc.)
- Package files (package.json, package-lock.json)
- All source code and assets

**Why this is critical:**
- Vercel deployment requires environment configuration files
- Missing config files will cause deployment failures
- The application won't function without proper Supabase credentials
- Build process depends on all configuration files being present

### Git Commands for Deployment
```bash
# Initialize git (if not already done)
git init

# Add remote repository
git remote add origin https://github.com/labiko/applako.git

# Add ALL files (including configs)
git add .

# Commit with descriptive message
git commit -m "Initial commit: Complete Ionic Angular app with Supabase integration"

# Push to main branch
git push -u origin main
```

### Vercel Deployment Notes
- Ensure environment variables are properly configured in Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist/`
- Node.js version: Use latest LTS (18.x or 20.x)

## ⚠️ IMPORTANT: Git Workflow Instructions

### Commit Policy
**NEVER commit automatically without explicit user request.**

- ✅ **DO**: Work on code, create files, make modifications
- ✅ **DO**: Build, test, and verify functionality
- ❌ **DON'T**: Run `git add`, `git commit`, or `git push` unless specifically asked
- ❌ **DON'T**: Auto-commit after completing tasks

### When to Commit
Only commit when the user explicitly requests it with commands like:
- "commit"
- "commit and push" 
- "git commit"
- "save changes to git"
- "push to repository"

### Exception
The only exception is when the user provides a specific instruction in their initial request that clearly indicates they want commits (e.g., "implement feature X and commit it").

This ensures the user maintains full control over their git history and can review changes before they are committed.