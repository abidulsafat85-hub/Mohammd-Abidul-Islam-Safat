import { Router, Request, Response } from 'express';
import { WhatsAppAutomationService, PollVoteStatus } from './whatsappService';
import { requireAdmin } from './auth';

export const whatsappRouter = Router();
const service = WhatsAppAutomationService.getInstance();

// Security: All /api/whatsapp/* routes are admin-only, except external incoming webhook
whatsappRouter.use((req, res, next) => {
  if (req.path === '/webhook') {
    return next();
  }
  return requireAdmin(req, res, next);
});

// 1. Get today's poll state, stats, active members, logs
whatsappRouter.get('/poll/today', async (req: Request, res: Response) => {
  try {
    // Check incoming replies in background
    service.pollUltraMsgIncomingMessages().catch(() => {});
    const state = service.getState();
    res.json({ success: true, data: state });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Sync active members from frontend / database
whatsappRouter.post('/poll/sync-members', async (req: Request, res: Response) => {
  try {
    const { members } = req.body;
    if (Array.isArray(members)) {
      service.syncActiveMembers(members);
    }
    // Also trigger instant incoming check from UltraMsg
    await service.pollUltraMsgIncomingMessages().catch(() => {});
    res.json({ success: true, data: service.getState() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2.1 Manually or programmatically check new WhatsApp replies now
whatsappRouter.post('/poll/check-messages', async (req: Request, res: Response) => {
  try {
    const processed = await service.pollUltraMsgIncomingMessages();
    res.json({ success: true, processed, data: service.getState() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Trigger poll / Send poll to all members manually (Lunch or Dinner)
whatsappRouter.post('/poll/trigger', async (req: Request, res: Response) => {
  try {
    const { slot } = req.body;
    if (slot === 'lunch' || slot === 'dinner') {
      const result = await service.sendPollToAllMembers(slot, 'Admin Dashboard');
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: 'Invalid slot. Must be lunch or dinner.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/send-all', async (req: Request, res: Response) => {
  try {
    const { slot } = req.body;
    const targetSlot = slot === 'dinner' ? 'dinner' : 'lunch';
    const result = await service.sendPollToAllMembers(targetSlot, 'Admin Dashboard');
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/send-member', async (req: Request, res: Response) => {
  try {
    const { slot, memberId } = req.body;
    const targetSlot = slot === 'dinner' ? 'dinner' : 'lunch';
    const result = await service.sendPollToSingleMember(targetSlot, memberId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Auto-resolve pending to YES (11:00 AM or 05:00 PM)
whatsappRouter.post('/poll/auto-resolve', (req: Request, res: Response) => {
  try {
    const { slot } = req.body;
    if (slot === 'lunch') {
      const poll = service.autoResolvePendingLunch('Admin Dashboard Manual');
      res.json({ success: true, data: poll });
    } else if (slot === 'dinner') {
      const poll = service.autoResolvePendingDinner('Admin Dashboard Manual');
      res.json({ success: true, data: poll });
    } else {
      res.status(400).json({ success: false, error: 'Invalid slot' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Finalize count and dispatch to Cook/Shopkeeper (11:05 AM or 05:05 PM)
whatsappRouter.post('/poll/finalize', (req: Request, res: Response) => {
  try {
    const { slot } = req.body;
    if (slot === 'lunch') {
      const result = service.dispatchLunchToCook('Admin Dashboard Manual');
      res.json({ success: true, data: result });
    } else if (slot === 'dinner') {
      const result = service.dispatchDinnerToCook('Admin Dashboard Manual');
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: 'Invalid slot' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Admin Manual Override for Member Vote
whatsappRouter.post('/poll/vote', (req: Request, res: Response) => {
  try {
    const { slot, memberId, status } = req.body as {
      slot: 'lunch' | 'dinner';
      memberId: string;
      status: PollVoteStatus;
    };

    if (!slot || !memberId || !status) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const poll = service.setMemberVoteManual(slot, memberId, status);
    res.json({ success: true, data: poll });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6b. Tomorrow Advance Poll Routes (1 Day Advance Rule)
whatsappRouter.post('/poll/tomorrow/trigger', async (req: Request, res: Response) => {
  try {
    const result = await service.triggerTomorrowPoll('Admin Dashboard');
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/tomorrow/send-member', async (req: Request, res: Response) => {
  try {
    const { memberId } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'memberId is required' });
    }
    const result = await service.sendTomorrowPollToSingleMember(memberId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/tomorrow/choice', (req: Request, res: Response) => {
  try {
    const { memberId, choice } = req.body;
    if (!memberId || !choice) {
      return res.status(400).json({ success: false, error: 'memberId and choice are required' });
    }
    const poll = service.setTomorrowMemberChoice(memberId, choice);
    res.json({ success: true, data: poll });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/tomorrow/auto-resolve', (req: Request, res: Response) => {
  try {
    const poll = service.autoResolveTomorrowPending('Admin Dashboard');
    res.json({ success: true, data: poll });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/tomorrow/finalize', async (req: Request, res: Response) => {
  try {
    const result = await service.finalizeTomorrowAndDispatch('Admin Dashboard');
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6b. Reset poll to fresh SCHEDULED state (Clean all members to PENDING)
whatsappRouter.post('/poll/reset', (req: Request, res: Response) => {
  try {
    const slot = req.body?.slot || 'tomorrow';
    const poll = service.resetPoll(slot);
    res.json({ success: true, data: poll, state: service.getState() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/poll/tomorrow/reset', (req: Request, res: Response) => {
  try {
    const poll = service.resetPoll('tomorrow');
    res.json({ success: true, data: poll, state: service.getState() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Update settings (Cook phone, name, automation toggle)
whatsappRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const { cookPhone, cookName, isAutomationEnabled } = req.body;
    const updated = service.updateSettings(cookPhone, cookName, isAutomationEnabled);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7b. Update or get Message Templates & Schedule
whatsappRouter.get('/templates', (req: Request, res: Response) => {
  try {
    const state = service.getState();
    const templates = state.templates || service.getDefaultTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

whatsappRouter.post('/templates', (req: Request, res: Response) => {
  try {
    const { templates } = req.body;
    if (!templates) {
      return res.status(400).json({ success: false, error: 'Templates data required' });
    }
    const updated = service.updateTemplates(templates);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Incoming Webhook / WhatsApp Response Receiver
whatsappRouter.post('/webhook', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    let phone: string | undefined = body.phone || body.from || body.sender || body.contact;
    let message: string | undefined = body.message || body.text || body.body || body.content;
    const slot = body.slot; // optional explicit slot

    // 1. UltraMsg Webhook Format:
    // { event_type: "message_received", instanceId: "...", data: { id: "...", from: "8801874278012@c.us", to: "...", body: "১", ... } }
    if (body.data && typeof body.data === 'object') {
      if (body.data.from) phone = body.data.from;
      if (body.data.body) message = body.data.body;
    }

    // 2. Meta WhatsApp Cloud API Webhook Format:
    // { entry: [ { changes: [ { value: { messages: [ { from: "8801874278012", text: { body: "1" } } ] } } ] } ] }
    if (body.entry && Array.isArray(body.entry)) {
      try {
        const changes = body.entry[0]?.changes;
        const msgObj = changes?.[0]?.value?.messages?.[0];
        if (msgObj) {
          if (msgObj.from) phone = msgObj.from;
          if (msgObj.text?.body) message = msgObj.text.body;
          if (msgObj.button?.text) message = msgObj.button.text;
          if (msgObj.interactive?.button_reply?.title) message = msgObj.interactive.button_reply.title;
          if (msgObj.interactive?.button_reply?.id) message = msgObj.interactive.button_reply.id;
        }
      } catch (e) {
        // continue fallback
      }
    }

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message could not be detected from webhook payload',
        receivedBody: body,
      });
    }

    const result = service.handleIncomingVote(phone, message, slot);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. WhatsApp API Gateway Configuration
whatsappRouter.post('/gateway/config', (req: Request, res: Response) => {
  try {
    const { gateway } = req.body;
    const updated = service.updateGateway(gateway);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. WhatsApp Test Message
whatsappRouter.post('/gateway/test', async (req: Request, res: Response) => {
  try {
    const { testPhone, testMessage } = req.body;
    if (!testPhone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    const result = await service.testGateway(testPhone, testMessage);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
