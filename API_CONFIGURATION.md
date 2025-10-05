# API Configuration

## Overview

The WordPress Manager application uses a unified API configuration approach where all API calls go directly to the backend server without using Vite's proxy.

## Configuration

### Environment Variables

**`.env.local`** (Development):
```
VITE_API_URL=http://localhost:3001/api
```

**Production**:
Set `VITE_API_URL` to your production API URL with the `/api` prefix (e.g., `https://api.example.com/api`)

### API Client Files

Both API client files use the same base URL pattern:

1. **`src/lib/api.ts`** - Main API client for WordPress operations
   - Base URL: `http://localhost:3001/api`
   - Endpoints: `/sites`, `/content`, `/media`, `/categories`, `/auth`
   - Example: `${API_BASE_URL}/sites` → `http://localhost:3001/api/sites`

2. **`src/lib/ai-api.ts`** - AI features API client
   - Base URL: `http://localhost:3001/api`
   - Endpoints: `/ai/*`, `/ai-settings/*`
   - Example: `${API_BASE_URL}/ai/enhance` → `http://localhost:3001/api/ai/enhance`

### Backend Routes

All routes are mounted with the `/api` prefix in `api/app.ts`:

```typescript
app.use('/api/auth', authRoutes)
app.use('/api/sites', sitesRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/ai-settings', aiSettingsRoutes)
```

## URL Construction Pattern

**Consistent pattern across all API clients:**

```
API_BASE_URL + endpoint = Full URL
http://localhost:3001/api + /sites = http://localhost:3001/api/sites
http://localhost:3001/api + /ai/enhance = http://localhost:3001/api/ai/enhance
http://localhost:3001/api + /ai-settings = http://localhost:3001/api/ai-settings
```

## Vite Configuration

The Vite proxy has been **removed** from `vite.config.ts` since we're calling the backend directly. This eliminates the double `/api/api/` issue that was occurring.

## Testing

To verify the configuration is working:

1. Start the dev server: `npm run dev`
2. Open browser DevTools → Network tab
3. Navigate to different pages
4. Verify all API calls go to `http://localhost:3001/api/*`
5. No calls should go to `http://localhost:5173/api/*`

## Troubleshooting

### Issue: Double `/api/api/` in URLs

**Cause**: Vite proxy was enabled AND base URL included `/api`

**Solution**: Removed Vite proxy, use direct backend calls

### Issue: Calls going to wrong port (5173 instead of 3001)

**Cause**: `VITE_API_URL` not set or set incorrectly

**Solution**: Ensure `.env.local` has `VITE_API_URL=http://localhost:3001/api`

### Issue: CORS errors

**Cause**: Backend CORS not configured for frontend origin

**Solution**: Backend already has `app.use(cors())` which allows all origins in development

