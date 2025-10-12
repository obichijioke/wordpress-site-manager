# AI Model Fallback Fix

## Problem

When running the RSS automation workflow, it failed with this error:

```
Article generation failed: Error: OpenAI API key not configured. 
Please select a custom model in Settings or add your OpenAI API key.
```

This happened even though the user had custom AI models configured.

## Root Cause

The `metadata` feature (used for generating categories, tags, and SEO data) was hardcoded to use `gpt-3.5-turbo` as the default model:

```typescript
metadata: (settings as any).metadataModel || 'gpt-3.5-turbo'
```

When the user didn't have:
1. A specific `metadataModel` configured in AI settings, AND
2. An OpenAI API key

The system would try to use `gpt-3.5-turbo` but fail because no OpenAI API key was available.

## Solution

Updated the `getModelForFeature` method in `api/services/ai/ai-service.ts` to implement a smart fallback strategy:

### Fallback Priority

1. **Feature-specific model** - Use the model configured for that specific feature
2. **Generate model** - Fall back to the general content generation model
3. **Custom model** - If no OpenAI key and default is gpt-3.5-turbo, use any active custom model
4. **Default** - gpt-3.5-turbo (only if OpenAI key is available)

### Code Changes

```typescript
private static async getModelForFeature(userId: string, feature: string): Promise<string> {
  const settings = await prisma.aISettings.findUnique({
    where: { userId }
  })

  if (!settings) {
    throw new Error('AI settings not configured')
  }

  const featureModelMap: Record<string, string> = {
    enhance: settings.enhanceModel,
    generate: settings.generateModel,
    summarize: settings.summarizeModel,
    'seo-meta': settings.seoMetaModel,
    titles: settings.titlesModel,
    tone: settings.toneModel,
    keywords: settings.keywordsModel,
    translate: settings.translateModel,
    'alt-text': settings.altTextModel,
    outline: settings.outlineModel,
    metadata: (settings as any).metadataModel || settings.generateModel || 'gpt-3.5-turbo'
  }

  let model = featureModelMap[feature] || settings.generateModel || 'gpt-3.5-turbo'
  
  // If the default model is gpt-3.5-turbo but user has no OpenAI key, try to use a custom model
  if (model === 'gpt-3.5-turbo' && !settings.openaiApiKey) {
    // Try to find an active custom model as fallback
    const customModel = await prisma.customModel.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (customModel) {
      model = customModel.identifier
    }
  }
  
  return model
}
```

## Benefits

1. **Automatic fallback** - System automatically uses available AI providers
2. **No configuration required** - Works out of the box if user has any AI provider configured
3. **Flexible** - Supports OpenAI, Anthropic, and custom models
4. **User-friendly** - No confusing errors about missing API keys when alternatives exist

## How It Works Now

### Scenario 1: User has custom models but no OpenAI key

**Before:**
```
❌ Error: OpenAI API key not configured
```

**After:**
```
✅ Uses the user's active custom model automatically
```

### Scenario 2: User has OpenAI key

**Before:**
```
✅ Uses gpt-3.5-turbo
```

**After:**
```
✅ Uses gpt-3.5-turbo (same behavior)
```

### Scenario 3: User has metadata model configured

**Before:**
```
✅ Uses configured metadata model
```

**After:**
```
✅ Uses configured metadata model (same behavior)
```

## Testing

To test the fix:

1. **Without OpenAI API key:**
   - Configure a custom model in AI Settings
   - Run RSS automation
   - Should use the custom model for metadata generation

2. **With OpenAI API key:**
   - Run RSS automation
   - Should use gpt-3.5-turbo for metadata generation

3. **With metadata model configured:**
   - Configure a specific model for metadata in AI Settings
   - Run RSS automation
   - Should use the configured model

## Affected Features

This fix applies to all AI features that might default to gpt-3.5-turbo:

- ✅ Metadata generation (categories, tags, SEO)
- ✅ Image search phrase generation
- ✅ Content enhancement
- ✅ Summarization
- ✅ Title generation
- ✅ Keyword extraction
- ✅ Translation
- ✅ Alt text generation
- ✅ Outline generation

All features now automatically fall back to available AI providers instead of failing with "API key not configured" errors.

## User Action Required

**None!** The system will automatically use your configured AI providers.

**Optional:** For better control, you can configure specific models for each feature in Settings → AI Settings.

