# 🐛 WordPress Authentication Error for Media Upload

## Problem
When trying to upload featured images (either manually or from image search), you get an authentication error:

```
Sorry, you are not allowed to create posts as this user.
Status: 401 Unauthorized
Code: rest_cannot_create
```

## Root Cause
This is a **WordPress permissions issue**, not a bug in our application. The WordPress user account configured in the site settings doesn't have sufficient permissions to upload media files.

## Why This Happens

### WordPress REST API Permissions
WordPress REST API requires specific user capabilities to perform actions:

| Action | Required Capability |
|--------|-------------------|
| Upload Media | `upload_files` |
| Create Posts | `edit_posts` |
| Publish Posts | `publish_posts` |
| Edit Posts | `edit_published_posts` |

### WordPress User Roles
Different WordPress roles have different capabilities:

| Role | Can Upload Media? | Can Create Posts? |
|------|------------------|------------------|
| **Administrator** | ✅ Yes | ✅ Yes |
| **Editor** | ✅ Yes | ✅ Yes |
| **Author** | ✅ Yes | ✅ Yes |
| **Contributor** | ❌ No | ✅ Yes (draft only) |
| **Subscriber** | ❌ No | ❌ No |

## Solution

### Option 1: Use Administrator Account (Recommended for Testing)
1. Go to **Sites** page in WordPress Manager
2. Click **Edit** on your site
3. Update WordPress credentials to use an **Administrator** account
4. Save the site
5. Try uploading media again

### Option 2: Create Application Password (Recommended for Production)
1. Log into your WordPress admin panel
2. Go to **Users** → **Profile**
3. Scroll to **Application Passwords** section
4. Create a new application password:
   - Name: "WordPress Manager"
   - Click "Add New Application Password"
5. Copy the generated password
6. In WordPress Manager:
   - Go to **Sites** → **Edit** your site
   - Use your WordPress username
   - Paste the application password
   - Save

### Option 3: Grant Upload Permissions to Existing User
If you want to keep using the current user account:

1. Log into WordPress admin as Administrator
2. Go to **Users** → **All Users**
3. Find the user account you're using
4. Click **Edit**
5. Change **Role** to **Author** or **Editor**
6. Click **Update User**
7. Try uploading media again in WordPress Manager

### Option 4: Use a Plugin to Grant Custom Capabilities
Install a plugin like "User Role Editor" to grant specific capabilities:

1. Install "User Role Editor" plugin in WordPress
2. Go to **Users** → **User Role Editor**
3. Select the user's role
4. Check the `upload_files` capability
5. Click **Update**

## Technical Details

### What Our Application Does
1. User selects an image (from search or manual upload)
2. Frontend sends image to our backend: `POST /api/content/:siteId/wordpress/media`
3. Backend retrieves WordPress credentials from database
4. Backend makes authenticated request to WordPress REST API:
   ```
   POST https://your-site.com/wp-json/wp/v2/media
   Authorization: Basic base64(username:password)
   ```
5. WordPress validates the credentials and checks permissions
6. If user has `upload_files` capability → Success ✅
7. If user doesn't have permission → 401 Error ❌

### WordPress REST API Endpoint
```
POST /wp-json/wp/v2/media
```

**Required Headers:**
- `Authorization: Basic <base64(username:password)>`
- `Content-Type: multipart/form-data`

**Required Permissions:**
- User must have `upload_files` capability

### Our Backend Code
<augment_code_snippet path="api/routes/content.ts" mode="EXCERPT">
````typescript
// Upload to WordPress media library
const response = await axios.post(
  `${site.url}/wp-json/wp/v2/media`,
  formData,
  {
    auth: {
      username: site.wpUsername,
      password: wpPassword
    },
    headers: {
      ...formData.getHeaders(),
      'User-Agent': 'WordPress-Manager/1.0'
    }
  }
)
````
</augment_code_snippet>

## Verification

### Check WordPress User Capabilities
Run this in WordPress admin (Tools → Site Health → Info → wp-cli):

```bash
wp user get <username> --field=roles
wp user get <username> --field=caps
```

Or add this to your theme's `functions.php` temporarily:

```php
add_action('init', function() {
    $user = wp_get_current_user();
    error_log('User: ' . $user->user_login);
    error_log('Roles: ' . print_r($user->roles, true));
    error_log('Can upload: ' . ($user->has_cap('upload_files') ? 'YES' : 'NO'));
});
```

### Test WordPress REST API Directly
Use curl to test if your credentials work:

```bash
curl -X POST \
  https://your-site.com/wp-json/wp/v2/media \
  -u "username:password" \
  -F "file=@test-image.jpg"
```

**Expected Response:**
- ✅ Success: `201 Created` with media object
- ❌ Auth Error: `401 Unauthorized` with error message

## Prevention

### Best Practices
1. **Use Application Passwords**: More secure than regular passwords
2. **Use Appropriate Roles**: Author or Editor for content creators
3. **Test Credentials**: Verify permissions before saving site
4. **Document Requirements**: Tell users they need Author+ role

### Future Enhancement Ideas
1. **Credential Validation**: Test WordPress credentials when saving site
2. **Permission Check**: Verify user has `upload_files` capability
3. **Better Error Messages**: Show specific permission requirements
4. **Role Detection**: Display user's WordPress role in site settings
5. **Guided Setup**: Step-by-step wizard for WordPress connection

## Related Issues

### Similar Errors You Might See
- `rest_cannot_edit` - User can't edit posts
- `rest_cannot_publish` - User can't publish posts
- `rest_cannot_delete` - User can't delete content
- `rest_forbidden` - General permission denied

All of these indicate WordPress permission issues, not application bugs.

## Summary

**The authentication error is caused by insufficient WordPress user permissions, not a bug in the application.**

**Quick Fix:**
1. Use an Administrator or Editor account in WordPress Manager
2. Or grant `upload_files` capability to your current user

**The application is working correctly** - it's properly authenticating with WordPress and handling the permission error appropriately.

---

## Additional Fix: Image Proxy for CORS

We also added an image proxy endpoint to avoid CORS issues when downloading images from external providers:

### New Backend Endpoint
**`GET /api/images/proxy?url=<image_url>`**

- Downloads images server-side
- Avoids CORS restrictions
- Validates image URLs
- Returns image data with proper headers

### Frontend Update
**`src/components/FeaturedImageUpload.tsx`**

Now uses the proxy endpoint instead of direct fetch:

```typescript
const proxyUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(image.url)}`
const response = await fetch(proxyUrl, {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

This ensures images can be downloaded from any provider without CORS issues.

---

**Issue**: WordPress permissions  
**Status**: ✅ Explained (not a bug)  
**Solution**: Use appropriate WordPress user role  
**Bonus**: Added image proxy for CORS  

