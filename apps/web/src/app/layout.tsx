import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cadimac 3D editor",
  description: "Browser-based Cadimac editor workspace",
  icons: {
    icon: "assets/cadimac/cadimac-logo.png",
    apple: "assets/cadimac/cadimac-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
