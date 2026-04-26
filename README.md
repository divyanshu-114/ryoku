# Ryoku

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-c5f74f)](https://orm.drizzle.team/)

Ryoku is an AI customer-support operating system for small and growing businesses. It lets a business create a branded support bot, ingest knowledge-base content, answer customers through an embeddable chat widget, hand off conversations to agents, and review analytics from a dashboard.

The project is a Next.js App Router application with Auth.js, Neon Postgres, Drizzle ORM, Upstash Redis rate limiting, Pusher realtime events, Groq chat models, Google embeddings, and Resend email.

Live demo: https://ryoku-iota.vercel.app

## Why Ryoku Is Useful

- **Fast business onboarding**: create a business profile, pick an industry, configure support policies, and generate starter FAQs.
- **RAG-backed support**: upload or ingest documents and website content, embed them, and use them as support context.
- **Embeddable chat widget**: add a single script tag to any website and point it at a business slug.
- **Human handoff workflow**: customers can escalate to real agents, while agents get a queue and conversation context.
- **Realtime collaboration**: Pusher powers live chat updates, typing events, handoffs, and agent status.
- **Analytics and exports**: track chat volume, escalation rate, automation rate, knowledge gaps, and export conversation data.
- **API access**: generate API keys and call a versioned chat endpoint for external integrations.
- **Production deployment path**: Vercel config, cron scheduling, auth proxy protection, and environment templates are included.

## Tech Stack

| Area | Tools |
| --- | --- |
| App framework | Next.js 16, React 19, TypeScript |
| Styling and UI | Tailwind CSS 4, Framer Motion, lucide-react |
| Auth | Auth.js / NextAuth v5 beta, Google OAuth |
| Database | Neon Postgres, Drizzle ORM, pgvector |
| AI | Vercel AI SDK, Groq chat models, Google embedding models |
| Realtime | Pusher Channels |
| Cache and rate limiting | Upstash Redis |
| Email | Resend |
| Deployment | Vercel |

## Project Structure

```text
src/app/                 Next.js App Router pages and API routes
src/app/api/             Chat, auth, analytics, ingest, widget, agent, and key APIs
src/components/          Shared client components
src/lib/                 Auth, AI, database, realtime, billing, tools, and utilities
src/lib/db/schema.ts     Drizzle schema for users, businesses, documents, chats, agents
public/widget.js         Embeddable website chat widget
drizzle/                 Generated SQL migrations and metadata
scripts/                 Database migration and seed helpers
src/proxy.ts             Dashboard auth gate for Next.js proxy/middleware
```

## Prerequisites

- Node.js 20 or newer
- npm
- A PostgreSQL database with the `pgvector` extension available
- Google OAuth client credentials
- Upstash Redis REST URL and token
- Groq API key
- Google AI API keys for embeddings
- Pusher Channels app credentials
- Resend API key for contact and digest emails

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/Trishix/ryoku.git
cd ryoku
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in the required variables:

```env
# Neon Postgres
DATABASE_URL=postgresql://user:password@host.neon.tech/ryoku?sslmode=require

# Auth.js
AUTH_URL=http://localhost:3000
AUTH_SECRET=generate-with-openssl-rand-base64-32
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-client-secret

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Groq chat models
GROQ_API_KEY=your-groq-api-key

# Google AI embeddings
FREE_API_KEY_1=your-google-ai-key-1
FREE_API_KEY_2=your-google-ai-key-2
FREE_API_KEY_3=your-google-ai-key-3

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Pusher realtime
PUSHER_APP_ID=your-pusher-app-id
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_CLUSTER=us2

# Resend email
RESEND_API_KEY=re_your-resend-api-key
RESEND_EMAIL=ryoku@resend.dev
SUPPORT_EMAIL=support@example.com

# Vercel cron protection
CRON_SECRET=generate-a-random-secret
```

Push the database schema:

```bash
npx drizzle-kit push
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`, sign in with Google, and complete the dashboard onboarding flow.

## Google OAuth Setup

In Google Cloud Console, create an OAuth 2.0 client and add these redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://your-production-domain.com/api/auth/callback/google
```

For production, set:

```env
AUTH_URL=https://your-production-domain.com
# Some environments also use NEXTAUTH_URL; this app will fall back to it if AUTH_URL is missing.
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
AUTH_TRUST_HOST=true
```

If Google reports `redirect_uri_mismatch`, the redirect URI in Google Cloud does not match the `AUTH_URL` used by the deployed app.

## Common Commands

```bash
npm run dev       # Start local development
npm run build     # Build production bundle with webpack
npm run start     # Start the production server
npm run lint      # Run ESLint
npx drizzle-kit push  # Apply schema changes to the database
```

## Using the Chat Widget

After creating a business in the dashboard, copy its slug and embed `public/widget.js` from your deployed app:

```html
<script
  src="https://your-production-domain.com/widget.js"
  data-slug="your-business-slug"
  data-position="bottom-right"
  data-theme="dark"
  data-color="#6366f1">
</script>
```

The widget loads `/chat/{slug}?embed=1` in an iframe and uses `/api/widget/{slug}` for public widget configuration.

## Calling the Chat API

Generate an API key from the dashboard, then call the versioned chat endpoint:

```bash
curl -X POST "https://your-production-domain.com/api/v1/chat/your-business-slug" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer rk_live_your_key" \
  -d '{
    "messages": [
      { "role": "user", "content": "What is your return policy?" }
    ]
  }'
```

The browser chat UI uses `/api/chat/{slug}`. External integrations should prefer `/api/v1/chat/{slug}`.

## Deployment

The repository includes `vercel.json` with:

- Production deployment: https://ryoku-iota.vercel.app


- `npm install --include=dev`
- `npm run build`
- a weekly `/api/digest` cron schedule

Before deploying, configure all required environment variables in Vercel. At minimum, production needs:

- `DATABASE_URL`
- `AUTH_URL`
- `AUTH_SECRET`
- `AUTH_TRUST_HOST`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GROQ_API_KEY`
- `FREE_API_KEY_1`
- `NEXT_PUBLIC_APP_URL`
- `PUSHER_APP_ID`
- `NEXT_PUBLIC_PUSHER_KEY`
- `PUSHER_SECRET`
- `NEXT_PUBLIC_PUSHER_CLUSTER`
- `RESEND_API_KEY`
- `SUPPORT_EMAIL`
- `CRON_SECRET`

Run these checks before pushing a deployment:

```bash
npm run lint
npm run build
```

## Database Notes

The schema lives in `src/lib/db/schema.ts`. Core tables include:

- Auth tables: `users`, `accounts`, `sessions`, `verification_tokens`
- Business setup: `businesses`, `documents`, `api_keys`, `widget_configs`
- Chat: `conversations`, `messages`
- Operations: `analytics_events`, `knowledge_gaps`, `agents`, `canned_responses`, `push_subscriptions`

Document embeddings use a `vector(3072)` column, so the target Postgres database must support pgvector.

## Support

For help with setup or bugs:

- Check this README first, especially the environment and OAuth sections.
- Review the relevant route or module under `src/app/api/` and `src/lib/`.
- Open an issue in the GitHub repository with reproduction steps, expected behavior, actual behavior, and relevant logs.

Avoid posting real API keys, OAuth secrets, database URLs, or customer data in issues.

## Maintainers and Contributing

Ryoku is maintained by the repository owner at `Trishix/ryoku`.

Contribution flow:

1. Create a branch from `main`.
2. Keep changes focused and small enough to review.
3. Run `npm run lint` and `npm run build`.
4. Open a pull request with a clear summary, screenshots for UI changes, and notes about any schema or environment changes.

There is not yet a separate `CONTRIBUTING.md` or `LICENSE` file in this repository. Add those before accepting broad external contributions or publishing this as an open-source package.
