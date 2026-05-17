// server/email.config.ts
// Edit this file to change greeting email behaviour.
// Restart the server after saving changes.

export const emailConfig = {
  /** Resend template ID or alias — either "tmpl_xxxxxxxxxxxx" or a human-readable alias like "first-greet-template" */
  templateId: "your-template-alias-or-id",

  /** Sender email address — must be a verified domain in Resend */
  fromEmail: "hello@yourdomain.com",

  /** Minutes to wait after registration before sending the greeting email */
  delayMinutes: 10,
};
