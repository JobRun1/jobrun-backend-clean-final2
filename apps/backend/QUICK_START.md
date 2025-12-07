# Quick Start Guide - Phase 4 Inbound SMS AI Pipeline

## Setup (5 minutes)

### 1. Install Dependencies
```bash
cd apps/backend
npm install
```

### 2. Configure Environment Variables
Add to your `.env` file:
```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

### 3. Setup Database (if needed)
```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Create Client Settings (Optional)
Run this SQL to configure AI settings for your test client:

```sql
INSERT INTO client_settings (id, "clientId", "businessName", metadata, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'YOUR_CLIENT_ID_HERE',
  'Test Business',
  '{
    "aiTone": "friendly and professional",
    "bookingUrl": "https://cal.com/your-business"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("clientId")
DO UPDATE SET
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();
```

### 5. Start Server
```bash
npm run dev
```

## Testing Locally with Twilio

### Setup ngrok
```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Configure Twilio Webhook
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to: Phone Numbers → Manage → Active numbers
3. Click your phone number
4. Scroll to "Messaging"
5. Set "A MESSAGE COMES IN" webhook:
   ```
   https://abc123.ngrok.io/twilio/sms
   ```
6. Click "Save"

### Send Test Messages

Text your Twilio number from your phone:

**Test 1: Greeting**
```
Hi there!
```
Expected: Welcoming message asking how to help

**Test 2: Job Description**
```
I need a plumber, my kitchen sink is leaking
```
Expected: Clarifying questions or booking link

**Test 3: Urgent Request**
```
EMERGENCY! Burst pipe! Water everywhere!
```
Expected: Immediate response with booking link

**Test 4: Question**
```
How much do you charge for bathroom remodeling?
```
Expected: Helpful response

## Verifying Pipeline Execution

Watch your server console logs for:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 INBOUND SMS AI PIPELINE START
...
1️⃣ SENTINEL: Running safety guard...
2️⃣ VAULT: Loading conversation context...
3️⃣ DIAL: Classifying intent...
4️⃣ FLOW: Extracting entities...
5️⃣ RUNE: Deciding next action...
6️⃣ STATE MACHINE: Applying state transition...
7️⃣ LYRA: Generating reply...
8️⃣ SENTINEL: Final safety check...
9️⃣ LOGGER: Recording outbound message...
✅ INBOUND SMS PIPELINE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Checking Database

### View Messages
```sql
SELECT
  direction,
  type,
  body,
  metadata,
  "createdAt"
FROM messages
WHERE "clientId" = 'YOUR_CLIENT_ID'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### View Lead Status
```sql
SELECT
  phone,
  status,
  name,
  "createdAt",
  "updatedAt"
FROM leads
WHERE "clientId" = 'YOUR_CLIENT_ID'
ORDER BY "updatedAt" DESC;
```

## Common Issues

### "OPENAI_API_KEY is required"
- Make sure `.env` file has `OPENAI_API_KEY=sk-proj-...`
- Restart server after adding env var

### "Client not found"
- Verify `DEFAULT_CLIENT_ID` in `.env` matches a real client ID in database
- Check: `SELECT id, "businessName" FROM clients;`

### No SMS response
- Check ngrok is running and URL is correct
- Verify Twilio webhook is configured
- Check server logs for errors
- Ensure OPENAI_API_KEY is valid

### "Pipeline error"
- Check server console for detailed error
- Verify database connection
- Check OpenAI API key is valid and has credits

## Production Deployment (Railway)

### Add Environment Variables
In Railway dashboard:
1. Select your service
2. Go to "Variables" tab
3. Add: `OPENAI_API_KEY` = `sk-proj-your-key-here`

### Configure Twilio Webhook
Set webhook to your Railway URL:
```
https://your-app.up.railway.app/twilio/sms
```

### Monitor Logs
```bash
railway logs
```

## Cost Monitoring

Check OpenAI usage:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to "Usage"
3. Monitor API calls and costs

Typical costs with gpt-4o-mini:
- ~$0.001 per conversation
- ~$1-5 per 1,000 conversations

## Agent Reference

| Agent | Purpose | Key Output |
|-------|---------|------------|
| SENTINEL | Safety screening | Blocks unsafe content |
| VAULT | Load context | Recent messages |
| DIAL | Intent classification | GREETING, QUESTION, BOOKING_REQUEST, etc. |
| FLOW | Entity extraction | jobType, location, urgency |
| RUNE | Decision engine | ASK_QUESTION, SEND_BOOKING_LINK, ACK_ONLY |
| LYRA | Reply generation | AI-generated SMS text |

## Customizing AI Behavior

Edit `client_settings.metadata`:

```json
{
  "aiTone": "professional and direct",
  "bookingUrl": "https://your-calendar.com",
  "postCallWindowMinutes": 30
}
```

AI tone options:
- "friendly and professional"
- "professional and direct"
- "warm and conversational"
- "technical and precise"

## Next Steps

1. ✅ Verify all tests pass (see TESTING_CHECKLIST.md)
2. Configure production client settings
3. Monitor initial conversations
4. Adjust AI tone based on customer feedback
5. Scale to multi-tenant deployment

## Support

- Full implementation details: `PHASE4_STEP1_SUMMARY.md`
- Testing guide: `TESTING_CHECKLIST.md`
- Environment setup: `ENV_VARS.md`

---

**Ready to go! Start testing with a simple "Hi" message to your Twilio number.**
