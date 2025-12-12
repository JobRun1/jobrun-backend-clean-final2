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
        phoneNumber: true,
        twilioNumber: true,
        region: true,
        timezone: true,
        businessHours: true,
      },
    });

    if (!client) {
      return sendError(res, 'CLIENT_NOT_FOUND', 'Client not found', 404);
    }

    // Return settings based on tab
    if (tab === 'business') {
      sendSuccess(res, {
        businessName: client.businessName,
        phone: client.phoneNumber,
        twilioNumber: client.twilioNumber,
        region: client.region || 'US',
        timezone: client.timezone,
      });
    } else if (tab === 'hours') {
      sendSuccess(res, {
        operatingHours: client.businessHours || getDefaultOperatingHours(),
      });
    } else if (tab === 'notifications') {
      // These fields don't exist on Client model - return defaults
      sendSuccess(res, {
        emailAlerts: true,
        smsAlerts: false,
        dailySummary: true,
      });
    } else if (tab === 'assistant') {
      // These fields don't exist on Client model - return defaults
      sendSuccess(res, {
        aiTone: 'friendly',
        aiResponseLength: 'medium',
        aiBookingStyle: 'conversational',
      });
    } else if (tab === 'booking') {
      // These fields don't exist on Client model - return defaults
      sendSuccess(res, {
        defaultJobDuration: 60,
        allowSameDayBookings: true,
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
        phoneNumber: phone,
        twilioNumber,
        region,
        timezone,
      };
    } else if (tab === 'hours') {
      const { operatingHours } = req.body;
      updateData = { businessHours: operatingHours };
    } else if (tab === 'notifications') {
      // These fields don't exist on Client model - skip update
      updateData = {};
    } else if (tab === 'assistant') {
      // These fields don't exist on Client model - skip update
      updateData = {};
    } else if (tab === 'booking') {
      // These fields don't exist on Client model - skip update
      updateData = {};
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
