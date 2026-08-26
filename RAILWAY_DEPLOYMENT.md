# Help Desk Ticket System - Railway Deployment Guide

This guide explains how to deploy the Help Desk Ticket System to Railway.

## Prerequisites

1. A Railway account
2. Railway CLI installed (optional but recommended)
3. Git repository pushed to a remote (GitHub, GitLab, etc.)

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. Push your code to a Git repository
2. In Railway dashboard, click "New Project"
3. Select "Deploy from Repo"
4. Choose your help-desk-ticket-system repository
5. Railway will auto-detect the Dockerfile and build your application
6. Set the required environment variables (see below)
7. Click "Deploy"

### Option 2: Deploy via Railway CLI

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Set environment variables: `railway variables set KEY=VALUE`
5. Deploy: `railway up`

## Required Environment Variables

Set these in your Railway project settings:

### Core Variables
- `DATABASE_URL` - PostgreSQL connection string (Railway provides this automatically when you add a PostgreSQL plugin)
- `AUTH_SECRET` - A long random secret for authentication (generate with: `openssl rand -hex 32`)
- `BETTER_AUTH_URL` - Your Railway app URL (e.g., `https://your-app.up.railway.app`)
- `PORT` - Will be set automatically by Railway (usually 3000 or 8080)

### Admin Credentials (Optional but Recommended)
- `ADMIN_EMAIL` - Admin email address
- `ADMIN_PASSWORD` - Admin password

### Email Configuration (For Email Features)
- `RESEND_API_KEY` - Get from https://resend.com/api-keys
- `EMAIL_FROM` - Default sender email (optional, defaults to "Help Desk <onboarding@resend.dev>")
- `EMAIL_IMAP_HOST` - IMAP host for incoming email (e.g., imap.gmail.com)
- `EMAIL_IMAP_PORT` - IMAP port (usually 993)
- `EMAIL_IMAP_USER` - IMAP username
- `EMAIL_IMAP_PASS` - IMAP password (use App Password for Gmail)
- `EMAIL_IMAP_TLS` - Set to `true` (optional)
- `EMAIL_IMAP_AUTH_TIMEOUT` - Auth timeout in ms (optional, defaults to 5000)
- `EMAIL_POLL_INTERVAL` - Polling interval in ms (optional, defaults to 300000)

### Resend Webhook (For Email Delivery Tracking)
- `RESEND_WEBHOOK_SECRET` - Create this in Resend dashboard under Webhooks

### External Webhook Security
- `WEBHOOK_SECRET` - Secret for verifying incoming webhooks

### Sentry Error Monitoring (Optional)
- `SENTRY_DSN` - Your Sentry DSN
- `SENTRY_ENVIRONMENT` - Set to "production"

## Railway-Specific Notes

1. **Database**: Add the PostgreSQL plugin from Railway's marketplace to get a managed PostgreSQL database. The DATABASE_URL will be provided automatically.

2. **Port**: Railway automatically sets the PORT environment variable. The server reads from `process.env.PORT` with a fallback to 3001.

3. **Health Check**: The health check endpoint is `/api/test` which returns `{ message: "Test endpoint working" }`

4. **Build Process**: Railway will use the Dockerfile to build and run the application.

5. **Environment Variables**: Make sure to set all required variables in the Railway dashboard before deploying.

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: 
   - Ensure you've added the PostgreSQL plugin
   - Check that DATABASE_URL is correctly set

2. **Authentication Issues**:
   - Verify AUTH_SECRET is set and is sufficiently long
   - Check BETTER_AUTH_URL matches your Railway domain

3. **Email Not Working**:
   - Verify RESEND_API_KEY is valid
   - Check IMAP credentials if using incoming email
   - Ensure firewall allows outbound connections to email services

4. **Application Crashes on Start**:
   - Check Railway logs for specific error messages
   - Ensure all required environment variables are set

## Local Development vs Production

The application is designed to work the same in both environments with environment-specific configuration:

- Environment variables control behavior
- Database configuration switches automatically
- Sentry reporting is enabled when DSN is provided
- Rate limiting adjusts based on NODE_ENV

## Maintenance

1. **Updates**: Simply push changes to your repository and redeploy
2. **Scaling**: Adjust in Railway dashboard based on usage
3. **Backups**: PostgreSQL plugin includes automated backups (check your Railway plan)
4. **Logs**: View logs in Railway dashboard or via CLI with `railway logs`

## Security Considerations

1. Never commit `.env` files with real secrets to git
2. Use Railway's built-in environment variable storage for secrets
3. Regularly rotate AUTH_SECRET and other secrets
4. Keep dependencies updated with `bun update`
5. Monitor Sentry for errors if enabled

## Support

For issues with Railway deployment:
- Check Railway documentation: https://docs.railway.app
- Review Railway logs for error details
- Ensure all required services (PostgreSQL) are properly linked