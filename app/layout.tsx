import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'B2Base — Vendas com direção', description: 'CRM B2B com qualificação de oportunidades e próximos passos.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
