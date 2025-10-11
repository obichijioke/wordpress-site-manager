# Image URL Filter Feature

## Overview

The Image URL Filter feature allows users to exclude unwanted images from search results by configuring URL patterns. This is particularly useful for filtering out watermarked stock photos from sites like Shutterstock, Getty Images, etc.

---

## Features

✅ **Add URL Filters** - Configure patterns to exclude specific domains or URLs  
✅ **Manage Filters** - Enable/disable or remove filters at any time  
✅ **Common Presets** - Quick-add buttons for popular watermarked image sites  
✅ **Automatic Filtering** - Filters apply automatically during RSS automation workflow  
✅ **Case-Insensitive Matching** - Patterns match regardless of case  
✅ **Flexible Patterns** - Match full domains or partial URL patterns  

---

## Database Schema

### New Model: `ImageUrlFilter`

```prisma
model ImageUrlFilter {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  pattern     String   // URL pattern to filter (e.g., "shutterstock.com")
  description String?  // Optional description
  isActive    Boolean  @default(true) @map("is_active")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("image_url_filters")
}
```

**Fields:**
- `pattern` - The URL pattern to match (e.g., "shutterstock.com", "gettyimages.com")
- `description` - Optional description explaining why this pattern is filtered
- `isActive` - Whether the filter is currently active
- `userId` - Links filter to specific user

---

## Backend Implementation

### 1. ImageService Methods

**File**: `api/services/images/image-service.ts`

#### `getUrlFilters(userId: string): Promise<string[]>`
- Fetches active URL filter patterns for a user
- Returns array of lowercase pattern strings

#### `filterImagesByUrl(images, urlFilters): ImageSearchResponse[]`
- Filters out images whose URLs match any filter pattern
- Uses case-insensitive substring matching
- Logs filtered images to console

#### `getUrlFiltersForUser(userId: string)`
- Returns all URL filters for a user (active and inactive)
- Used by frontend to display filter list

#### `addUrlFilter(userId, pattern, description?): Promise<void>`
- Adds a new URL filter
- Validates pattern is not empty
- Checks for duplicates
- Stores pattern in lowercase

#### `removeUrlFilter(userId, filterId): Promise<void>`
- Removes a URL filter
- Verifies filter belongs to user

#### `toggleUrlFilter(userId, filterId): Promise<void>`
- Toggles filter active/inactive status
- Verifies filter belongs to user

### 2. API Routes

**File**: `api/routes/images.ts`

#### `GET /api/images/url-filters`
- Returns all URL filters for current user
- Requires authentication

#### `POST /api/images/url-filters`
- Adds a new URL filter
- Body: `{ pattern: string, description?: string }`
- Validates pattern is non-empty

#### `DELETE /api/images/url-filters/:filterId`
- Removes a URL filter
- Requires filter ownership

#### `PATCH /api/images/url-filters/:filterId/toggle`
- Toggles filter active/inactive
- Requires filter ownership

### 3. Integration with Image Search

The `searchImages()` method in `ImageService` now:

1. Fetches active URL filters for the user
2. Searches across all enabled providers
3. **Applies URL filters to results**
4. Returns filtered image results

```typescript
// Get URL filters for user
const urlFilters = await this.getUrlFilters(userId)

// Search images
const results = await Promise.all(searchPromises)

// Apply URL filters to results
const filteredResults = this.filterImagesByUrl(results, urlFilters)
```

---

## Frontend Implementation

### 1. API Client

**File**: `src/lib/image-api.ts`

#### New Type: `ImageUrlFilter`
```typescript
export interface ImageUrlFilter {
  id: string
  pattern: string
  description?: string
  isActive: boolean
  createdAt: Date
}
```

#### New Methods:
- `getUrlFilters(): Promise<ImageUrlFilter[]>`
- `addUrlFilter(pattern, description?): Promise<void>`
- `removeUrlFilter(filterId): Promise<void>`
- `toggleUrlFilter(filterId): Promise<void>`

### 2. Settings UI

**File**: `src/pages/ImageSettings.tsx`

#### New Section: "Image URL Filters"

**Features:**
1. **Add New Filter Form**
   - Input for URL pattern (required)
   - Input for description (optional)
   - "Add Filter" button

2. **Common Presets**
   - Quick-add buttons for popular sites:
     - shutterstock.com
     - gettyimages.com
     - istockphoto.com
     - depositphotos.com
     - dreamstime.com

3. **Active Filters List**
   - Shows all configured filters
   - Displays pattern in monospace font
   - Shows description if provided
   - Indicates active/inactive status
   - Enable/Disable toggle button
   - Remove button (X icon)

#### State Management:
```typescript
const [urlFilters, setUrlFilters] = useState<ImageUrlFilter[]>([])
const [newFilterPattern, setNewFilterPattern] = useState('')
const [newFilterDescription, setNewFilterDescription] = useState('')
const [addingFilter, setAddingFilter] = useState(false)
```

#### Handlers:
- `handleAddFilter()` - Adds new filter
- `handleRemoveFilter(filterId)` - Removes filter
- `handleToggleFilter(filterId)` - Toggles active status

---

## Usage Examples

### Example 1: Filter Shutterstock Images

1. Go to **Settings → Image Providers**
2. Scroll to **Image URL Filters** section
3. Click "shutterstock.com" in Common Filters
4. Click "Add Filter"
5. All Shutterstock images will now be excluded from search results

### Example 2: Filter Multiple Sites

Add multiple filters:
- `shutterstock.com` - "Watermarked stock photos"
- `gettyimages.com` - "Expensive stock photos"
- `istockphoto.com` - "Watermarked images"

All images from these sites will be filtered out.

### Example 3: Temporarily Disable Filter

1. Find the filter in the Active Filters list
2. Click "Disable" button
3. Filter is now inactive but not deleted
4. Click "Enable" to reactivate

---

## Console Output

When filters are active, you'll see console logs during image search:

```
📋 Applying 3 URL filter(s): shutterstock.com, gettyimages.com, istockphoto.com
🚫 Filtered out image from serper: https://www.shutterstock.com/image-photo/... (matched pattern)
🚫 Filtered out image from pexels: https://www.gettyimages.com/detail/... (matched pattern)
✅ Successfully fetched 12 images from providers (after filtering)
```

---

## How Filtering Works

### Matching Logic

The filter uses **case-insensitive substring matching**:

```typescript
const imageUrl = image.url.toLowerCase()
const isFiltered = urlFilters.some((pattern) => imageUrl.includes(pattern))
```

**Examples:**
- Pattern: `shutterstock.com`
- Matches:
  - `https://www.shutterstock.com/image-photo/123`
  - `https://image.shutterstock.com/z/stock-photo-456`
  - `HTTPS://SHUTTERSTOCK.COM/photo.jpg`
- Does NOT match:
  - `https://www.pexels.com/photo/123`
  - `https://unsplash.com/photos/456`

### Filter Application

Filters are applied **after** fetching images from providers:

1. Fetch images from all enabled providers (Pexels, Unsplash, Serper, Openverse)
2. Get active URL filters for user
3. For each provider's results:
   - Filter out images whose URLs match any pattern
   - Keep images that don't match any pattern
4. Return filtered results

---

## Benefits

### For Users
- ✅ **Avoid Watermarked Images** - Exclude stock photo sites with watermarks
- ✅ **Save Time** - Don't manually skip unwanted images
- ✅ **Better Quality** - Focus on free, high-quality images
- ✅ **Customizable** - Add any URL pattern you want to filter

### For Automation
- ✅ **Automatic Filtering** - Works seamlessly with RSS automation
- ✅ **Consistent Results** - Same filters apply across all searches
- ✅ **No Manual Intervention** - Set once, filter forever

---

## Testing

### Test Case 1: Add Filter
1. Go to Settings → Image Providers
2. Enter "shutterstock.com" in URL Pattern field
3. Enter "Watermarked stock photos" in Description
4. Click "Add Filter"
5. **Expected**: Filter appears in Active Filters list

### Test Case 2: Filter Images
1. Add filter for "shutterstock.com"
2. Go to Content Editor
3. Search for images (e.g., "business meeting")
4. **Expected**: No Shutterstock images in results
5. **Console**: Shows "🚫 Filtered out image from..." messages

### Test Case 3: Disable Filter
1. Find filter in Active Filters list
2. Click "Disable"
3. Search for images again
4. **Expected**: Shutterstock images now appear in results

### Test Case 4: Remove Filter
1. Find filter in Active Filters list
2. Click X button
3. **Expected**: Filter removed from list

---

## Files Modified

### Backend
1. **`prisma/schema.prisma`**
   - Added `ImageUrlFilter` model
   - Added relation to `User` model

2. **`api/services/images/image-service.ts`**
   - Added `getUrlFilters()` method
   - Added `filterImagesByUrl()` method
   - Added `getUrlFiltersForUser()` method
   - Added `addUrlFilter()` method
   - Added `removeUrlFilter()` method
   - Added `toggleUrlFilter()` method
   - Updated `searchImages()` to apply filters

3. **`api/routes/images.ts`**
   - Added `GET /api/images/url-filters` route
   - Added `POST /api/images/url-filters` route
   - Added `DELETE /api/images/url-filters/:filterId` route
   - Added `PATCH /api/images/url-filters/:filterId/toggle` route

### Frontend
4. **`src/lib/image-api.ts`**
   - Added `ImageUrlFilter` interface
   - Added `getUrlFilters()` method
   - Added `addUrlFilter()` method
   - Added `removeUrlFilter()` method
   - Added `toggleUrlFilter()` method

5. **`src/pages/ImageSettings.tsx`**
   - Added URL Filters section
   - Added state for filters
   - Added handlers for filter operations
   - Added UI for adding/managing filters
   - Added common presets section

---

## Future Enhancements

Potential improvements for future versions:

1. **Regex Support** - Allow regex patterns for more complex filtering
2. **Whitelist Mode** - Only allow images from specific domains
3. **Import/Export** - Share filter lists between users
4. **Filter Statistics** - Show how many images were filtered
5. **Smart Suggestions** - AI-powered filter recommendations
6. **Bulk Operations** - Enable/disable multiple filters at once

---

## Troubleshooting

### Issue: Filter not working
**Solution**: Check that:
- Filter is marked as "Active"
- Pattern matches the actual image URL
- You've refreshed the image search

### Issue: Too many images filtered
**Solution**: 
- Review your filter patterns
- Disable overly broad filters
- Use more specific patterns

### Issue: Can't add filter
**Solution**:
- Ensure pattern is not empty
- Check for duplicate patterns
- Verify you're logged in

---

## Summary

The Image URL Filter feature provides a powerful way to control which images appear in search results. By filtering out unwanted domains (especially watermarked stock photo sites), users can focus on high-quality, free images that are suitable for their content.

The feature integrates seamlessly with the existing image search functionality and works automatically during the RSS automation workflow, ensuring consistent, high-quality image selection across all automated article generation.

