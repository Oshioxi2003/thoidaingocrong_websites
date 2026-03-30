import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Layout({ children, isDark, onToggleTheme }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Navbar isDark={isDark} onToggleTheme={onToggleTheme} />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}
