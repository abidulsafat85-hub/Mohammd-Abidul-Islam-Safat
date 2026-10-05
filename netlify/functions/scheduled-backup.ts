import { runDailyBackupJob } from '../../server/scheduleConfig';

// Netlify Scheduled Function: runs daily at 17:59 UTC (11:59 PM Bangladesh Time)
export const handler = async () => {
  try {
    const result = await runDailyBackupJob();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Backup job executed', result }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
