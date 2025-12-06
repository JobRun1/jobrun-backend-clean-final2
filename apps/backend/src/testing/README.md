# AI Scheduling Engine - Testing Harness

Local simulation suite for testing the AI Scheduling Engine without Twilio.

## Quick Start

1. **Start the backend server:**
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Run a test (in a new terminal):**
   ```bash
   npx tsx scripts/run-ai-test.ts test1
   ```

## Available Tests

### test1.json
Standard booking flow with preference changes and confirmation.

**Messages:**
- "Hi, I need an appointment"
- "Tomorrow morning works"
- "No that time doesn't work"
- "How about after 3?"
- "Yes, book it"

### test-urgent.json
Urgent/ASAP request with slot negotiation.

**Messages:**
- "It's urgent, can you fit me in ASAP?"
- "No, later if possible"
- "Ok yes that works"

### test-date-specific.json
Specific date request with time preference.

**Messages:**
- "I'd like to book an appointment for next Friday"
- "Preferably in the afternoon"
- "Perfect, book it"

### test-closed-day.json
Request for closed day with alternative suggestion.

**Messages:**
- "Can I get an appointment on Sunday?"
- "Monday works for me"
- "Yes please book it"

## Creating Custom Tests

Create a new JSON file in `conversationTests/` directory:

```json
[
  { "user": "Your first message" },
  { "user": "Your second message" },
  { "user": "Your third message" }
]
```

Then run it:
```bash
npx tsx scripts/run-ai-test.ts your-test-name
```

## Using AISimulator Programmatically

```typescript
import { AISimulator } from './apps/backend/src/testing/AISimulator';

const sim = new AISimulator(
  'client-id-here',
  'John Doe',
  '+1234567890'
);

// Send single message
await sim.send("I need an appointment");

// Send sequence
await sim.sendSequence([
  "Tomorrow morning",
  "Yes, book it"
]);

// Reset conversation
sim.reset();
```

## Console Output

The simulator provides color-coded output:

- **Blue (User):** Customer messages
- **Green (AI):** AI responses
- **Yellow (→):** Proposed time slots
- **Green (✓):** Booking confirmations
- **Red (✖):** Errors

## Testing with Different Client IDs

To test with a specific client ID (must exist in database):

```bash
npx tsx scripts/run-ai-test.ts test1 cm123abc
```

## Prerequisites

- Backend server must be running on `http://localhost:3001`
- Client ID must exist in database with availability configured
- Database must be seeded with availability rules

## Troubleshooting

### "Cannot find module 'uuid'"
```bash
cd apps/backend
npm install uuid @types/uuid
```

### "Connection refused"
Ensure backend is running:
```bash
cd apps/backend
npm run dev
```

### "No availability found"
The client needs WeeklyAvailability records in the database. Create them via the admin dashboard or seed script.

## Implementation Details

### AISimulator.ts
- Maintains conversation state across turns
- Uses fetch to POST to `/api/ai/scheduling`
- Formats dates/times for display
- Provides color-coded console output

### run-ai-test.ts
- Loads JSON test scripts
- Loops through messages sequentially
- Provides test summary statistics
- Lists available tests when run without arguments
