import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Skill-Bridge | AI Career Navigator",
  description: "AI-powered career gap analysis with interactive roadmaps, mock interviews, and intelligent agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-olive text-cream min-h-screen antialiased`}>
        {/* Ambient background */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          {/* Top-right ember radial */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-ember/5 rounded-full blur-[200px] -translate-y-1/2 translate-x-1/3" />
          {/* Bottom-left olive glow */}
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cream/3 rounded-full blur-[150px] translate-y-1/3 -translate-x-1/4" />
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
        </div>
        {children}
      </body>
    </html>
  );
}
