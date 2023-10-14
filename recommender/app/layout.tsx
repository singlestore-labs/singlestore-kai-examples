import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Single "Store"',
  description: "https://www.singlestore.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={/*inter.className + */ "font-sans p-8"}>{children}</body>
    </html>
  );
}
