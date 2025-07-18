export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const formData = await request.formData();
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const email = formData.get('email');
    const phone = formData.get('phone') || 'Not provided';
    const message = formData.get('message');

    if (!firstName || !lastName || !email || !message) {
      return new Response(
        JSON.stringify({ error: 'Please fill in all required fields.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const SENDGRID_API_KEY = env.SENDGRID_API_KEY;
    const CHEF_EMAIL = env.CHEF_EMAIL;
    const FROM_EMAIL = env.FROM_EMAIL;

    if (!SENDGRID_API_KEY || !CHEF_EMAIL || !FROM_EMAIL) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error. Please try again later.' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const chefEmailData = {
      personalizations: [
        {
          to: [{ email: CHEF_EMAIL }],
          subject: `New Contact Form Submission from ${firstName} ${lastName}`,
        },
      ],
      from: { email: FROM_EMAIL, name: 'Allô Chef Website' },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${firstName} ${lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 5px;">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
          `,
        },
      ],
      reply_to: { email: email, name: `${firstName} ${lastName}` },
    };

    const customerEmailData = {
      personalizations: [
        {
          to: [{ email: email, name: `${firstName} ${lastName}` }],
          subject: 'Thank you for contacting Allô Chef!',
        },
      ],
      from: { email: FROM_EMAIL, name: 'Chef David - Allô Chef' },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">Thank You for Contacting Allô Chef!</h2>
              <p>Hello ${firstName},</p>
              <p>Thank you for your interest in our batch cooking service! I'll respond within 24 hours.</p>
              <p style="font-style: italic; color: #2563eb;">À bientôt !</p>
              <p>Chef David Barbier</p>
            </div>
          `,
        },
      ],
    };

    const chefResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chefEmailData),
    });

    if (!chefResponse.ok) {
      console.error('Failed to send chef email:', await chefResponse.text());
      throw new Error('Failed to send notification email');
    }

    const customerResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerEmailData),
    });

    if (!customerResponse.ok) {
      console.error('Failed to send customer email:', await customerResponse.text());
    }

    return new Response(
      JSON.stringify({
        message: 'Thank you for your message! I\'ll get back to you within 24 hours.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({
        error: 'Sorry, there was an error sending your message. Please try again.',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
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