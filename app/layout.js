import './globals.css';

export const metadata = {
  title: 'Korvo RH',
  description: 'Sistema simples de gestão de pagamentos — controle interno sem burocracia.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
