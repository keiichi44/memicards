// server/email.config.ts
// Edit this file to change greeting email behaviour.
// Restart the server after saving changes.

export const emailConfig = {
  /** Resend template ID — copy from Resend Dashboard → Email Templates */
  templateId: "first-greet-template",

  /** Sender email address — must be a verified domain in Resend */
  fromEmail: "jovan@memicards.org",

  /** Minutes to wait after registration before sending the greeting email */
  delayMinutes: 10,
};
