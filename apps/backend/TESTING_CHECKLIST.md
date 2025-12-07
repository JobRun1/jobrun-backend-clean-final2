# Phase 4 Step 1: Inbound SMS AI Pipeline - Testing Checklist

## Pre-Testing Setup

### 1. Environment Configuration
- [ ] Verify `OPENAI_API_KEY` is set in `.env` file
- [ ] Verify `DEFAULT_CLIENT_ID` exists and points to a valid client in database
- [ ] Verify all Twilio environment variables are configured
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Run database migrations if schema changed

### 2. Database Setup
- [ ] Ensure you have a test client in the `clients` table
- [ ] Create or verify `client_settings` record with:
  ```json
  {
    "aiTone": "friendly and professional",
    "bookingUrl": "https://your-booking-link.com",
    "postCallWindowMinutes": 30
  }
  ```
- [ ] Verify database connection is working

### 3. Server Startup
- [ ] Start backend server: `cd apps/backend && npm run dev`
- [ ] Verify server starts without errors
- [ ] Check console logs show:
  - ✅ OPENAI_API_KEY loaded
  - ✅ DEFAULT_CLIENT_ID loaded
  - ✅ Server listening on port

## Agent Testing (Individual Components)

### SENTINEL Guard
Test cases:
- [ ] Send normal message → should allow
- [ ] Send empty message → should block
- [ ] Send message with excessive profanity → should block
- [ ] Send message with unsafe content (threats) → should block
- [ ] Send spam message with multiple URLs → should block
- [ ] Send message > 1600 chars → should block

### VAULT Context Loader
Test cases:
- [ ] New lead (no messages) → should return empty message array
- [ ] Existing lead with messages → should return last 20 messages
- [ ] Verify messages are ordered chronologically (oldest first)

### DIAL Intent Classifier
Test cases:
- [ ] "Hi there" → should classify as GREETING
- [ ] "I need a plumber" → should classify as JOB_DESCRIPTION or BOOKING_REQUEST
- [ ] "How much do you charge?" → should classify as QUESTION
- [ ] "Emergency! Water everywhere!" → should classify as URGENT_PROBLEM
- [ ] "Thanks, goodbye" → should classify as CLOSING
- [ ] "Following up on my quote" → should classify as FOLLOW_UP

### FLOW Entity Extractor
Test cases:
- [ ] "I need a plumber for 123 Main St" → should extract jobType, location
- [ ] "Emergency! Burst pipe!" → should extract urgency=HIGH
- [ ] "Can you fix my HVAC next week?" → should extract jobType, urgency=LOW
- [ ] "Hi" → should return empty entities (greeting)

### RUNE Decision Engine
Test cases:
- [ ] GREETING intent + first message → action=ASK_QUESTION, stateEvent=CONTACTED
- [ ] URGENT_PROBLEM + clear jobType + booking URL → action=SEND_BOOKING_LINK, stateEvent=QUALIFIED
- [ ] BOOKING_REQUEST + booking URL → action=SEND_BOOKING_LINK, stateEvent=QUALIFIED
- [ ] JOB_DESCRIPTION + enough info + booking URL → action=SEND_BOOKING_LINK
- [ ] QUESTION intent → action=ASK_QUESTION
- [ ] CLOSING intent → action=ACK_ONLY

### LYRA Reply Generator
Test cases:
- [ ] ASK_QUESTION + GREETING → should generate welcoming message
- [ ] SEND_BOOKING_LINK + booking URL → should include booking URL in reply
- [ ] ACK_ONLY + CLOSING → should generate polite goodbye
- [ ] Generated messages should be < 1600 characters
- [ ] Generated messages should match configured aiTone

## End-to-End Pipeline Testing

### Test via Twilio Webhook (Recommended)

1. **Setup ngrok tunnel (for local testing)**
   ```bash
   ngrok http 3000
   ```
   - [ ] Copy ngrok URL (e.g., `https://abc123.ngrok.io`)

2. **Configure Twilio webhook**
   - [ ] Go to Twilio Console → Phone Numbers → Your Number
   - [ ] Set "A MESSAGE COMES IN" webhook to: `https://abc123.ngrok.io/twilio/sms`
   - [ ] Save configuration

3. **Test Conversation Flow**

   **Scenario 1: New Lead - Greeting**
   - [ ] Send: "Hi"
   - [ ] Expect: Welcoming message asking how to help
   - [ ] Verify: Lead status = CONTACTED
   - [ ] Verify: Messages logged in database

   **Scenario 2: Job Description**
   - [ ] Send: "I need a plumber, my sink is leaking at 123 Main St"
   - [ ] Expect: Either clarifying question OR booking link (if enough info)
   - [ ] Verify: Entities extracted (jobType=plumbing, location=123 Main St)

   **Scenario 3: Booking Request**
   - [ ] Send: "I'd like to book an appointment"
   - [ ] Expect: Booking link sent
   - [ ] Verify: Lead status = QUALIFIED
   - [ ] Verify: Booking URL appears in response

   **Scenario 4: Urgent Problem**
   - [ ] Send: "URGENT! Water everywhere! Burst pipe!"
   - [ ] Expect: Immediate response with booking link or escalation
   - [ ] Verify: Urgency extracted as HIGH

   **Scenario 5: Question**
   - [ ] Send: "How much do you charge for a bathroom remodel?"
   - [ ] Expect: Helpful answer or request for more details

   **Scenario 6: Closing**
   - [ ] Send: "Thanks so much!"
   - [ ] Expect: Polite acknowledgment
   - [ ] Verify: Lead status unchanged

### Verify Database Logs

After each test:
- [ ] Check `messages` table for INBOUND and OUTBOUND entries
- [ ] Check `leads` table for correct status transitions
- [ ] Verify message metadata contains intent, action, entities

### Error Handling Tests

1. **Invalid/Missing API Key**
   - [ ] Remove `OPENAI_API_KEY` temporarily
   - [ ] Send message
   - [ ] Expect: Fallback error message sent
   - [ ] Verify: Error logged to console

2. **Blocked Message (SENTINEL)**
   - [ ] Send message with profanity or unsafe content
   - [ ] Expect: Safe fallback message
   - [ ] Verify: SENTINEL block logged in messages table

3. **Missing Client Settings**
   - [ ] Temporarily remove client_settings record
   - [ ] Send message
   - [ ] Expect: Pipeline works with null settings
   - [ ] Verify: No booking link sent (gracefully handled)

## Performance & Monitoring

- [ ] Check response time (should be < 5 seconds per message)
- [ ] Monitor OpenAI API usage in console logs
- [ ] Verify no memory leaks after 20+ messages
- [ ] Check for proper error handling and recovery

## Multi-Conversation Testing

- [ ] Test multiple leads simultaneously (different phone numbers)
- [ ] Verify each conversation maintains separate context
- [ ] Ensure no cross-contamination between leads

## State Machine Verification

Test state transitions:
- [ ] NEW → CONTACTED (first interaction)
- [ ] CONTACTED → QUALIFIED (clear job + booking request)
- [ ] Multiple messages in same state (no unwanted transitions)
- [ ] QUALIFIED lead receiving follow-up (stays QUALIFIED)

## Final Checklist

- [ ] All agent utilities work independently
- [ ] Full pipeline executes without errors
- [ ] Twilio webhook integration works
- [ ] Database logging is accurate
- [ ] Error handling is graceful
- [ ] Lead states transition correctly
- [ ] AI responses are appropriate and helpful
- [ ] No sensitive data leaked in logs
- [ ] Performance is acceptable

## Notes

Record any issues or observations:

```
Issue: [Description]
Reproduction: [Steps]
Expected: [What should happen]
Actual: [What happened]
Fix: [How it was resolved]
```

## Success Criteria

Pipeline is ready for production when:
1. All test scenarios pass
2. Error handling is robust
3. AI responses are high quality
4. Performance meets requirements (< 5s response)
5. Database logging is accurate
6. No memory leaks or crashes
7. Twilio integration is stable
