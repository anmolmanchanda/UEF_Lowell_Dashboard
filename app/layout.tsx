import type { Metadata } from "next";
import { Archivo, Space_Grotesk } from "next/font/google";

import "./globals.css";
import Shell from "@/components/Shell";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "Lowell Urban Transformation Dashboard",
  description: "Internal intelligence system for Lowell's urban transformation."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${space.variable}`}>
      <body>
        <div className="app-shell">
          <Shell>{children}</Shell>
        </div>
      </body>
    </html>
  );
}
