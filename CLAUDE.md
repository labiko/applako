# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Information

**Project Path**: `C:\Users\diall\Documents\IonicProjects\Claude\AppLakoChauffeur`

This is an Ionic + Angular + Capacitor application for a chauffeur service (AppLakoChauffeur).

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