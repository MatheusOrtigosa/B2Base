import type { Metadata } from 'next';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './globals.css';
export const metadata: Metadata = { title: 'B2Base — Vendas com direção', description: 'CRM B2B com qualificação de oportunidades e próximos passos.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
