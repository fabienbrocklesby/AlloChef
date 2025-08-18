export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const respond = (status, payload) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });

  try {
    if (request.method !== 'POST') {
      return respond(405, { success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      return respond(400, { success: false, code: 'BAD_FORM_DATA', message: 'Invalid form submission.' });
    }

    const raw = (name) => {
      const v = formData.get(name);
      return (typeof v === 'string') ? v.trim() : '';
    };

    const firstName = raw('firstName');
    const lastName  = raw('lastName');
    const email     = raw('email');
    const phone     = raw('phone') || 'Not provided';
    const message   = raw('message');

    // Validation rules
    if (!firstName || !lastName || !email || !message) {
      return respond(400, { success: false, code: 'MISSING_FIELDS', message: 'Please fill in all required fields.' });
    }
    if (firstName.length > 60 || lastName.length > 60) {
      return respond(400, { success: false, code: 'NAME_TOO_LONG', message: 'Names must be 60 characters or less.' });
    }
    if (message.length < 10) {
      return respond(400, { success: false, code: 'MESSAGE_TOO_SHORT', message: 'Message must be at least 10 characters.' });
    }
    if (message.length > 4000) {
      return respond(400, { success: false, code: 'MESSAGE_TOO_LONG', message: 'Message exceeds 4000 characters.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return respond(400, { success: false, code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    }

    const { SENDGRID_API_KEY, CHEF_EMAIL, FROM_EMAIL } = env;
    if (!SENDGRID_API_KEY || !CHEF_EMAIL || !FROM_EMAIL) {
      console.error('Config error - missing env', { hasKey: !!SENDGRID_API_KEY, hasChef: !!CHEF_EMAIL, hasFrom: !!FROM_EMAIL });
      return respond(500, { success: false, code: 'SERVER_MISCONFIGURED', message: 'Email service not configured.' });
    }

    // Basic HTML escaping for user supplied fields (very light weight)
    const esc = (s) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const safeMessage = esc(message).replace(/\n/g, '<br>');

    const chefEmailData = {
      personalizations: [
        {
          to: [{ email: CHEF_EMAIL }],
          subject: `New Contact Form: ${firstName} ${lastName}`.slice(0, 78),
        },
      ],
      from: { email: FROM_EMAIL, name: 'Allô Chef Website' },
      reply_to: { email, name: `${firstName} ${lastName}` },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
              <h2 style="color:#2563eb; margin-top:0;">New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${esc(firstName)} ${esc(lastName)}</p>
              <p><strong>Email:</strong> ${esc(email)}</p>
              <p><strong>Phone:</strong> ${esc(phone)}</p>
              <p><strong>Message:</strong></p>
              <div style="background:#f3f4f6; padding:15px; border-radius:5px; line-height:1.5;">${safeMessage}</div>
              <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />
              <p style="font-size:12px; color:#6b7280;">Sent automatically from the Allô Chef website.</p>
            </div>`
        }
      ]
    };

    const customerEmailData = {
      personalizations: [
        {
          to: [{ email, name: `${firstName} ${lastName}` }],
          subject: 'Thank you for contacting Allô Chef!',
        },
      ],
      from: { email: FROM_EMAIL, name: 'Chef David - Allô Chef' },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
              <h2 style="color:#2563eb; margin-top:0;">Thank You for Your Message!</h2>
              <p>Hello ${esc(firstName)},</p>
              <p>Thank you for reaching out. I've received your message and will respond within 24 hours (usually sooner).</p>
              <p style="margin-top:20px; font-style:italic; color:#2563eb;">À bientôt !</p>
              <p>Chef David Barbier<br/>Allô Chef</p>
              <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />
              <p style="font-size:12px; color:#6b7280;">If you did not submit this request, you can ignore this email.</p>
            </div>`
        }
      ]
    };

    async function sendEmail(payload, label) {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        console.error(`SendGrid ${label} email failed`, resp.status, text);
        return { ok: false, status: resp.status, body: text };
      }
      return { ok: true };
    }

    const chefResult = await sendEmail(chefEmailData, 'chef');
    if (!chefResult.ok) {
      return respond(502, { success: false, code: 'CHEF_EMAIL_FAIL', message: 'Unable to send notification email right now.' });
    }

    // Customer email is non-critical – failure shouldn't block success response.
    const customerResult = await sendEmail(customerEmailData, 'customer');
    if (!customerResult.ok) {
      // Include a soft warning (no sensitive internal details)
      return respond(200, { success: true, code: 'PARTIAL_SUCCESS', message: 'Message received. Reply email failed to send, but your enquiry was delivered.' });
    }

    return respond(200, { success: true, code: 'OK', message: "Thank you for your message! I'll get back to you within 24 hours." });

  } catch (err) {
    console.error('Unhandled contact form error:', err);
    return respond(500, { success: false, code: 'UNEXPECTED_ERROR', message: 'Unexpected server error. Please try again shortly.' });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}