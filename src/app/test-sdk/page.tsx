"use client";

import { useEffect, useState, useRef } from "react";
import { RyokuSDK } from "@/lib/sdk/public";

export default function TestSDKPage() {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [slug, setSlug] = useState("");
    const [status, setStatus] = useState("Idle");
    const [error, setError] = useState("");
    const sdkRef = useRef<RyokuSDK | null>(null);

    useEffect(() => {
        sdkRef.current = new RyokuSDK();
    }, []);

    const handleChat = async () => {
        if (!sdkRef.current || !slug.trim()) return;

        setStatus("Streaming...");
        setError("");

        const newMessages = [...messages, { role: "user", content: input }];
        setMessages(newMessages);
        setInput("");

        try {
            await sdkRef.current.chat({
                slug: slug.trim(),
                messages: newMessages as any,
                onMessage: (delta) => {
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === "assistant") {
                            return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
                        } else {
                            return [...prev, { role: "assistant", content: delta }];
                        }
                    });
                },
                onFinish: (full) => {
                    console.log("Chat Finished:", full);
                    setStatus("Done");
                },
                onError: (err) => {
                    setError(err.message);
                    setStatus("Error");
                }
            });
        } catch (err: any) {
            setError(err.message);
            setStatus("Error");
        }
    };

    const handleOffline = async () => {
        if (!sdkRef.current || !slug.trim()) return;

        setStatus("Sending Offline...");
        setError("");
        try {
            const res = await sdkRef.current.sendOfflineQuery({
                slug: slug.trim(),
                name: "SDK Tester",
                email: "test@example.com",
                query: "Testing SDK offline query"
            });
            if (res.success) setStatus("Offline Sent!");
        } catch (err: any) {
            setError(err.message);
            setStatus("Error");
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Ryoku SDK Test Page</h1>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Business Slug</label>
                <input
                    className="w-full border p-2 rounded"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="your-business-slug"
                />
            </div>

            <div className="mb-4 p-4 bg-gray-100 rounded">
                <p><strong>Status:</strong> {status}</p>
                {error && <p className="text-red-500"><strong>Error:</strong> {error}</p>}
            </div>

            <div className="space-y-4 mb-6">
                {messages.map((m, i) => (
                    <div key={i} className={`p-3 rounded ${m.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <strong>{m.role}:</strong> {m.content}
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input 
                    className="flex-1 border p-2 rounded"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                />
                <button 
                    onClick={handleChat}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Chat
                </button>
            </div>

            <button 
                onClick={handleOffline}
                className="mt-4 bg-gray-600 text-white px-4 py-2 rounded w-full"
            >
                Test Offline Query
            </button>
        </div>
    );
}
