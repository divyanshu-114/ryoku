import { ArrowRight, Code as CodeIcon, Cpu, Globe, MessageSquare, Zap, Shield, RefreshCcw, Terminal, Book, Server, Users, Mail, Clock, ExternalLink } from "lucide-react";
import CodeBlock from "@/components/Docs/CodeBlock";

export default function SDKDocsPage() {
  return (
    <div className="prose prose-slate max-w-none prose-headings:font-black prose-h1:text-5xl prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-pre:p-0 prose-pre:bg-transparent">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold uppercase tracking-widest mb-6">
          <Zap className="w-3 h-3" /> Latest: v2.0
        </div>
        <h1 className="text-gray-900 mb-4 tracking-tight">Chat SDK</h1>
        <p className="text-xl text-gray-500 leading-relaxed max-w-2xl">
          Build custom chat interfaces with intelligent agent handoff, live status awareness, and offline handling.
        </p>
      </div>

      <hr className="border-gray-100 my-12" />

      <h2 id="introduction">Introduction</h2>
      <p>
        The Ryoku Chat SDK lets you create fully custom chat experiences while handling the complexity of agent availability, real-time handoffs, and offline message capture.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-10">
        <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
          <Users className="w-5 h-5 text-[var(--accent)] mb-3" />
          <h4 className="text-sm font-bold text-gray-900 mb-1">Agent Status</h4>
          <p className="text-xs text-gray-500">Know if agents are online before offering live chat.</p>
        </div>
        <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
          <RefreshCcw className="w-5 h-5 text-[var(--accent)] mb-3" />
          <h4 className="text-sm font-bold text-gray-900 mb-1">Live Handoff</h4>
          <p className="text-xs text-gray-500">Real-time transfer to human agents.</p>
        </div>
        <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
          <Mail className="w-5 h-5 text-[var(--accent)] mb-3" />
          <h4 className="text-sm font-bold text-gray-900 mb-1">Offline Capture</h4>
          <p className="text-xs text-gray-500">Email leads when no agents are available.</p>
        </div>
      </div>

      <h2 id="installation">Installation</h2>
      <p>
        Import the SDK from your Ryoku instance.
      </p>
      <CodeBlock code={`import { RyokuChat } from "@/lib/sdk/public";`} />

      <h2 id="quickstart">Quick Start</h2>
      <p>
        Choose how you want to integrate - use our widget, embed our chat, or build fully custom.
      </p>

      <h3 id="widget">Option 1: Embed Widget</h3>
      <p>Add this script to your website:</p>
      <CodeBlock code={`&lt;script 
  src="https://your-domain.com/widget.js" 
  data-slug="your-business"
  data-position="bottom-right"
  data-theme="dark"
  data-color="#6366f1"
&gt;&lt;/script&gt;`} />

      <h3>Option 2: Embed Chat Page</h3>
      <p>Use an iframe to embed the chat interface:</p>
      <CodeBlock code={`&lt;iframe 
  src="https://your-domain.com/chat/your-business?embed=1"
  style="width: 400px; height: 600px; border: none;"
&gt;&lt;/iframe&gt;`} />

      <h3>Option 3: Custom UI (SDK)</h3>
      <CodeBlock code={`const ryoku = new RyokuChat({
  baseUrl: "https://your-ryoku-instance.com",
  pusherKey: "your-pusher-key",
  pusherCluster: "us2"
});

// Send a message
const session = ryoku.getSession("your-business");
await ryoku.chat({
  slug: "your-business",
  messages: [{ role: "user", content: "Hello!" }],
  onMessage: (delta) => updateUI(delta),
  onFinish: (full) => saveResponse(full)
});`} />

      <h2 id="agent-status">Agent Status</h2>
      <p>
        Check if live agents are available before showing the "Chat with agent" option.
      </p>
      <CodeBlock code={`const status = await ryoku.checkAgentStatus("your-business");

if (status.online) {
  // Show "Chat with agent" button
  console.log(\`\${status.onlineCount} agents available\`);
} else {
  // Show offline contact form
}

// List all agents
status.agents.forEach(agent => {
  console.log(\`\${agent.name}: \${agent.status}\`);
});`} />

      <div className="bg-emerald-50 border-l-4 border-emerald-500 p-5 my-6 rounded-r-xl">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-900 mb-1">Recommended Flow</p>
            <p className="text-sm text-emerald-800 opacity-80">
              Check agent status on page load, then show live chat or offline form accordingly.
            </p>
          </div>
        </div>
      </div>

      <h2 id="chat">Streaming Chat</h2>
      <p>
        The <code>chat()</code> method sends messages and streams responses token-by-token.
      </p>
      <CodeBlock code={`await ryoku.chat({
  slug: "your-business",
  messages: [
    { role: "user", content: "I need help with my order" }
  ],
  onMessage: (delta) => {
    // Called for each token
    appendToResponse(delta);
  },
  onError: (err) => {
    showError(err.message);
  },
  onFinish: (fullResponse) => {
    // Called when complete
    saveToHistory(fullResponse);
  }
});`} />

      <table className="w-full text-sm text-left border-collapse mt-6">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-3 font-bold text-gray-900">Param</th>
            <th className="py-3 font-bold text-gray-900">Type</th>
            <th className="py-3 font-bold text-gray-900">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">slug</td>
            <td className="py-3 text-gray-400">string</td>
            <td className="py-3 text-gray-600">Your business slug</td>
          </tr>
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">messages</td>
            <td className="py-3 text-gray-400">Message[]</td>
            <td className="py-3 text-gray-600">Conversation history</td>
          </tr>
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">onMessage</td>
            <td className="py-3 text-gray-400">function</td>
            <td className="py-3 text-gray-600">Token callback</td>
          </tr>
        </tbody>
      </table>

      <h2 id="escalate">Human Escalation</h2>
      <p>
        Request a live agent to take over the conversation.
      </p>
      <CodeBlock code={`await ryoku.escalate({
  slug: "your-business",
  conversationId: session.id,
  reason: "Customer requested human agent",
  email: "customer@example.com",
  phone: "+1234567890" // optional
});`} />

      <h2 id="offline">Offline Queries</h2>
      <p>
        Capture lead information when no agents are online.
      </p>
      <CodeBlock code={`await ryoku.sendOfflineQuery({
  slug: "your-business",
  name: "John Doe",
  email: "john@example.com",
  query: "Do you offer enterprise pricing?"
});`} />

      <h2 id="sessions">Session Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Get Session</p>
          <CodeBlock code={`const session = ryoku.getSession("slug");
console.log(session.id);`} />
        </div>
        <div className="p-4 rounded-xl border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Reset Session</p>
          <CodeBlock code={`ryoku.resetSession("slug");`} />
        </div>
      </div>

      <h2 id="subscriptions">Real-time Events</h2>
      <p>
        Subscribe to live agent handoffs and status changes.
      </p>
      <CodeBlock code={`// Listen for agent taking over
const unsub = ryoku.subscribe(session.id, "bot-handoff", (data) => {
  showToast("Agent joined!");
  setLiveChatMode(true);
});

// Listen for agent coming online
const unsubStatus = ryoku.subscribeToAgentStatus(businessId, (data) => {
  if (data.online) enableLiveChat();
});

// Cleanup
ryoku.destroy();`} />

      <h2 id="types">TypeScript Types</h2>
      <CodeBlock code={`interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

interface AgentStatus {
  online: boolean;
  onlineCount: number;
  agents: {
    id: string;
    name: string;
    avatar: string | null;
    status: "online" | "away" | "offline";
  }[];
}`} />

      <h2 id="endpoints">API Endpoints</h2>
      <p>If not using the SDK, you can call these endpoints directly:</p>

      <table className="w-full text-sm text-left border-collapse mt-4">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-3 font-bold text-gray-900">Endpoint</th>
            <th className="py-3 font-bold text-gray-900">Method</th>
            <th className="py-3 font-bold text-gray-900">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">/api/chat/[slug]</td>
            <td className="py-3 text-gray-400">POST</td>
            <td className="py-3 text-gray-600">Send chat message</td>
          </tr>
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">/api/agent/status</td>
            <td className="py-3 text-gray-400">GET</td>
            <td className="py-3 text-gray-600">Check agent availability</td>
          </tr>
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">/api/chat/escalate</td>
            <td className="py-3 text-gray-400">POST</td>
            <td className="py-3 text-gray-600">Request agent handoff</td>
          </tr>
          <tr>
            <td className="py-3 font-mono text-[var(--accent)]">/api/chat/offline-query</td>
            <td className="py-3 text-gray-400">POST</td>
            <td className="py-3 text-gray-600">Submit offline message</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-24 p-8 rounded-3xl bg-gray-900 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        <div>
          <h3 className="text-white text-2xl font-bold mb-2 tracking-tight">Build your own UI</h3>
          <p className="text-gray-400">Use the SDK to create fully custom chat experiences.</p>
        </div>
        <button className="bg-[var(--accent)] text-white px-8 py-4 rounded-xl font-bold hover:brightness-110 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--accent)]/20">
          Go to Dashboard
        </button>
      </div>

      <footer className="mt-20 py-10 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-widest">
        <span>© 2026 Ryoku AI</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
          <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}