import { Router } from 'express';
import healthRouter from './health';
import versionRouter from './version';
import twilioRouter from './twilio';
import messagesRouter from './messages';
import bookingRouter from './booking';
import calendarRouter from './calendar';
import adminRouter from './admin';
import authRouter from './auth';
import customersRouter from './customers';
import bookingsRouter from './bookings';
import agentsRouter from './agents';
import settingsRouter from './settings';
import analyticsRouter from './analytics';
import leadsRouter from './leads';
import fakeDataRouter from './fakeData';
import demoModeRouter from './demoMode';
import availabilityRouter from './availability';
import blockedTimesRouter from './blockedTimes';
import handoverRouter from './handover';

const router = Router();

// Phase 1 routes
router.use('/health', healthRouter);
router.use('/version', versionRouter);

// Phase 2 routes - Communication Engine
router.use('/twilio', twilioRouter);
router.use('/messages', messagesRouter);
router.use('/booking', bookingRouter);
router.use('/calendar', calendarRouter);

// Phase 5 routes - Admin Dashboard
router.use('/admin', adminRouter);

// Phase 5.1 routes - Authentication
router.use('/auth', authRouter);

// Client dashboard routes
router.use('/customers', customersRouter);
router.use('/bookings', bookingsRouter);
router.use('/agents', agentsRouter);
router.use('/settings', settingsRouter);
router.use('/analytics', analyticsRouter);
router.use('/leads', leadsRouter);
router.use('/fake-data', fakeDataRouter);
router.use('/demo-mode', demoModeRouter);

// Calendar Phase 2 routes
router.use('/availability', availabilityRouter);
router.use('/blocked-times', blockedTimesRouter);

// Phase 11A routes - Human Handover
router.use('/handover', handoverRouter);

export default router;
