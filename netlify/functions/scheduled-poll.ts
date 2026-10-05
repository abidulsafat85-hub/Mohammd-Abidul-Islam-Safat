import { runScheduledJob, SCHEDULE_CONFIG } from '../../server/scheduleConfig';
import { WhatsAppAutomationService } from '../../server/whatsappService';

// Netlify Scheduled Function: runs daily at 14:00 UTC (8:00 PM Bangladesh Time)
export const handler = async () => {
  try {
    const result = await runScheduledJob(SCHEDULE_CONFIG.advancePoll.name, async () => {
      const service = WhatsAppAutomationService.getInstance();
      await service.triggerTomorrowPoll('Netlify Scheduled Job');
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Advance poll job executed', result }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
