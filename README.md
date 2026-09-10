# ReachInbox Email Scheduler

A full-stack email scheduling system built for the ReachInbox Software Development Intern assignment.

The application allows users to authenticate with Google, configure email senders, create campaigns with CSV recipients, schedule emails, process them asynchronously using BullMQ workers, enforce rate limits and minimum delays, and search email history using Elasticsearch.

## Live Application

**Frontend:**  
https://reachinbox-email-scheduler-khaki-seven.vercel.app/

**Backend API:**  
https://reachinbox-email-scheduler-production-dc91.up.railway.app/

## Architecture Overview

```text
                         ┌──────────────────────┐
                         │      Frontend        │
                         │   Next.js + React    │
                         │      Tailwind        │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP / REST
                                    ▼
                         ┌──────────────────────┐
                         │     Express API      │
                         │     TypeScript       │
                         └──────┬───────┬───────┘
                                │       │
                   ┌────────────┘       └─────────────┐
                   ▼                                  ▼
          ┌─────────────────┐                ┌─────────────────┐
          │   PostgreSQL    │                │      Redis      │
          │                 │                │                 │
          │ Users           │                │ BullMQ Queue    │
          │ Senders         │                │ Rate Limiting   │
          │ Campaigns       │                │ OAuth State     │
          │ Emails          │                │                 │
          │ Slack           │                └────────┬────────┘
          └─────────────────┘                         │
                                                      │
                                                      ▼
                                           ┌────────────────────┐
                                           │   BullMQ Worker    │
                                           │                    │
                                           │ Configurable       │
                                           │ Concurrency        │
                                           └─────────┬──────────┘
                                                     │
                                                     ▼
                                           ┌────────────────────┐
                                           │   Ethereal SMTP    │
                                           │   Email Delivery   │
                                           └────────────────────┘

                         ┌──────────────────────┐
                         │    Elasticsearch     │
                         │ Email Search/Indexing │
                         └──────────────────────┘

                         ┌──────────────────────┐
                         │        Slack         │
                         │ Rate-limit Alerts    │
                         └──────────────────────┘
```

## Project Structure

```text
reachinbox-email-scheduler/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── workers/
│   │   └── server.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── package.json
│   └── .env.local
│
└── README.md
```

# Backend Setup

## Requirements

- Node.js 18+
- npm
- PostgreSQL
- Redis
- Git

Backend technologies:

- TypeScript
- Express.js
- PostgreSQL
- Redis
- BullMQ
- Nodemailer
- Elasticsearch
- Google OAuth
- Slack OAuth

## 1. Clone Repository

```bash
git clone https://github.com/koderanish/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
```

## 2. Install Backend Dependencies

```bash
cd backend
npm install
```

# PostgreSQL Setup

Create the database:

```sql
CREATE DATABASE reachinbox;
```

The initial migration is located at:

```text
backend/src/database/migrations/001_initial_schema.sql
```

Run the migration:

```bash
psql reachinbox < src/database/migrations/001_initial_schema.sql
```

The database contains:

- `users`
- `senders`
- `campaigns`
- `emails`
- `slack_connections`

# Redis Setup

Redis is used for:

- BullMQ queues
- Delayed jobs
- Distributed rate limiting
- Minimum send delay
- Slack OAuth state
- Rate-limit notification deduplication

Start Redis locally:

```bash
redis-server
```

Verify the connection:

```bash
redis-cli ping
```

Expected output:

```text
PONG
```

# Ethereal Email Setup

Ethereal Email provides a safe SMTP environment for testing email delivery.

Create an Ethereal account and obtain:

- SMTP host
- SMTP port
- SMTP username
- SMTP password

Typical configuration:

```text
Host: smtp.ethereal.email
Port: 587
```

Do not commit SMTP credentials to GitHub.

# Backend Environment Variables

Create:

```text
backend/.env
```

Example:

```env
PORT=5001

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/reachinbox

REDIS_URL=redis://localhost:6379

FRONTEND_URL=http://localhost:3000

JWT_SECRET=your-long-random-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=your-elasticsearch-api-key

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-ethereal-email
SMTP_PASSWORD=your-ethereal-password

SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:5001/api/slack/oauth/callback

WORKER_CONCURRENCY=5
```

Use the exact environment variable names expected by the backend configuration.

Never commit `.env` files.

Recommended `.gitignore` entries:

```gitignore
.env
.env.local
```

# Run Backend API

From the `backend` directory:

```bash
npm run dev
```

The API runs on:

```text
http://localhost:5001
```

Health check:

```text
GET /
```

# Run BullMQ Worker

The API server and email worker run independently.

Build the backend:

```bash
npm run build
```

Start the worker:

```bash
node dist/workers/email.worker.js
```

Expected output:

```text
Email worker started with concurrency 5
Redis connected
```

# Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create:

```text
frontend/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

Start the frontend:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

# Google OAuth Setup

The application uses Google OAuth for authentication.

Configure a Google OAuth Web Client and add these frontend origins:

```text
http://localhost:3000
```

For production:

```text
https://reachinbox-email-scheduler-khaki-seven.vercel.app
```

The frontend sends the Google authentication credential to:

```text
POST /api/auth/google
```

The backend validates the credential and creates or retrieves the application user.

# How Scheduling Works

The scheduling flow is:

```text
User
 │
 │ Create campaign
 ▼
Express API
 │
 ├── Validate request
 ├── Store campaign in PostgreSQL
 └── Store individual emails
       │
       ▼
  BullMQ / Redis
       │
       │ delayed job
       ▼
 Scheduled time reached
       │
       ▼
 BullMQ Worker
       │
       ├── Check email status
       ├── Apply rate limit
       ├── Apply minimum delay
       ├── Claim email atomically
       │
       ▼
    SMTP Send
       │
       ▼
   PostgreSQL
       │
       └── status = sent
```

Each scheduled email is represented as an individual BullMQ job.

The email ID is used as the job ID to help prevent duplicate jobs.

# Persistence on Restart

Scheduled emails are persisted in PostgreSQL instead of existing only in memory.

When a campaign is scheduled:

1. Campaign information is stored in PostgreSQL.
2. Individual email records are stored with their scheduled time.
3. BullMQ delayed jobs are created in Redis.
4. If the worker/server restarts, scheduled database records remain available.
5. During startup, the scheduler reconciles scheduled database records with BullMQ.
6. Missing delayed jobs are recreated.
7. The worker processes them when their scheduled time arrives.

Therefore, restarting the application does not cause future scheduled emails to disappear.

PostgreSQL acts as the persistent source of truth, while Redis/BullMQ handles asynchronous execution.

# Duplicate Send Protection

The worker checks the email status before processing.

Typical lifecycle:

```text
scheduled
    ↓
sending
    ↓
sent
```

If an email has already been sent, the worker skips it.

The worker also claims an email before SMTP delivery so multiple workers do not intentionally process the same email simultaneously.

# Rate Limiting

The system supports a configurable hourly sending limit.

Example:

```text
Hourly limit = 100 emails
```

Redis maintains a distributed hourly counter.

Conceptually:

```text
rate:hourly:{senderId}:{hourBucket}
```

The rate-limit operation is performed atomically using Redis scripting.

This makes the limit safe when multiple worker instances process emails concurrently.

When the hourly limit is reached, the email is not dropped. The job is delayed until the next available sending window.

# Minimum Delay Between Emails

Each sender can have a configurable minimum delay.

Example:

```text
Minimum delay = 2 seconds
```

The worker stores the last-send timing in Redis and checks it before allowing another email to be sent.

This prevents emails from being sent faster than the configured sender delay.

# What Happens When the Hourly Limit Is Reached?

```text
Current hour limit reached
          ↓
Calculate next available hour
          ↓
Move BullMQ job to delayed state
          ↓
Process during next available window
```

Emails are not permanently failed or dropped because of the hourly limit.

The system can also send a Slack notification when a sender reaches its hourly limit.

# Worker Concurrency

BullMQ worker concurrency is configurable through an environment variable.

Example:

```env
WORKER_CONCURRENCY=5
```

Conceptually:

```text
                 BullMQ
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     Worker 1   Worker 2   Worker 3
        │          │          │
        └──────────┼──────────┘
                   ▼
              Redis limits
                   │
                   ▼
              SMTP sending
```

Concurrency increases throughput while Redis-backed rate limiting and email claiming protect shared sender limits.

# Elasticsearch

Scheduled and sent email information is indexed into Elasticsearch.

Indexed fields include:

```text
email_id
user_id
campaign_id
recipient_email
recipient_name
subject
body
status
scheduled_at
sent_at
```

Elasticsearch provides efficient search functionality.

PostgreSQL remains the persistent source of truth.

# Slack Integration

Slack OAuth is supported for sender notifications.

Flow:

```text
User
 │
 ▼
Slack OAuth
 │
 ▼
Slack authorization
 │
 ▼
OAuth callback
 │
 ▼
Persist connection
 │
 ▼
Hourly limit reached
 │
 ▼
Slack notification
```

Slack OAuth state is stored temporarily in Redis.

The worker safely handles the case where Slack is not connected.

# Features Implemented

## Backend

### Authentication

- Google OAuth authentication
- JWT-based authentication
- Protected API routes
- Authentication middleware
- User persistence

### Scheduler

- Campaign creation
- Individual email scheduling
- Delayed BullMQ jobs
- Worker-based asynchronous sending
- Startup reconciliation
- Restart-safe scheduled jobs

### Persistence

- PostgreSQL database
- Persistent users
- Persistent senders
- Persistent campaigns
- Persistent emails
- Persistent Slack connections
- Future scheduled emails survive restart

### Email Sending

- Ethereal SMTP
- Multiple sender support
- Configurable SMTP credentials
- Email status tracking
- Sent timestamps
- SMTP error handling

### Rate Limiting

- Configurable hourly limit
- Redis-backed counters
- Atomic Redis rate-limit logic
- Per-sender rate limiting
- Automatic rescheduling after limit
- Slack notification when limit is reached

### Delay Control

- Configurable minimum delay
- Redis-backed last-send tracking
- Delay enforcement across workers

### Concurrency

- BullMQ worker concurrency
- Configurable through environment variables
- Safe concurrent processing
- Shared Redis rate limiting

### Search

- Elasticsearch integration
- Email indexing
- Email status updates
- Searchable email records

### Slack

- Real Slack OAuth
- Persistent Slack connection
- Rate-limit notifications
- Redis OAuth state
- Safe handling when Slack is disconnected

## Frontend

### Authentication

- Google Login
- Authenticated dashboard
- Logout

### Dashboard

- Scheduled emails
- Sent emails
- Email status
- Recipient information
- Campaign information
- Loading states
- Empty states
- Error states

### Compose

- Sender selection
- Recipient input
- Multiple recipients
- CSV upload
- CSV email parsing
- Email validation
- Duplicate recipient prevention
- Subject
- Email body
- Scheduling
- Minimum delay configuration
- Hourly limit configuration

### CSV

Supported format:

```csv
email,name
john@example.com,John
jane@example.com,Jane
```

The frontend validates email addresses and skips invalid entries.

### UI

- Responsive interface
- Tailwind CSS
- Email composer
- Scheduled/Sent views
- Loading states
- Error states
- Empty states

# Example Workflow

```text
1. Login with Google
        ↓
2. Open Dashboard
        ↓
3. Open Compose
        ↓
4. Select Ethereal sender
        ↓
5. Upload CSV
        ↓
6. Enter subject/body
        ↓
7. Configure delay + hourly limit
        ↓
8. Select future start time
        ↓
9. Schedule campaign
        ↓
10. Email appears in Scheduled
        ↓
11. BullMQ delayed job waits
        ↓
12. Worker processes job
        ↓
13. Redis rate limit is checked
        ↓
14. SMTP email is sent
        ↓
15. Database updated to Sent
        ↓
16. Email indexed in Elasticsearch
        ↓
17. Email appears in Sent
```

# Production Deployment

The application is deployed using:

```text
Frontend       → Vercel
Backend API    → Railway
PostgreSQL     → Railway
Redis          → Railway
Elasticsearch  → Elastic Cloud
Email Delivery → Ethereal SMTP
Worker         → Separate Railway worker service
```

Production architecture:

```text
                 Vercel
                   │
                   ▼
              Next.js App
                   │
                   ▼
                Railway
                   │
          ┌────────┴────────┐
          ▼                 ▼
     Express API       BullMQ Worker
          │                 │
          ▼                 ▼
      PostgreSQL          Redis

          └────────┬────────┘
                   │
                   ▼
             Ethereal SMTP

                   │
                   ▼
            Elasticsearch

                   │
                   ▼
                 Slack
```

# Useful Commands

## Backend

```bash
cd backend
npm install
npm run dev
```

Build:

```bash
npm run build
```

Start production API:

```bash
npm start
```

Start worker:

```bash
node dist/workers/email.worker.js
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Production start:

```bash
npm start
```

# Assignment Requirement Mapping

| Requirement | Implementation |
|---|---|
| TypeScript Backend | TypeScript + Express |
| PostgreSQL/MySQL | PostgreSQL |
| Redis | Redis |
| BullMQ | BullMQ delayed jobs |
| Email Scheduler | Campaign + individual email scheduling |
| Persistence | PostgreSQL + startup reconciliation |
| Restart Safety | Scheduled emails restored after restart |
| SMTP | Ethereal Email |
| Multiple Senders | Sender table + per-sender configuration |
| Rate Limiting | Redis atomic hourly limiter |
| Minimum Delay | Redis-based delay enforcement |
| Concurrency | Configurable BullMQ worker concurrency |
| Elasticsearch | Email indexing and search |
| Slack | Slack OAuth + rate-limit notifications |
| Google OAuth | Google Identity Services |
| Frontend | Next.js + React + TypeScript |
| Dashboard | Scheduled + Sent emails |
| CSV | CSV recipient parsing |
| Error States | Frontend/API error handling |
| Loading States | Frontend loading states |
| Empty States | Dashboard/Compose empty states |

# Demo Video

The demo covers:

1. Google authentication
2. Dashboard
3. Creating a scheduled email
4. CSV recipient upload
5. Sender selection
6. Delay and hourly limit configuration
7. Scheduled email appearing in the dashboard
8. BullMQ worker processing
9. Email delivery through Ethereal
10. Sent email appearing in the dashboard
11. Server/worker restart
12. Future scheduled email surviving restart
13. Rate limiting and delay behavior

# Security Notes

Environment variables containing secrets must never be committed to GitHub.

Sensitive values include:

```text
DATABASE_URL
JWT_SECRET
GOOGLE_CLIENT_SECRET
SMTP_PASSWORD
ELASTICSEARCH_API_KEY
SLACK_CLIENT_SECRET
```

Use environment variables for local development and production.

# Author

**Anish Kumar**

GitHub:

https://github.com/koderanish/reachinbox-email-scheduler
