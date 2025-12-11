import { Router } from 'express';
import { prisma } from '../db';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// GET /api/client/settings?clientId=xxx&tab=business|hours|notifications|assistant|booking
router.get('/', async (req, res) => {
  try {
    const { clientId, tab = 'business' } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        businessName: true,
        phone: true,
        twilioNumber: true,
        region: true,
        timezone: true,
        operatingHours: true,
        emailAlerts: true,
        smsAlerts: true,
        dailySummary: true,
        aiTone: true,
        aiResponseLength: true,
        aiBookingStyle: true,
        defaultJobDuration: true,
        allowSameDayBookings: true,
      },
    });

    if (!client) {
      return sendError(res, 'CLIENT_NOT_FOUND', 'Client not found', 404);
    }

    // Return settings based on tab
    if (tab === 'business') {
      sendSuccess(res, {
        businessName: client.businessName,
        phone: client.phone,
        twilioNumber: client.twilioNumber,
        region: client.region || 'US',
        timezone: client.timezone,
      });
    } else if (tab === 'hours') {
      sendSuccess(res, {
        operatingHours: client.operatingHours || getDefaultOperatingHours(),
      });
    } else if (tab === 'notifications') {
      sendSuccess(res, {
        emailAlerts: client.emailAlerts ?? true,
        smsAlerts: client.smsAlerts ?? false,
        dailySummary: client.dailySummary ?? true,
      });
    } else if (tab === 'assistant') {
      sendSuccess(res, {
        aiTone: client.aiTone || 'friendly',
        aiResponseLength: client.aiResponseLength || 'medium',
        aiBookingStyle: client.aiBookingStyle || 'conversational',
      });
    } else if (tab === 'booking') {
      sendSuccess(res, {
        defaultJobDuration: client.defaultJobDuration || 60,
        allowSameDayBookings: client.allowSameDayBookings ?? true,
      });
    } else {
      return sendError(res, 'INVALID_TAB', 'Invalid settings tab', 400);
    }
  } catch (error) {
    console.error('Failed to fetch client settings:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to fetch settings', 500);
  }
});

// PUT /api/client/settings?clientId=xxx&tab=business|hours|notifications|assistant|booking
router.put('/', async (req, res) => {
  try {
    const { clientId, tab = 'business' } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return sendError(res, 'MISSING_CLIENT_ID', 'Client ID is required', 400);
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return sendError(res, 'CLIENT_NOT_FOUND', 'Client not found', 404);
    }

    let updateData: any = {};

    if (tab === 'business') {
      const { businessName, phone, twilioNumber, region, timezone } = req.body;
      updateData = {
        businessName,
        phone,
        twilioNumber,
        region,
        timezone,
      };
    } else if (tab === 'hours') {
      const { operatingHours } = req.body;
      updateData = { operatingHours };
    } else if (tab === 'notifications') {
      const { emailAlerts, smsAlerts, dailySummary } = req.body;
      updateData = { emailAlerts, smsAlerts, dailySummary };
    } else if (tab === 'assistant') {
      const { aiTone, aiResponseLength, aiBookingStyle } = req.body;
      updateData = { aiTone, aiResponseLength, aiBookingStyle };
    } else if (tab === 'booking') {
      const { defaultJobDuration, allowSameDayBookings } = req.body;
      updateData = { defaultJobDuration, allowSameDayBookings };
    } else {
      return sendError(res, 'INVALID_TAB', 'Invalid settings tab', 400);
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: updateData,
    });

    sendSuccess(res, { message: 'Settings updated successfully', client: updatedClient });
  } catch (error) {
    console.error('Failed to update client settings:', error);
    sendError(res, 'INTERNAL_ERROR', 'Failed to update settings', 500);
  }
});

function getDefaultOperatingHours() {
  return {
    monday: { enabled: true, open: '09:00', close: '17:00' },
    tuesday: { enabled: true, open: '09:00', close: '17:00' },
    wednesday: { enabled: true, open: '09:00', close: '17:00' },
    thursday: { enabled: true, open: '09:00', close: '17:00' },
    friday: { enabled: true, open: '09:00', close: '17:00' },
    saturday: { enabled: false, open: '09:00', close: '17:00' },
    sunday: { enabled: false, open: '09:00', close: '17:00' },
  };
}

export default router;
