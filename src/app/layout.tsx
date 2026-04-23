import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Ryoku — Create Chatbots for Your Business at one Click",
  description:
    "Create AI-powered customer service chatbots in minutes. Handle returns, orders, exchanges, and live agent escalation. Built for businesses of every size.",
  keywords: [
    "AI chatbot",
    "customer service",
    "business automation",
    "AI agent",
    "customer support",
  ],
  openGraph: {
    title: "Ryoku — Create Chatbots for Your Business at one Click",
    description: "Create AI-powered customer service chatbots in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth snap-y snap-mandatory">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
