import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PROYECTOS RC | Plataforma Estilo Apple & Notion',
  description: 'Aplicación web minimalista, elegante y fluida para la gestión integral de múltiples proyectos, balance neto de finanzas, tareas Kanban y documentos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
