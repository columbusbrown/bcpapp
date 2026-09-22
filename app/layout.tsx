import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BCP - Bowl Confidence Pool",
  description: "The 20th Annual BCP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
