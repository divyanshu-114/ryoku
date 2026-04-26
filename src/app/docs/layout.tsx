import Link from "next/link";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = [
    {
      title: "Getting Started",
      links: [
        { href: "/docs/sdk", label: "Introduction" },
        { href: "/docs/sdk#installation", label: "Installation" },
        { href: "/docs/sdk#quickstart", label: "Quick Start" },
      ],
    },
    {
      title: "API Reference",
      links: [
        { href: "/docs/sdk#chat", label: "ryoku.chat()" },
        { href: "/docs/sdk#escalate", label: "ryoku.escalate()" },
        { href: "/docs/sdk#offline", label: "ryoku.sendOfflineQuery()" },
        { href: "/docs/sdk#sessions", label: "Session Management" },
        { href: "/docs/sdk#subscriptions", label: "Real-time Subscriptions" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto flex flex-col md:flex-row px-4 sm:px-8 py-8 md:py-24 gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="sticky top-28 space-y-8">
            {sections.map((section) => (
              <div key={section.title}>
                <h5 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
                  {section.title}
                </h5>
                <ul className="space-y-2 border-l border-gray-100">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block border-l border-transparent pl-4 text-sm text-gray-500 hover:border-[var(--accent)] hover:text-gray-900 transition-all duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-4xl min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
