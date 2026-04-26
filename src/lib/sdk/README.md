# Ryoku Chat SDK v2.0

Headless SDK for building custom chat interfaces with Ryoku's AI agent capabilities.

## Features

- **Agent availability check** - Know if live agents are online
- **Streaming chat** - Real-time token-by-token responses
- **Human escalation** - Request live agent handoff
- **Offline queries** - Email capture when agents offline
- **Real-time subscriptions** - Live handoff & message events

## Installation

```typescript
import { RyokuChat } from "@/lib/sdk/public";
```

## Quick Start

```typescript
const ryoku = new RyokuChat({
  baseUrl: "https://your-ryoku-instance.com",
  pusherKey: "your-pusher-key",
  pusherCluster: "us2",
});
```

## API

### Check Agent Status

```typescript
const status = await ryoku.checkAgentStatus("your-business-slug");

if (!status.online) {
  // Show offline contact form
}

// status.onlineCount - number of online agents
```

### Send a Message

```typescript
const session = ryoku.getSession("your-business-slug");

await ryoku.chat({
  slug: "your-business-slug",
  messages: [
    { role: "user", content: "Hello, I need help" }
  ],
  onMessage: (delta) => {
    // Stream each token
    setMessages(prev => prev + delta);
  },
  onFinish: (full) => {
    // Complete response
  }
});
```

### Escalate to Human

```typescript
await ryoku.escalate({
  slug: "your-business-slug",
  conversationId: session.id,
  reason: "Customer requested agent",
  email: "customer@example.com"
});
```

### Offline Query

```typescript
await ryoku.sendOfflineQuery({
  slug: "your-business-slug",
  name: "John Doe",
  email: "john@example.com",
  query: "Question about pricing"
});
```

### Real-time Subscriptions

```typescript
// Listen for agent handoff
const unsub = ryoku.subscribe(session.id, "bot-handoff", (data) => {
  console.log("Agent took over!");
  // Switch to live chat UI
});

// Listen for agent status changes
const unsubStatus = ryoku.subscribeToAgentStatus(businessId, (data) => {
  if (data.online) {
    // Enable "Chat with agent" button
  }
});

// Cleanup
ryoku.destroy();
```

## Session Management

```typescript
// Get current session (auto-created)
const session = ryoku.getSession("slug");

// Reset for new conversation
ryoku.resetSession("slug");
```

## Full Example

```typescript
import { RyokuChat } from "@/lib/sdk/public";

const ryoku = new RyokuChat({
  pusherKey: "xxx",
  pusherCluster: "us2"
});

async function handleUserMessage(content: string) {
  // Check agent availability first
  const status = await ryoku.checkAgentStatus("my-business");
  
  const session = ryoku.getSession("my-business");
  
  // Add user message to UI
  addMessage({ role: "user", content });
  
  // Stream AI response
  await ryoku.chat({
    slug: "my-business",
    messages: [...messages, { role: "user", content }],
    onMessage: (delta) => {
      updateAssistantMessage(delta);
    }
  });
  
  // If user requests agent and agents are online
  if (shouldEscalate && status.online) {
    await ryoku.escalate({
      slug: "my-business",
      conversationId: session.id,
      email: userEmail
    });
  }
}
```