# Environment Variables for Cloudflare Pages

To make the contact form work, you need to set up the following environment variables in your Cloudflare Pages dashboard:

## Required Environment Variables

### SendGrid Configuration
- `SENDGRID_API_KEY` - Your SendGrid API key
  - Get this from: https://app.sendgrid.com/settings/api_keys
  - Should start with 'SG.'

### Email Configuration
- `CHEF_EMAIL` - The email address where contact form submissions will be sent
  - Example: "hello@allochef.com"
  - This is where you'll receive new booking inquiries

- `FROM_EMAIL` - The email address that sends the notifications
  - Example: "noreply@allochef.com" 
  - Must be a verified sender domain in SendGrid

## How to Set Environment Variables in Cloudflare Pages

1. Go to your Cloudflare Pages dashboard
2. Select your Allô Chef project
3. Go to Settings > Environment variables
4. Add the following variables for both Production and Preview environments:

```
SENDGRID_API_KEY = SG.your_sendgrid_api_key_here
CHEF_EMAIL = hello@allochef.com
FROM_EMAIL = noreply@allochef.com
```

## SendGrid Setup Steps

1. **Create SendGrid Account**
   - Sign up at https://sendgrid.com
   - Verify your account

2. **Domain Authentication (Recommended)**
   - Go to Settings > Sender Authentication
   - Authenticate your domain (allochef.com)
   - This improves email deliverability

3. **Create API Key**
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Choose "Restricted Access"
   - Grant "Mail Send" permissions
   - Copy the API key (starts with 'SG.')

4. **Test the Setup**
   - Deploy your site to Cloudflare Pages
   - Test the contact form
   - Check that emails are received and auto-replies are sent

## Email Templates

The contact form sends two emails:

1. **Notification to Chef** - Contains all form details for new bookings
2. **Auto-reply to Customer** - Confirms receipt and sets expectations

Both emails are HTML formatted and branded for Allô Chef.

## Troubleshooting

- Check Cloudflare Pages Functions logs for any errors
- Verify SendGrid API key has correct permissions
- Ensure FROM_EMAIL is verified in SendGrid
- Test with a simple email first before going live

## Security Notes

- Never commit API keys to version control
- Use environment variables for all sensitive data
- The contact form includes CORS headers for security
- Input validation prevents malicious submissions
