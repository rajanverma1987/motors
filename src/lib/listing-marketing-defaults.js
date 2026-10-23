const UNSUB_FOOTER = `<hr style="margin: 1.5em 0; border: none; border-top: 1px solid #e2e8f0;" />
<p style="margin: 0; font-size: 12px; color: #94a3b8;">Don&apos;t want to receive these emails? <a href="{{unsubscribe_url}}" style="color: #64748b;">Unsubscribe</a>.</p>`;

const WRAP_START = `<div style="font-family: sans-serif; max-width: 560px; line-height: 1.5;">`;
const WRAP_END = `</div>`;

function wrap(inner) {
  return `${WRAP_START}${inner}<p style="margin: 1.5em 0 0 0; font-size: 13px; color: #64748b;">IQMotorBase.com</p>${UNSUB_FOOTER}${WRAP_END}`;
}

const CTA = `<p style="margin: 1.25em 0;">
<a href="https://iqmotorbase.com/list-your-electric-motor-services" style="display: inline-block; padding: 10px 18px; background: #9a5d33; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">List your shop</a>
</p>`;

export const DEFAULT_LISTING_MARKETING_TEMPLATES = {
  initial: {
    key: "initial",
    name: "Initial",
    subject: "List your motor repair shop on IQMotorBase.com",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">We&apos;d like to invite <strong>{{companyName}}</strong> to list on <strong>IQMotorBase.com</strong> so customers in your area can find you.</p>
<ul style="margin: 1em 0; padding-left: 1.25em;">
<li>Listing is <strong>free</strong></li>
<li>Add your services and get more leads</li>
<li>Manage your presence in one place</li>
</ul>
${CTA}`),
  },
  followup1: {
    key: "followup1",
    name: "Follow-up 1",
    subject: "Quick follow-up: list your motor repair shop",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">Just following up on our note about listing <strong>{{companyName}}</strong> on <strong>IQMotorBase.com</strong>.</p>
<p style="margin: 0 0 1em 0;">If you have a moment, you can add your shop here. It is free and only takes a few minutes.</p>
${CTA}`),
  },
  followup2: {
    key: "followup2",
    name: "Follow-up 2",
    subject: "Still interested in listing on IQMotorBase?",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">Checking in once more about a free directory listing for <strong>{{companyName}}</strong> on IQMotorBase.com.</p>
<p style="margin: 0 0 1em 0;">Industrial buyers search for motor repair near them. A complete profile helps them find you.</p>
${CTA}`),
  },
  followup3: {
    key: "followup3",
    name: "Follow-up 3",
    subject: "Last note: free listing for {{companyName}}",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">This is our last follow-up about listing <strong>{{companyName}}</strong> on IQMotorBase.com.</p>
<p style="margin: 0 0 1em 0;">If timing is better later, you can still use the link below whenever you are ready. We will not keep emailing after this.</p>
${CTA}`),
  },
  restart: {
    key: "restart",
    name: "Restart / win-back",
    subject: "Reconnecting: list {{companyName}} on IQMotorBase",
    bodyHtml: wrap(`
<p style="margin: 0 0 1em 0;">Hi{{#name}} {{name}}{{/name}},</p>
<p style="margin: 0 0 1em 0;">We are reaching out again about a free listing for <strong>{{companyName}}</strong> on IQMotorBase.com.</p>
<p style="margin: 0 0 1em 0;">If you would like to be findable by industrial buyers searching for motor repair, you can claim your listing here.</p>
${CTA}`),
  },
};
