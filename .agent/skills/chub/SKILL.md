---
name: chub — Context Hub API Docs
description: Use the chub CLI to fetch curated, versioned API documentation before writing code that calls an external library or API.
---

# When to Use

Before writing code that uses an external library (Next.js, OpenAI, Pusher, Drizzle, Neon, etc.):
1. Search for the library: `chub search "<library name>"`
2. If found, fetch the doc before writing code: `chub get <id> --lang js`
3. Write code based on the fetched doc — not from memory

# Commands

```bash
# Full path (if 'chub' not in PATH)
/Users/trishitswarnakar/.npm-global/bin/chub search "<library>"
/Users/trishitswarnakar/.npm-global/bin/chub get <id> --lang js
/Users/trishitswarnakar/.npm-global/bin/chub annotate <id> "<note>"
/Users/trishitswarnakar/.npm-global/bin/chub feedback <id> up
```

# Known Available Docs (Ryoku-relevant)

| ID | Description |
|----|-------------|
| `next/next` | Next.js 16 App Router — routes, env vars, server components |
| `openai/chat` | OpenAI Chat Completions + Responses API, streaming, tools |
| `eslint/eslint-config-next` | ESLint flat config for Next.js |
| `clerk/auth` | Auth patterns (reference if switching from Auth.js) |

# Annotations Made

- None yet — add with `chub annotate <id> "<note>"` when you discover library-specific gotchas.
