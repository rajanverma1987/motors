const UNSUB_FOOTER = `<hr style="margin: 1.5em 0; border: none; border-top: 1px solid #e2e8f0;" />
<p style="margin: 0; font-size: 12px; color: #94a3b8;">Don&apos;t want to receive these emails? <a href="{{unsubscribe_url}}" style="color: #64748b;">Unsubscribe</a>.</p>`;

const WRAP_START = `<div style="font-family: sans-serif; max-width: 560px; line-height: 1.5;">`;
const WRAP_END = `</div>`;

function wrap(inner) {
  return `${WRAP_START}${inner}<p style="margin: 1.5em 0 0 0; font-size: 13px; color: #64748b;">3PhaseFlow.com</p>${UNSUB_FOOTER}${WRAP_END}`;
}

const CTA = `<p style="margin: 1.25em 0;">
<a href="https://3phaseflow.com/list-your-electric-motor-services" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">List your shop</a>
</p>`;

export const DEFAULT_LISTING_MARKETING_TEMPLATES = {
  initial: {
    key: "initial",
    name: "Initial",
    subject: "A short demo for {{companyName}}",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">You already know how to fix the motor. The pain is everything around it. The same job written on a clipboard, typed again for the quote, and the office still not sure where it is on the floor.</p>
<p style="margin: 0 0 1em 0;">I recorded a short demo for <strong>{{companyName}}</strong>. It shows one job number from the quote to the invoice, the shop floor and the office on the same board, and leads that do not die in email.</p>
<p style="margin: 0 0 1em 0;">Watch it. When the video ends, book a time. We will walk through the software on your own kind of work, screen by screen.</p>
<p style="margin: 1.25em 0;">
<a href="{{watch_url}}" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Watch the demo</a>
</p>
<p style="margin: 0 0 1em 0;">The link is only for your shop. It is not a public page.</p>`),
  },
  followup1: {
    key: "followup1",
    name: "Follow-up 1",
    subject: "Quick follow-up: list your motor repair shop",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">Just following up on our note about listing <strong>{{companyName}}</strong> on <strong>3PhaseFlow.com</strong>.</p>
<p style="margin: 0 0 1em 0;">If you have a moment, you can add your shop here. It is free and only takes a few minutes.</p>
${CTA}`),
  },
  followup2: {
    key: "followup2",
    name: "Follow-up 2",
    subject: "Still interested in listing on 3PhaseFlow?",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">Checking in once more about a free directory listing for <strong>{{companyName}}</strong> on 3PhaseFlow.com.</p>
<p style="margin: 0 0 1em 0;">Industrial buyers search for motor repair near them. A complete profile helps them find you.</p>
${CTA}`),
  },
  followup3: {
    key: "followup3",
    name: "Follow-up 3",
    subject: "Last note: free listing for {{companyName}}",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">This is our last follow-up about listing <strong>{{companyName}}</strong> on 3PhaseFlow.com.</p>
<p style="margin: 0 0 1em 0;">If timing is better later, you can still use the link below whenever you are ready. We will not keep emailing after this.</p>
${CTA}`),
  },
  restart: {
    key: "restart",
    name: "Restart / win-back",
    subject: "Watch a short demo for {{companyName}}",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">One note for <strong>{{companyName}}</strong>. Instead of another long email, here is a short demo of how a motor shop runs the job, the floor, and the invoice in one place.</p>
<p style="margin: 0 0 1em 0;">Watch it. When the video ends, book a time and we will walk through the software for your shop.</p>
<p style="margin: 1.25em 0;">
<a href="{{watch_url}}" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Watch the demo</a>
</p>
<p style="margin: 0 0 1em 0;">The link is only for your shop.</p>`),
  },
  demo: {
    key: "demo",
    name: "Demo video",
    subject: "A short demo of 3PhaseFlow for {{companyName}}",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">You already know how to fix the motor. The hard part is the paperwork around it. We made a short demo of 3PhaseFlow for <strong>{{companyName}}</strong>.</p>
<p style="margin: 0 0 1em 0;">Watch it. When it ends, you can book a time and we will walk you through the software for your shop.</p>
<p style="margin: 1.25em 0;">
<a href="{{watch_url}}" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">Watch the demo</a>
</p>`),
  },
};
