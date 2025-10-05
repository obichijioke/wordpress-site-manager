# WYSIWYG Editor Image Enhancement

## Problem
The WYSIWYG editor (using Lexical) was not displaying inline images from WordPress posts. When editing posts that contained `<img>` tags, the images would not appear in the editor.

## Root Cause
Lexical editor did not have an ImageNode registered in its configuration. Without this node type, Lexical couldn't parse or render `<img>` HTML elements from WordPress content.

## Solution Implemented

### 1. Created Custom ImageNode Component
**File:** `src/components/ImageNode.tsx`

- Implemented a custom `ImageNode` class extending Lexical's `DecoratorNode`
- Added support for image properties: `src`, `alt`, `width`, `height`, `className`
- Implemented HTML import/export functionality to handle `<img>` tags
- Added proper serialization for saving/loading editor state
- Configured responsive image display with max-width constraints

**Key Features:**
- Converts HTML `<img>` elements to ImageNode instances
- Exports ImageNode back to HTML `<img>` elements
- Supports image attributes (src, alt, width, height, class)
- Responsive image sizing with max-width of 800px by default
- Proper styling with margins and border-radius

### 2. Enhanced RichTextEditor Component
**File:** `src/components/RichTextEditor.tsx`

**Changes Made:**
1. **Imported ImageNode:**
   ```typescript
   import { ImageNode, $createImageNode } from './ImageNode'
   ```

2. **Added Image Icon:**
   ```typescript
   import { Image as ImageIcon } from 'lucide-react'
   ```

3. **Registered ImageNode in Editor Configuration:**
   ```typescript
   nodes: [
     // ... existing nodes
     ImageNode,  // Added this
   ]
   ```

4. **Added Image Theme:**
   ```typescript
   theme: {
     // ... existing theme
     image: 'editor-image',
   }
   ```

5. **Added Image Insertion Button to Toolbar:**
   - New button with ImageIcon
   - Prompts user for image URL
   - Inserts image at cursor position
   - Uses `$createImageNode` to create image nodes

### 3. Added CSS Styling
**File:** `src/index.css`

Added styles for proper image display in the editor:
```css
.editor-image {
  display: inline-block;
  max-width: 100%;
}

.editor-image img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  cursor: default;
}
```

## How It Works

### Loading WordPress Posts with Images
1. When a WordPress post is loaded into the editor, the HTML content is parsed
2. The `ImageNode.importDOM()` method detects `<img>` tags
3. Each `<img>` tag is converted to an `ImageNode` instance
4. The ImageNode renders the image using React JSX in the editor
5. Images are displayed inline with proper styling

### Inserting New Images
1. User clicks the Image button in the toolbar
2. A prompt asks for the image URL
3. A new ImageNode is created with the provided URL
4. The node is inserted at the current cursor position
5. The image appears immediately in the editor

### Saving Content
1. When content is saved, ImageNodes are converted back to HTML
2. The `exportDOM()` method generates proper `<img>` tags
3. All image attributes (src, alt, width, height, class) are preserved
4. The HTML is sent to WordPress with images intact

## Benefits

1. **Full Image Support:** WordPress posts with inline images now display correctly
2. **WYSIWYG Experience:** Users see images exactly as they appear in WordPress
3. **Image Insertion:** Users can add new images via URL
4. **Responsive Design:** Images scale properly on different screen sizes
5. **Attribute Preservation:** All image attributes are maintained during edit cycles
6. **Clean HTML Output:** Generates standard HTML `<img>` tags compatible with WordPress

## Testing Recommendations

1. **Test Loading Posts with Images:**
   - Open a WordPress post that contains inline images
   - Verify images display in the editor
   - Check that image sizes and attributes are correct

2. **Test Image Insertion:**
   - Click the Image button in the toolbar
   - Enter an image URL
   - Verify the image appears in the editor
   - Save the post and check it in WordPress

3. **Test Image Editing:**
   - Load a post with images
   - Edit the text around images
   - Save and verify images remain intact

4. **Test Responsive Behavior:**
   - Resize the editor window
   - Verify images scale appropriately
   - Check on mobile viewport sizes

## Future Enhancements

Potential improvements for the image functionality:

1. **Image Upload:** Add ability to upload images directly from the editor
2. **Image Resizing:** Add drag handles to resize images in the editor
3. **Image Alignment:** Add buttons for left/center/right alignment
4. **Image Captions:** Support for adding captions below images
5. **Image Gallery:** Support for multiple images in a gallery layout
6. **Alt Text Editor:** UI for editing alt text without using prompts
7. **Image Library:** Browse and select from WordPress media library
8. **Drag & Drop:** Support for dragging images into the editor

## Technical Notes

- **Lexical Version:** 0.36.2
- **Node Type:** DecoratorNode (renders custom React components)
- **HTML Compatibility:** Fully compatible with WordPress HTML
- **Performance:** Efficient rendering with React memoization
- **Accessibility:** Preserves alt text for screen readers

## Files Modified

1. `src/components/ImageNode.tsx` - New file
2. `src/components/RichTextEditor.tsx` - Enhanced with image support
3. `src/index.css` - Added image styling

## Dependencies

No new dependencies were added. The solution uses existing Lexical packages:
- `lexical` - Core editor functionality
- `@lexical/react` - React integration
- `@lexical/html` - HTML import/export

## Conclusion

The WYSIWYG editor now fully supports inline images from WordPress posts. Users can view, edit, and insert images seamlessly within the editor, providing a true WYSIWYG experience that matches the WordPress content.

