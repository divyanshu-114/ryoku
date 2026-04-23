/**
 * web-tools.ts
 *
 * Shared utilities for live web access in Ryoku chatbot tools.
 * 100% free — no API key required.
 *
 *  - searchWeb()  : web search via DuckDuckGo's free JSON API (no key)
 *  - fetchPage()  : direct URL fetch → clean plain text
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Max characters of page content to pass to the LLM. */
const MAX_PAGE_CHARS = 4_000;

/** Max characters per search result snippet. */
const MAX_SNIPPET_CHARS = 500;

// ── Types ─────────────────────────────────────────────────────────────────────

export type SearchResult = {
    title: string;
    url: string;
    snippet: string;
};

export type WebSearchOutput =
    | { results: SearchResult[]; answer?: string }
    | { error: string };

export type FetchPageOutput =
    | { title: string; url: string; content: string; wordCount: number }
    | { error: string };

// ── Web Search via DuckDuckGo (free, no API key) ──────────────────────────────

/**
 * Search the web using DuckDuckGo's free JSON API.
 * Returns an instant answer (if available) plus related result snippets.
 * No API key required.
 */
export async function searchWeb(query: string): Promise<WebSearchOutput> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8_000);

        const url = new URL("https://api.duckduckgo.com/");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("no_redirect", "1");
        url.searchParams.set("no_html", "1");
        url.searchParams.set("skip_disambig", "1");

        const res = await fetch(url.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "Ryoku-Bot/1.0 (customer service AI; +https://ryoku.app)",
                "Accept": "application/json",
            },
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            return { error: `Search returned status ${res.status}.` };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json()) as any;

        // Build results from RelatedTopics (the richest free data DuckDuckGo provides)
        const results: SearchResult[] = [];

        // Top instant answer
        if (data.AbstractText) {
            results.push({
                title: data.Heading ?? query,
                url: data.AbstractURL ?? "",
                snippet: String(data.AbstractText).slice(0, MAX_SNIPPET_CHARS),
            });
        }

        // Related topics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const topics: any[] = data.RelatedTopics ?? [];
        for (const topic of topics) {
            if (results.length >= 6) break;

            if (topic.Text && topic.FirstURL) {
                results.push({
                    title: String(topic.Text).slice(0, 80),
                    url: String(topic.FirstURL),
                    snippet: String(topic.Text).slice(0, MAX_SNIPPET_CHARS),
                });
            } else if (topic.Topics) {
                // Nested topic group
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                for (const sub of topic.Topics as any[]) {
                    if (results.length >= 6) break;
                    if (sub.Text && sub.FirstURL) {
                        results.push({
                            title: String(sub.Text).slice(0, 80),
                            url: String(sub.FirstURL),
                            snippet: String(sub.Text).slice(0, MAX_SNIPPET_CHARS),
                        });
                    }
                }
            }
        }

        const answer = data.Answer ? String(data.Answer).slice(0, 500) : undefined;

        if (results.length === 0 && !answer) {
            return { error: "No results found. Try rephrasing the question." };
        }

        return { results, answer };
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            return { error: "Web search timed out." };
        }
        console.error("[WebSearch] Error:", err);
        return { error: "Web search failed." };
    }
}

// ── Direct URL Fetch (free, no API key) ───────────────────────────────────────

/**
 * Fetch a specific URL and return clean plain text.
 * Strips scripts, styles, nav, header, footer, and all HTML tags.
 * Includes SSRF protection against private/internal IPs.
 */
export async function fetchPage(url: string): Promise<FetchPageOutput> {
    let parsed: URL;
    try {
        parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
        return { error: "Invalid URL." };
    }

    // Block private IP ranges and localhost (SSRF protection)
    const hostname = parsed.hostname.toLowerCase();
    if (
        hostname === "localhost" ||
        /^127\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^10\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        /^169\.254\./.test(hostname) ||
        hostname.endsWith(".local") ||
        hostname === "0.0.0.0"
    ) {
        return { error: "Cannot fetch private or internal URLs." };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);

        const res = await fetch(parsed.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "Ryoku-Bot/1.0 (customer service AI; +https://ryoku.app)",
                "Accept": "text/html,application/xhtml+xml,text/plain",
            },
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            return { error: `Could not fetch page (HTTP ${res.status}).` };
        }

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/html")) {
            const html = await res.text();

            const clean = html
                .replace(/<script[\s\S]*?<\/script>/gi, " ")
                .replace(/<style[\s\S]*?<\/style>/gi, " ")
                .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
                .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
                .replace(/<header[\s\S]*?<\/header>/gi, " ")
                .replace(/<!--[\s\S]*?-->/g, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\s{2,}/g, " ")
                .trim();

            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;
            const content = clean.slice(0, MAX_PAGE_CHARS);

            return { title, url: parsed.toString(), content, wordCount: content.split(/\s+/).length };
        } else if (contentType.includes("text/plain")) {
            const text = (await res.text()).slice(0, MAX_PAGE_CHARS);
            return { title: parsed.hostname, url: parsed.toString(), content: text, wordCount: text.split(/\s+/).length };
        } else {
            return { error: `Unsupported content type: ${contentType}` };
        }
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            return { error: "Page fetch timed out." };
        }
        console.error("[FetchPage] Error:", err);
        return { error: "Failed to fetch page." };
    }
}
