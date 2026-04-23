# Ryoku 🌌: The Intelligent Customer Support OS

**Ryoku** is a production-grade, Agentic AI platform designed for modern businesses. It combines state-of-the-art AI automation with a high-performance human-in-the-loop workflow, enabling businesses to provide 24/7 support without sacrificing the human touch.

![Ryoku Banner](https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=2070&auto=format&fit=crop)

## 🚀 Vision
In an era where customer expectations are higher than ever, Ryoku serves as the "Operating System" for customer communication. We believe AI shouldn't just replace humans, but empower them by handling 80% of routine tasks while ensuring the remaining 20% are handled by agents with full context and zero friction.

---

## 🔥 Comprehensive Feature Set

### 🤖 1. Agentic AI & RAG Engine
*   **Vector-Powered Intelligence**: Uses `pgvector` and OpenAI/Gemini embeddings to search through billions of data points in milliseconds.
*   **Context-Aware Responses**: AI doesn't just "chat"—it references your specific business documents, manuals, and FAQs.
*   **Automatic FAQ Generation**: Scans your knowledge base and automatically generates helpful FAQ modules for your customers.
*   **Web Ingestion (Scraping)**: Input a URL, and Ryoku will crawl and ingest the content into your AI's brain instantly.

### 🎧 2. Professional Agent Command Center
*   **Unified Inbox**: Manage AI-driven and human-assigned conversations in a single, high-speed interface.
*   **One-Click Takeover**: Seamlessly transition from AI to Human. The agent sees the entire AI interaction history, ensuring no customer has to repeat themselves.
*   **Real-time Collaboration**: Powered by Pusher, agents get instant notifications for new handoffs and real-time typing indicators.
*   **Canned Responses (Shortcuts)**: Build a library of pre-written replies accessible via `/` commands to maximize response speed.
*   **Sentiment Monitoring**: Real-time sentiment analysis helps agents prioritize frustrated customers.

### 📊 3. Analytics & Business Intelligence
*   **Performance Metrics**: Track First Response Time (FRT), AI Automation Rate, and CSAT (Customer Satisfaction) scores.
*   **Daily/Weekly Digests**: Automated summaries of business performance sent directly to stakeholders.
*   **Customer Data Export**: Export contact lists (names, emails, and phone numbers) for targeted marketing or deep-dive CRM reporting.

### 🔌 4. Deployment & Integration
*   **Embeddable Widget**: A sleek, customizable chat widget that can be installed on any website with a simple `<script>` tag.
*   **Custom Branding**: Customize accent colors, welcome messages, and bot names to match your brand identity.
*   **Multi-Platform Support**: Optimized for desktop browsers and mobile devices.

---

## 🛠 Technical Architecture

Ryoku is built with a cutting-edge stack for performance, reliability, and scale:

### Frontend
*   **Next.js 15+ (App Router)**: Utilizing Server Components and modern routing.
*   **Framer Motion**: Smooth, glassmorphic UI transitions and micro-animations.
*   **Tailwind CSS**: Utility-first styling for a clean, responsive design.

### Backend & AI
*   **Vercel AI SDK**: Robust orchestration for LLM calls and tool-calling.
*   **Neon Postgres**: Serverless Postgres for high-availability data storage.
*   **Drizzle ORM**: Type-safe database interactions with high performance.
*   **Pusher**: Low-latency WebSocket signaling for real-time messaging.

### Database Schema Highlights
*   **Conversations**: Tracks status (AI, Active, Resolved), assigned agents, and metadata.
*   **Messages**: Stores role (user, assistant, agent), content, and sentiment scores.
*   **Knowledge Base**: Stores chunks of text and their corresponding vector embeddings.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 20+
*   PostgreSQL with `pgvector` extension (Neon recommended)
*   Pusher account (Channels)
*   OpenAI or Google Gemini API Key

### Detailed Installation

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/your-repo/ryoku.git
    cd ryoku
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env` and fill in:
    ```env
    # Database
    DATABASE_URL=postgresql://...

    # Auth (NextAuth)
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET=...

    # Real-time (Pusher)
    NEXT_PUBLIC_PUSHER_KEY=...
    PUSHER_SECRET=...
    PUSHER_APP_ID=...
    NEXT_PUBLIC_PUSHER_CLUSTER=...

    # AI (OpenAI/Gemini)
    OPENAI_API_KEY=...
    GOOGLE_GENERATIVE_AI_API_KEY=...
    ```

3.  **Database Migration**:
    ```bash
    npx drizzle-kit push
    ```

4.  **Launch**:
    ```bash
    npm run dev
    ```

---

## 🛡 Security & Compliance
*   **Input Sanitization**: Advanced prompt-guard to prevent injection attacks.
*   **Role-Based Access**: Strict separation between business owners, agents, and customers.
*   **Data Privacy**: All communications are encrypted in transit and at rest.

---

Developed with a focus on **Efficiency**, **Experience**, and **Intelligence**. Join the future of customer support with **Ryoku**.
