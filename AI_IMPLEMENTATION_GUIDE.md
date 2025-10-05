# AI Features - Step-by-Step Implementation Guide

## Quick Start (15 Minutes)

### Step 1: Install Dependencies

```bash
npm install openai
npm install --save-dev @types/node
```

### Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Step 3: Update Environment Variables

Add to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# AI Feature Flags
AI_FEATURES_ENABLED=true
AI_RATE_LIMIT_PER_MINUTE=20
AI_MONTHLY_TOKEN_LIMIT=100000
```

### Step 4: Update Database Schema

Add to `prisma/schema.prisma`:

```prisma
model AIUsage {
  id            String   @id @default(cuid())
  userId        String   @map("user_id")
  feature       String
  tokensUsed    Int      @map("tokens_used")
  cost          Float
  model         String
  success       Boolean  @default(true)
  errorMessage  String?  @map("error_message")
  createdAt     DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@map("ai_usage")
}

model AISettings {
  id                String   @id @default(cuid())
  userId            String   @unique @map("user_id")
  monthlyTokenLimit Int      @default(100000) @map("monthly_token_limit")
  preferredModel    String   @default("gpt-3.5-turbo") @map("preferred_model")
  enabledFeatures   String   @default("[]") @map("enabled_features")
  customPrompts     String   @default("{}") @map("custom_prompts")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("ai_settings")
}
```

Update User model:

```prisma
model User {
  // ... existing fields
  aiUsage    AIUsage[]
  aiSettings AISettings?
}
```

Run migration:

```bash
npx prisma migrate dev --name add_ai_features
npx prisma generate
```

---

## File Structure

Create these new files:

```
api/
├── services/
│   └── ai/
│       ├── openai.service.ts      # OpenAI API wrapper
│       ├── prompt.templates.ts    # Reusable prompts
│       ├── usage.tracker.ts       # Track AI usage
│       └── types.ts               # TypeScript types
├── routes/
│   └── ai.ts                      # AI API endpoints
└── middleware/
    └── ai-rate-limit.ts           # Rate limiting

src/
├── components/
│   └── ai/
│       ├── AIAssistantPanel.tsx   # Main AI panel
│       ├── AIToolbarButton.tsx    # Toolbar integration
│       ├── AILoadingState.tsx     # Loading UI
│       └── AIPreviewModal.tsx     # Preview suggestions
├── lib/
│   └── ai-api.ts                  # Frontend AI client
├── stores/
│   └── aiStore.ts                 # Zustand AI state
└── types/
    └── ai.ts                      # AI TypeScript types
```

---

## Implementation Priority

### Phase 1: MVP (Week 1-2)

**Priority 1: Content Enhancement** ⭐⭐⭐
- File: `api/services/ai/openai.service.ts`
- Endpoint: `POST /api/ai/enhance`
- UI: Button in toolbar + AI panel
- Complexity: MEDIUM
- Time: 2-3 days

**Priority 2: SEO Meta Description** ⭐⭐⭐
- File: Same service
- Endpoint: `POST /api/ai/seo-meta`
- UI: Auto-generate button in excerpt field
- Complexity: LOW
- Time: 1 day

**Priority 3: Excerpt/Summary** ⭐⭐⭐
- File: Same service
- Endpoint: `POST /api/ai/summarize`
- UI: Auto-generate button in excerpt field
- Complexity: LOW
- Time: 1 day

**Priority 4: Title Suggestions** ⭐⭐
- File: Same service
- Endpoint: `POST /api/ai/titles`
- UI: Dropdown with suggestions
- Complexity: MEDIUM
- Time: 2 days

### Phase 2: High-Value (Week 3-4)

**Priority 5: Content Generation** ⭐⭐⭐
- Endpoint: `POST /api/ai/generate`
- UI: Modal with outline input
- Complexity: HIGH
- Time: 3-4 days

**Priority 6: Tone Adjustment** ⭐⭐
- Endpoint: `POST /api/ai/tone`
- UI: Tone selector dropdown
- Complexity: MEDIUM
- Time: 2 days

**Priority 7: SEO Keywords** ⭐⭐
- Endpoint: `POST /api/ai/keywords`
- UI: Keyword analysis panel
- Complexity: MEDIUM
- Time: 2-3 days

### Phase 3: Advanced (Week 5-6)

**Priority 8: Translation** ⭐
- Endpoint: `POST /api/ai/translate`
- UI: Language selector
- Complexity: MEDIUM
- Time: 2-3 days

**Priority 9: Image Alt Text** ⭐
- Endpoint: `POST /api/ai/alt-text`
- UI: Auto-generate on image upload
- Complexity: LOW
- Time: 1-2 days

**Priority 10: Content Outline** ⭐
- Endpoint: `POST /api/ai/outline`
- UI: Outline generator modal
- Complexity: MEDIUM
- Time: 2 days

---

## Code Templates

### 1. OpenAI Service (api/services/ai/openai.service.ts)

```typescript
import OpenAI from 'openai'
import { prisma } from '../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface AIResponse {
  content: string
  tokensUsed: number
  cost: number
  model: string
}

export class OpenAIService {
  private static calculateCost(tokens: number, model: string): number {
    const pricing = {
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
    }
    const rate = pricing[model] || pricing['gpt-3.5-turbo']
    return (tokens / 1000) * rate.output
  }

  static async enhanceContent(
    content: string,
    userId: string
  ): Promise<AIResponse> {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional content editor. Improve the grammar, clarity, and readability of the text while maintaining the original meaning and tone.',
          },
          {
            role: 'user',
            content: `Please enhance this content:\n\n${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      const enhanced = response.choices[0].message.content || content
      const tokensUsed = response.usage?.total_tokens || 0
      const cost = this.calculateCost(tokensUsed, response.model)

      // Track usage
      await prisma.aIUsage.create({
        data: {
          userId,
          feature: 'enhance',
          tokensUsed,
          cost,
          model: response.model,
          success: true,
        },
      })

      return {
        content: enhanced,
        tokensUsed,
        cost,
        model: response.model,
      }
    } catch (error) {
      console.error('OpenAI enhance error:', error)
      
      // Track failed usage
      await prisma.aIUsage.create({
        data: {
          userId,
          feature: 'enhance',
          tokensUsed: 0,
          cost: 0,
          model: 'gpt-3.5-turbo',
          success: false,
          errorMessage: error.message,
        },
      })

      throw new Error('Failed to enhance content')
    }
  }

  static async generateMetaDescription(
    content: string,
    userId: string
  ): Promise<AIResponse> {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate a compelling SEO meta description (150-160 characters) that summarizes the content and encourages clicks.',
        },
        {
          role: 'user',
          content: `Content:\n\n${content.substring(0, 2000)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    const metaDescription = response.choices[0].message.content || ''
    const tokensUsed = response.usage?.total_tokens || 0
    const cost = this.calculateCost(tokensUsed, response.model)

    await prisma.aIUsage.create({
      data: {
        userId,
        feature: 'seo-meta',
        tokensUsed,
        cost,
        model: response.model,
        success: true,
      },
    })

    return { content: metaDescription, tokensUsed, cost, model: response.model }
  }

  static async summarizeContent(
    content: string,
    userId: string,
    length: number = 150
  ): Promise<AIResponse> {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Create a concise summary of approximately ${length} words that captures the main points.`,
        },
        {
          role: 'user',
          content: `Content:\n\n${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: Math.ceil(length * 1.5),
    })

    const summary = response.choices[0].message.content || ''
    const tokensUsed = response.usage?.total_tokens || 0
    const cost = this.calculateCost(tokensUsed, response.model)

    await prisma.aIUsage.create({
      data: {
        userId,
        feature: 'summarize',
        tokensUsed,
        cost,
        model: response.model,
        success: true,
      },
    })

    return { content: summary, tokensUsed, cost, model: response.model }
  }

  static async generateTitles(
    content: string,
    userId: string,
    count: number = 5
  ): Promise<AIResponse> {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Generate ${count} engaging, SEO-optimized title suggestions. Return only the titles, one per line.`,
        },
        {
          role: 'user',
          content: `Content:\n\n${content.substring(0, 1000)}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 200,
    })

    const titles = response.choices[0].message.content || ''
    const tokensUsed = response.usage?.total_tokens || 0
    const cost = this.calculateCost(tokensUsed, response.model)

    await prisma.aIUsage.create({
      data: {
        userId,
        feature: 'titles',
        tokensUsed,
        cost,
        model: response.model,
        success: true,
      },
    })

    return { content: titles, tokensUsed, cost, model: response.model }
  }
}
```

### 2. AI Routes (api/routes/ai.ts)

```typescript
import { Router, Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth'
import { OpenAIService } from '../services/ai/openai.service'

const router = Router()

// Enhance content
router.post('/enhance', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    if (content.length > 50000) {
      res.status(400).json({ error: 'Content too long (max 50,000 characters)' })
      return
    }

    const result = await OpenAIService.enhanceContent(content, req.user!.id)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('AI enhance error:', error)
    res.status(500).json({ error: 'Failed to enhance content' })
  }
})

// Generate SEO meta description
router.post('/seo-meta', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await OpenAIService.generateMetaDescription(content, req.user!.id)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('AI seo-meta error:', error)
    res.status(500).json({ error: 'Failed to generate meta description' })
  }
})

// Summarize content
router.post('/summarize', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, length = 150 } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await OpenAIService.summarizeContent(content, req.user!.id, length)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('AI summarize error:', error)
    res.status(500).json({ error: 'Failed to summarize content' })
  }
})

// Generate title suggestions
router.post('/titles', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, count = 5 } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await OpenAIService.generateTitles(content, req.user!.id, count)

    res.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('AI titles error:', error)
    res.status(500).json({ error: 'Failed to generate titles' })
  }
})

export default router
```

---

## Next Steps

1. **Review the full plan:** `AI_INTEGRATION_PLAN.md`
2. **Follow this guide** to implement MVP features
3. **Test each feature** before moving to the next
4. **Monitor costs** using the usage tracking
5. **Gather user feedback** and iterate

**Estimated Time to MVP:** 2-3 weeks
**Estimated Cost:** ~$1/user/month

Ready to start? Begin with Step 1: Install Dependencies!

