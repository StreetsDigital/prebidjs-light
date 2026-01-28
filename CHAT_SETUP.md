# Chat Interface Setup - Claude Haiku Integration

## Overview

The chat interface is configured to use **Claude 3.5 Haiku** - Anthropic's fastest and most cost-effective model, perfect for conversational chat applications.

---

## Cost Comparison

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Speed | Best For |
|-------|----------------------|------------------------|-------|----------|
| **Claude 3.5 Haiku** | **$0.80** | **$4.00** | **Fastest** | **Chat, Quick Tasks** ✅ |
| Claude 3.5 Sonnet | $3.00 | $15.00 | Fast | Complex Reasoning |
| Claude 3 Opus | $15.00 | $75.00 | Slower | Most Advanced Tasks |

**Haiku is ~4x cheaper than Sonnet** and perfect for chat use cases!

---

## Setup Instructions

### 1. Install Anthropic SDK

```bash
cd apps/api
npm install @anthropic-ai/sdk
```

### 2. Get API Key

1. Go to [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 3. Configure Environment

Add to `apps/api/.env`:

```bash
# Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
```

### 4. Enable Claude Integration

In `apps/api/src/routes/chat.ts`, uncomment the Claude integration block:

**Find this section (~line 138):**
```typescript
// TODO: Uncomment this block to enable Claude Haiku
/*
const Anthropic = require('@anthropic-ai/sdk');
...
*/
```

**Uncomment it to enable:**
```typescript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
// ... rest of the code
```

### 5. Remove Mock Responses

After uncommenting, you can remove or comment out the mock response section:

```typescript
// MOCK RESPONSES - Remove this section when Claude Haiku is enabled
const lowerMessage = message.toLowerCase();
// ... all the mock response code
```

### 6. Restart API Server

```bash
cd apps/api
npm run dev
```

---

## Configuration Options

### System Prompt

The default system prompt is optimized for ad operations:

```typescript
system: `You are an AdOps Assistant for a Prebid.js platform.
Help users manage publishers, ad units, bidders, and revenue optimization.
Keep responses concise and actionable.`
```

**Customize it** by editing the `system` parameter in `generateAIResponse()`.

### Token Limits

```typescript
max_tokens: 1024  // Adjust based on needs
```

- **1024 tokens** ≈ 750 words
- Increase for longer responses
- Decrease to save costs

### Context Window

```typescript
messages: [
  ...history.slice(-5).map(...)  // Last 5 messages
]
```

- Currently includes last 5 messages for context
- Increase for more context (higher cost)
- Decrease for faster/cheaper responses

---

## Cost Estimation

### Example Chat Session

**Assumptions:**
- 10 messages per session
- 50 tokens input per message
- 200 tokens output per response
- Average session: 500 input + 2000 output tokens

**Cost per session:**
```
Input:  500 tokens × ($0.80 / 1M) = $0.0004
Output: 2000 tokens × ($4.00 / 1M) = $0.008
Total: $0.0084 per session (~$0.01)
```

**Monthly estimate (1000 sessions):**
- 1000 sessions × $0.0084 = **$8.40/month**

**Very affordable!** 🎉

---

## Advanced Configuration

### Tool Use / Function Calling

Enable actions by parsing structured outputs:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  tools: [
    {
      name: 'list_publishers',
      description: 'List all publishers in the system',
      input_schema: {
        type: 'object',
        properties: {}
      }
    },
    {
      name: 'get_revenue',
      description: 'Get revenue data for a time period',
      input_schema: {
        type: 'object',
        properties: {
          start_date: { type: 'string' },
          end_date: { type: 'string' }
        },
        required: ['start_date', 'end_date']
      }
    }
  ],
  messages: [...]
});

// Handle tool use
if (response.stop_reason === 'tool_use') {
  // Execute the tool and return results
}
```

### Streaming Responses

For real-time typing effect:

```typescript
const stream = await anthropic.messages.stream({
  model: 'claude-3-5-haiku-20241022',
  max_tokens: 1024,
  messages: [...]
});

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    // Send chunk to frontend via WebSocket or SSE
  }
}
```

---

## Testing

### 1. Test with Mock Data

Current setup works with mock responses - no API key needed.

### 2. Test with Claude

After setup, try these queries:
- "List my publishers"
- "Show me revenue this week"
- "How do I create an AB test?"
- "What bidders are available?"

### 3. Monitor Usage

Check usage at [https://console.anthropic.com/settings/usage](https://console.anthropic.com/settings/usage)

---

## Troubleshooting

### "API key not found"
```bash
# Check .env file exists
cat apps/api/.env | grep ANTHROPIC_API_KEY

# Restart server after adding key
```

### "Module not found: @anthropic-ai/sdk"
```bash
cd apps/api
npm install @anthropic-ai/sdk
```

### "Rate limit exceeded"
- Default limit: 50 requests/minute (free tier)
- Upgrade plan or add rate limiting to chat

### High costs
- Reduce `max_tokens` (currently 1024)
- Reduce context (currently last 5 messages)
- Add caching for common queries

---

## Production Checklist

- [ ] Install `@anthropic-ai/sdk`
- [ ] Set `ANTHROPIC_API_KEY` in production `.env`
- [ ] Uncomment Claude integration in `chat.ts`
- [ ] Remove/comment mock response code
- [ ] Test chat functionality
- [ ] Monitor API usage and costs
- [ ] Set up error handling/fallbacks
- [ ] Configure rate limiting
- [ ] Enable streaming responses (optional)
- [ ] Add tool use for database actions (optional)

---

## Support

- **Anthropic Docs:** https://docs.anthropic.com/
- **Claude Models:** https://docs.anthropic.com/en/docs/about-claude/models
- **API Reference:** https://docs.anthropic.com/en/api/messages

---

**Model:** Claude 3.5 Haiku (claude-3-5-haiku-20241022)
**Pricing:** $0.80/1M input tokens, $4.00/1M output tokens
**Speed:** ~4x faster than Sonnet
**Status:** ✅ Configured and Ready

---

**Last Updated:** January 28, 2026
