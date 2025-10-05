# AI Features - Quick Start Guide (15 Minutes)

## 🚀 Get Started in 15 Minutes

This is your express guide to get AI features running quickly.

---

## Step 1: Install Dependencies (2 minutes)

```bash
npm install openai
```

---

## Step 2: Get OpenAI API Key (3 minutes)

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Save it securely

---

## Step 3: Configure Environment (1 minute)

Add to `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
AI_FEATURES_ENABLED=true
```

---

## Step 4: Update Database (3 minutes)

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

## Step 5: Create AI Service (3 minutes)

Create `api/services/ai/openai.service.ts`:

```typescript
import OpenAI from 'openai'
import { prisma } from '../../lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export class OpenAIService {
  static async enhanceContent(content: string, userId: string) {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Improve grammar, clarity, and readability while maintaining the original meaning.',
        },
        { role: 'user', content }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const enhanced = response.choices[0].message.content || content
    const tokensUsed = response.usage?.total_tokens || 0
    const cost = (tokensUsed / 1000) * 0.002

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

    return { content: enhanced, tokensUsed, cost, model: response.model }
  }
}
```

---

## Step 6: Create AI Routes (2 minutes)

Create `api/routes/ai.ts`:

```typescript
import { Router, Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth'
import { OpenAIService } from '../services/ai/openai.service'

const router = Router()

router.post('/enhance', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body

    if (!content || content.length > 50000) {
      res.status(400).json({ error: 'Invalid content' })
      return
    }

    const result = await OpenAIService.enhanceContent(content, req.user!.id)
    res.json({ success: true, data: result })
  } catch (error) {
    console.error('AI enhance error:', error)
    res.status(500).json({ error: 'Failed to enhance content' })
  }
})

export default router
```

Register in `api/app.ts`:
```typescript
import aiRoutes from './routes/ai'
app.use('/api/ai', aiRoutes)
```

---

## Step 7: Test It! (1 minute)

```bash
npm run dev
```

Test with curl:
```bash
curl -X POST http://localhost:3001/api/ai/enhance \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"this is a test with bad grammer"}'
```

---

## ✅ You're Done!

You now have a working AI content enhancement feature!

---

## Next Steps

### Add More Features (Choose One):

**Option A: SEO Meta Description**
- Copy template from `AI_IMPLEMENTATION_GUIDE.md`
- Add to `OpenAIService`
- Create route `/api/ai/seo-meta`
- Time: 15 minutes

**Option B: Content Summarization**
- Copy template from `AI_IMPLEMENTATION_GUIDE.md`
- Add to `OpenAIService`
- Create route `/api/ai/summarize`
- Time: 15 minutes

**Option C: Title Suggestions**
- Copy template from `AI_IMPLEMENTATION_GUIDE.md`
- Add to `OpenAIService`
- Create route `/api/ai/titles`
- Time: 15 minutes

### Add Frontend UI

Follow `AI_FRONTEND_INTEGRATION.md` to add:
- AI Assistant Panel
- Toolbar buttons
- Loading states
- Preview modals

Time: 1-2 hours

---

## Troubleshooting

### Error: "OpenAI API key not found"
**Solution:** Check `.env` file has `OPENAI_API_KEY`

### Error: "Module 'openai' not found"
**Solution:** Run `npm install openai`

### Error: "Table 'AIUsage' does not exist"
**Solution:** Run `npx prisma migrate dev`

### Error: "Rate limit exceeded"
**Solution:** Wait 1 minute or upgrade OpenAI plan

### Error: "Invalid API key"
**Solution:** Verify key is correct and active

---

## Cost Monitoring

Check your usage:
```bash
curl http://localhost:3001/api/ai/usage \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected cost for testing: **$0.01-0.05**

---

## Documentation Reference

- **Full Plan:** `AI_INTEGRATION_PLAN.md`
- **Implementation Guide:** `AI_IMPLEMENTATION_GUIDE.md`
- **Frontend Integration:** `AI_FRONTEND_INTEGRATION.md`
- **Cost Analysis:** `AI_COST_ANALYSIS.md`
- **Security Guide:** `AI_SECURITY_GUIDE.md`

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the full documentation
3. Check OpenAI status: https://status.openai.com
4. Verify your API key is active

---

## Success Checklist

- [x] Dependencies installed
- [x] API key configured
- [x] Database migrated
- [x] AI service created
- [x] Routes registered
- [x] Test successful
- [ ] Frontend UI added
- [ ] Production deployment

**Congratulations! You've successfully integrated AI features! 🎉**

---

## What You've Built

✅ **Content Enhancement** - Improve grammar and clarity
✅ **Usage Tracking** - Monitor costs and usage
✅ **Secure API** - Protected with authentication
✅ **Scalable Architecture** - Ready for more features

**Next:** Add the frontend UI to make it user-friendly!

---

## Quick Commands

```bash
# Start development
npm run dev

# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# View database
npx prisma studio

# Check OpenAI usage
# Visit: https://platform.openai.com/usage
```

---

## Estimated Costs

**Development/Testing:** $0.10-0.50
**Production (100 users):** $50/month
**Per User:** $0.50/month

**ROI:** 300x return on investment

---

## Ready for Production?

Before deploying:
1. ✅ Review `AI_SECURITY_GUIDE.md`
2. ✅ Set up rate limiting
3. ✅ Configure monitoring
4. ✅ Update privacy policy
5. ✅ Test thoroughly
6. ✅ Set up alerts

---

**Happy Building! 🚀**

