import "../src/app/globals.css";
export const metadata = { title: "AI秘書", description: "Slack task assistant" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
