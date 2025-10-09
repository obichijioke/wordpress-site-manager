# Image Suggestions - Expected Behavior Examples

## How It Works Now

The AI now extracts **actual names, specific events, and locations** from your article content to create precise image search terms.

## Example 1: Celebrity News Article

**Article:**
```
Title: "Nicki Minaj's Stunning Grammy Performance"

Content: "Nicki Minaj took the stage at the 2024 Grammy Awards with an 
unforgettable performance. The rapper wore a custom Versace gown and 
performed her hit single 'Super Freaky Girl' to a standing ovation..."
```

**Expected Suggestions:**
```json
[
  "Nicki Minaj at the Grammys",
  "Nicki Minaj Grammy performance",
  "Nicki Minaj Versace gown",
  "Grammy Awards 2024 stage",
  "Nicki Minaj performing on stage"
]
```

## Example 2: Sports Article

**Article:**
```
Title: "LeBron James Breaks Scoring Record"

Content: "LeBron James made history last night at the Lakers game, 
breaking the all-time NBA scoring record. The crowd at Crypto.com Arena 
erupted as James sank the record-breaking shot..."
```

**Expected Suggestions:**
```json
[
  "LeBron James Lakers game",
  "LeBron James breaking scoring record",
  "Crypto.com Arena Lakers",
  "LeBron James celebrating",
  "NBA basketball game Lakers"
]
```

## Example 3: Fashion/Entertainment Article

**Article:**
```
Title: "Cardi B's Gym Wardrobe Malfunction Goes Viral"

Content: "Rapper Cardi B experienced an embarrassing wardrobe malfunction 
during her workout at Equinox gym in Miami. The incident was caught on 
camera and quickly went viral on social media..."
```

**Expected Suggestions:**
```json
[
  "Cardi B at the gym",
  "Cardi B wardrobe malfunction",
  "Cardi B workout",
  "Equinox gym Miami",
  "Cardi B viral moment"
]
```

## Example 4: Political Article

**Article:**
```
Title: "President Biden Addresses Climate Change"

Content: "President Joe Biden delivered a major speech on climate policy 
at the White House today. Standing in the Rose Garden, Biden outlined 
new initiatives to combat global warming..."
```

**Expected Suggestions:**
```json
[
  "Joe Biden giving speech",
  "President Biden White House",
  "Biden Rose Garden speech",
  "White House press conference",
  "Joe Biden climate policy"
]
```

## Example 5: Entertainment Event

**Article:**
```
Title: "Taylor Swift Dominates MTV Video Music Awards"

Content: "Taylor Swift swept the MTV VMAs last night, taking home five 
awards including Video of the Year. The pop star performed her latest 
single and gave an emotional acceptance speech..."
```

**Expected Suggestions:**
```json
[
  "Taylor Swift at MTV VMAs",
  "Taylor Swift acceptance speech",
  "Taylor Swift performing on stage",
  "MTV Video Music Awards",
  "Taylor Swift with award"
]
```

## Example 6: Travel Article

**Article:**
```
Title: "Best Views from the Eiffel Tower"

Content: "The Eiffel Tower in Paris offers breathtaking panoramic views 
of the city. Visitors can see landmarks like the Arc de Triomphe, 
Notre-Dame Cathedral, and the Seine River from the observation deck..."
```

**Expected Suggestions:**
```json
[
  "Eiffel Tower Paris",
  "view from Eiffel Tower",
  "Paris skyline from Eiffel Tower",
  "Arc de Triomphe Paris",
  "Seine River Paris"
]
```

## Example 7: Tech/Business Article

**Article:**
```
Title: "Elon Musk Unveils New Tesla Model"

Content: "Tesla CEO Elon Musk revealed the company's latest electric 
vehicle at a launch event in Austin, Texas. Musk demonstrated the car's 
autonomous driving features and announced a starting price..."
```

**Expected Suggestions:**
```json
[
  "Elon Musk Tesla presentation",
  "Elon Musk at Tesla event",
  "Tesla launch event Austin",
  "Elon Musk unveiling car",
  "Tesla electric vehicle"
]
```

## Example 8: No Specific Names (Generic Article)

**Article:**
```
Title: "Tips for Better Sleep"

Content: "Getting quality sleep is essential for health. Create a 
relaxing bedtime routine, keep your bedroom cool and dark, and avoid 
screens before bed..."
```

**Expected Suggestions (falls back to descriptive):**
```json
[
  "person sleeping in bed",
  "dark bedroom at night",
  "bedtime routine",
  "relaxing bedroom environment",
  "peaceful sleep"
]
```

## Key Differences

### ❌ OLD (Generic):
```json
["business", "technology", "professional"]
```

### ✅ NEW (Specific with Names):
```json
["Elon Musk Tesla presentation", "Tesla launch event Austin", "Elon Musk unveiling car"]
```

---

### ❌ OLD (Generic):
```json
["celebrity", "awards show", "performance"]
```

### ✅ NEW (Specific with Names):
```json
["Nicki Minaj at the Grammys", "Nicki Minaj Grammy performance", "Grammy Awards 2024 stage"]
```

---

### ❌ OLD (Generic):
```json
["athlete", "sports", "game"]
```

### ✅ NEW (Specific with Names):
```json
["LeBron James Lakers game", "LeBron James breaking scoring record", "Crypto.com Arena Lakers"]
```

## What the AI Now Does

1. **Scans for Names**: Identifies all person names, place names, event names
2. **Extracts Context**: Understands what those people/places are doing
3. **Combines Them**: Creates search terms like "Name + Action/Event"
4. **Prioritizes Specificity**: Always uses actual names over generic terms

## Testing Your Articles

**Good Test Article (with names):**
```
Title: "Kim Kardashian's Met Gala Appearance"
Content: "Kim Kardashian stunned at the Met Gala in New York..."
```

**Expected:**
- "Kim Kardashian Met Gala"
- "Kim Kardashian red carpet"
- "Met Gala New York"

**Generic Article (no names):**
```
Title: "How to Cook Pasta"
Content: "Cooking pasta is simple. Boil water, add salt..."
```

**Expected:**
- "cooking pasta in pot"
- "boiling water for pasta"
- "fresh pasta ingredients"

## Temperature Setting

- **Temperature: 0.5** (was 0.7)
- Lower temperature = more focused on extracting exact names
- Higher temperature = more creative but might hallucinate names

## Token Limit

- **maxTokens: 300** (was 250)
- Allows for longer, more descriptive search terms
- Accommodates full names + events (e.g., "Nicki Minaj at the Grammy Awards 2024")

## Important Notes

⚠️ **Content Filter Consideration:**
- Some celebrity names + events might still trigger filters
- If you get empty responses, check the server logs for `finishReason: 'content_filter'`
- The AI will try to generate suggestions but the provider might block them

✅ **Best Practice:**
- Write articles with specific names and events
- The more specific your content, the better the suggestions
- Generic articles will get generic suggestions

## Restart Required

**Don't forget to restart your server to load the new prompt!**

```bash
npm run server:dev
```

Then test with an article that mentions specific people, places, or events!

