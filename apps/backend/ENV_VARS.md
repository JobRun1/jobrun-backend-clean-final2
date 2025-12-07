# Environment Variables for JobRun Phase 4 - Inbound SMS AI Pipeline

## Required Environment Variables

### Existing Variables (Already Configured)

```bash
# Database
DATABASE_URL=postgresql://...

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_NUMBER=+1234567890

# Multi-tenant Configuration
DEFAULT_CLIENT_ID=cuid_of_default_client
```

### New Variables for AI Pipeline

```bash
# OpenAI API Configuration (Required for AI Pipeline)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: LLM Model Selection (defaults to gpt-4o-mini)
# Options: gpt-4, gpt-4o, gpt-4o-mini, gpt-3.5-turbo
JOBRUN_LLM_MODEL=gpt-4o-mini
```

## Example .env File

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JobRun Backend Environment Variables
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jobrun

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_NUMBER=+15551234567

# Multi-tenant
DEFAULT_CLIENT_ID=clxxxxxxxxxxxxx

# AI Pipeline (Phase 4)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
JOBRUN_LLM_MODEL=gpt-4o-mini

# Server
PORT=3000
NODE_ENV=development
```

## Testing Configuration

To test the AI pipeline locally:

1. Ensure `OPENAI_API_KEY` is set in your `.env` file
2. Configure a default client with settings in the database:

```sql
-- Insert or update client settings with AI configuration
INSERT INTO client_settings (id, "clientId", "businessName", metadata, "createdAt", "updatedAt")
VALUES (
  'clxxxxxxxxxxxxx',
  'your-client-id-here',
  'Test Business',
  '{
    "aiTone": "friendly and professional",
    "bookingUrl": "https://cal.com/your-business",
    "postCallWindowMinutes": 30
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("clientId")
DO UPDATE SET
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();
```

## Railway Deployment

Add these environment variables in Railway dashboard:

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add `OPENAI_API_KEY` with your OpenAI API key
5. Optionally add `JOBRUN_LLM_MODEL` to customize the model

Railway will automatically inject all environment variables at runtime.

## Cost Considerations

The AI pipeline uses OpenAI API calls with the following approximate costs:

- **gpt-4o-mini** (Recommended): ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4o**: ~$5 per 1M input tokens, ~$15 per 1M output tokens
- **gpt-4**: ~$30 per 1M input tokens, ~$60 per 1M output tokens

For typical SMS conversations (5-10 exchanges), expect:
- **gpt-4o-mini**: ~$0.001 - $0.005 per conversation
- **gpt-4o**: ~$0.01 - $0.05 per conversation

Start with `gpt-4o-mini` for cost efficiency and scale to `gpt-4o` if you need better reasoning.
