import cron from 'node-cron';
import Newsletter from '../models/autoMailer.model.js';
import User from '../models/user.model.js';
import { sendBulkNewsletter } from './email.service.js';

export const startNewsletterScheduler = () => {

  console.log('📧 Newsletter scheduler started');

  cron.schedule('*/1 * * * *', async () => {

    try {
      const now = new Date();
      console.log('⏰ Cron tick at:', now.toISOString());

      const newsletters = await Newsletter.find({
        status: 'pending',
        scheduledFor: { $lte: now }
      });
      console.log(`📬 Found ${newsletters.length} newsletters due`);
      newsletters.forEach(n => {
        console.log(`  - "${n.subject}" scheduled for ${n.scheduledFor.toISOString()}`);
      });
      if (!newsletters.length) return;

      const users = await User.find(
        { isActive: true },
        'email'
      );

      const emails = users.map(
        user => user.email
      );

      for (const newsletter of newsletters) {

        try {

          await sendBulkNewsletter(
            emails,
            newsletter.subject,
            newsletter.content,
            newsletter.attachmentUrl,
            newsletter.attachmentType 
          );

          newsletter.status = 'sent';
          newsletter.sentAt = new Date();

          await newsletter.save();

          console.log(
            `✅ Newsletter sent: ${newsletter.subject}`
          );

        } catch (error) {

          console.error(
            `❌ Failed newsletter: ${newsletter.subject}`,
            error.message
          );
        }
      }

    } catch (error) {

      console.error(
        '❌ Newsletter scheduler error:',
        error.message
      );
    }

  });

};