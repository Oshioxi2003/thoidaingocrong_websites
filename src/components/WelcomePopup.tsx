import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Smartphone, Monitor, Apple, Coffee, Download, ExternalLink, Users, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/assets/logo.png';

const GOOGLE_DRIVE = 'https://drive.google.com/drive/folders/1RPsdAu7aQXTR5bA_RUnsqaE2nOO1x7M-?usp=sharing';
const IOS_TESTFLIGHT = 'https://testflight.apple.com/join/KSvswayS';

const downloads = [
  {
    icon: Apple,
    name: 'iOS',
    desc: 'TestFlight',
    link: IOS_TESTFLIGHT,
    gradient: 'from-gray-600 to-gray-800',
    external: true,
  },
  {
    icon: Smartphone,
    name: 'Android',
    desc: 'APK 61.8 MB',
    link: GOOGLE_DRIVE,
    gradient: 'from-green-500 to-emerald-700',
    external: true,
  },
  {
    icon: Monitor,
    name: 'PC',
    desc: 'RAR 56.4 MB',
    link: GOOGLE_DRIVE,
    gradient: 'from-blue-500 to-indigo-700',
    external: true,
  },
  {
    icon: Coffee,
    name: 'Java',
    desc: 'JAR 5 MB',
    link: GOOGLE_DRIVE,
    gradient: 'from-orange-500 to-red-700',
    external: true,
  },
];

const communities = [
  {
    icon: Users,
    name: 'Facebook',
    desc: 'Cộng đồng 50K+',
    url: 'https://www.facebook.com/thoidaingocrong/',
    gradient: 'from-blue-600 to-blue-800',
  },
  {
    icon: MessageCircle,
    name: 'Zalo',
    desc: 'Chat & tìm đội',
    url: 'https://zalo.me/g/uytblh319',
    gradient: 'from-blue-400 to-cyan-600',
  },
];

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Chỉ hiện popup 1 lần mỗi phiên trình duyệt
    const shown = sessionStorage.getItem('welcome_popup_shown');
    if (!shown) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem('welcome_popup_shown', '1');
      }, 800); // Delay nhẹ để trang load xong
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background hover:text-foreground"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>

              {/* Header with gradient & logo */}
              <div className="relative overflow-hidden gradient-fire px-6 pb-6 pt-8 text-center">
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

                <motion.img
                  src={logo}
                  alt="Thời Đại Ngọc Rồng"
                  className="mx-auto mb-3 h-16 w-auto drop-shadow-lg"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                />
                <h2 className="font-display text-xl font-bold text-white drop-shadow-md">
                  Chào mừng đến Thời Đại Ngọc Rồng!
                </h2>
                <p className="mt-1 text-sm text-white/80">
                  Tải game ngay và tham gia cộng đồng chiến binh
                </p>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {/* Download section */}
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Download size={14} />
                  Tải Game
                </h3>
                <div className="grid grid-cols-4 gap-2.5">
                  {downloads.map((d, i) => (
                    <motion.a
                      key={d.name}
                      href={d.link}
                      target={d.external ? '_blank' : undefined}
                      rel={d.external ? 'noopener noreferrer' : undefined}
                      download={!d.external ? true : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-background/50 p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-glow hover:-translate-y-0.5"
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${d.gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                        <d.icon size={20} className="text-white" />
                      </div>
                      <div className="text-center">
                        <span className="block text-sm font-semibold text-foreground">{d.name}</span>
                        <span className="block text-[10px] text-muted-foreground">{d.desc}</span>
                      </div>
                    </motion.a>
                  ))}
                </div>

                {/* Divider */}
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground">hoặc</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Community section */}
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users size={14} />
                  Tham gia cộng đồng
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {communities.map((c, i) => (
                    <motion.a
                      key={c.name}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="group flex items-center gap-3 rounded-2xl border border-border bg-background/50 p-3.5 transition-all duration-300 hover:border-primary/40 hover:shadow-glow hover:-translate-y-0.5"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${c.gradient} shadow-md transition-transform duration-300 group-hover:scale-110`}>
                        <c.icon size={20} className="text-white" />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-foreground">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">{c.desc}</span>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/30 px-6 py-3.5">
                <div className="flex items-center justify-between">
                  <Link
                    to="/download"
                    onClick={() => setOpen(false)}
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Xem trang tải game →
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-muted px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
