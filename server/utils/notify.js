import Notification from '../models/Notification.js';

/**
 * Send an in-app notification to a user.
 * Safe helper: logs errors silently without breaking main transaction flow.
 */
export const sendNotification = async ({
  institution,
  recipient_id,
  recipient_role,
  title,
  message,
  type = 'general',
  link = '',
}) => {
  try {
    if (!recipient_id || !title || !message) return null;
    return await Notification.create({
      institution,
      recipient_id,
      recipient_role,
      title,
      message,
      type,
      link,
    });
  } catch (error) {
    console.error('Notification creation failed:', error.message);
    return null;
  }
};
