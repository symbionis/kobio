/**
 * Build the Slack Incoming Webhook payload for a piece of voice feedback. Pure
 * and side-effect-free so it's unit-testable; the route owns the actual POST and
 * the user lookup.
 */

export interface FeedbackMeta {
  /** Sender's full name (from the users table), null when signed out. */
  name: string | null;
  /** Session e-mail, null when signed out. */
  email: string | null;
  /** Page the user was on (window.location.pathname), null if absent. */
  page: string | null;
}

export interface SlackMessage {
  /** Fallback / notification text. */
  text: string;
  blocks: unknown[];
}

/** "Name <email>", or just one, or "Anonyme" when neither is known. */
function senderLabel(meta: FeedbackMeta): string {
  const name = meta.name?.trim();
  const email = meta.email?.trim();
  if (name && email) return `${name} <${email}>`;
  if (name) return name;
  if (email) return email;
  return "Anonyme";
}

export function buildSlackMessage(transcript: string, meta: FeedbackMeta): SlackMessage {
  const sender = senderLabel(meta);
  const page = meta.page?.trim();
  const context = page ? `De : ${sender} · ${page}` : `De : ${sender}`;
  return {
    text: `Retour Kobio — ${sender}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `💬 *Retour Kobio*\n${transcript}` },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: context }],
      },
    ],
  };
}
