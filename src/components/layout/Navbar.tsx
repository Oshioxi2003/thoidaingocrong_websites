import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Moon, Sun, User, LogOut, ChevronDown, FileText, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';

const navLinks = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Hướng dẫn', to: '/guides' },
  { label: 'Tải game', to: '/download' },
  { label: 'Tin tức', to: '/news' },
  { label: 'Sự kiện', to: '/events' },
  { label: 'Giftcode', to: '/giftcode' },
  { label: 'Cộng đồng', to: '/community' },
  { label: 'Top Server', to: '/top-server' },
];

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  cash: number;
  vang: number;
  vip: number;
}

export default function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, [location]); // re-check on route change (e.g. after login redirect)

  // Refresh user stats (cash, vàng, vip) từ server khi mở dropdown
  useEffect(() => {
    if (!dropdownOpen || !user) return;
    fetch(`/api/auth/me?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const updated = { ...user, ...data.user };
          setUser(updated);
          localStorage.setItem('user', JSON.stringify(updated));
        }
      })
      .catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Thời Đại Ngọc Rồng" className="h-10" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.to
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            /* === User Profile Dropdown === */
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:shadow-glow"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-fire text-xs font-bold text-primary-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user.username}</span>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
                  >
                    {/* User info header */}
                    <div className="border-b border-border bg-muted/30 px-4 py-3">
                      <p className="font-display text-sm font-semibold text-foreground">{user.username}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
                      <div className="bg-card px-3 py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Cash</p>
                        <p className="font-display text-sm font-semibold text-primary">{user.cash.toLocaleString()}</p>
                      </div>
                      <div className="bg-card px-3 py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">Vàng</p>
                        <p className="font-display text-sm font-semibold text-yellow-500">{user.vang.toLocaleString()}</p>
                      </div>
                      <div className="bg-card px-3 py-2.5 text-center">
                        <p className="text-xs text-muted-foreground">VIP</p>
                        <p className="font-display text-sm font-semibold text-purple-400">{user.vip}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-1.5">
                      <Link
                        to="/my-posts"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        <FileText size={16} className="text-muted-foreground" />
                        Bài viết của tôi
                      </Link>
                      <Link
                        to="/deposit"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        <Wallet size={16} className="text-muted-foreground" />
                        Nạp tiền
                      </Link>
                      {user.is_admin === 1 && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          <User size={16} className="text-muted-foreground" />
                          Quản trị
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut size={16} />
                        Đăng xuất
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* === Login Button === */
            <Link
              to="/auth"
              className="gradient-fire hidden items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 md:inline-flex"
            >
              Đăng nhập
            </Link>
          )}
          <button
            onClick={onToggleTheme}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted md:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile user section */}
              {user ? (
                <>
                  <div className="mt-2 border-t border-border pt-3">
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-fire text-sm font-bold text-primary-foreground">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <Link
                    to="/deposit"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Wallet size={16} className="text-muted-foreground" />
                    Nạp tiền
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 gradient-fire rounded-xl px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
