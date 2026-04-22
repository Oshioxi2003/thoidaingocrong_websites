import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sword, Wallet, ScrollText, Crown, Medal, Shield } from 'lucide-react';

type TopTab = 'task' | 'deposit' | 'power';

interface TopEntry {
  rank: number;
  name: string;
  value: number;
  pet_power?: number;
  task_id?: string;
  main_task?: number;
  sub_task?: number;
  timestamp?: number;
}

interface UserInfo {
  id: number;
  username: string;
  is_admin: number;
}

const tabs: { key: TopTab; label: string; icon: React.ReactNode }[] = [
  { key: 'task', label: 'Top Nhiệm Vụ', icon: <ScrollText size={18} /> },
  { key: 'deposit', label: 'Top Đại Gia', icon: <Wallet size={18} /> },
  { key: 'power', label: 'Top Sức Mạnh', icon: <Sword size={18} /> },
];

function maskName(name: string): string {
  if (!name) return '***';
  if (name.length <= 2) return name[0] + '***';
  return name[0] + '*'.repeat(Math.min(name.length - 2, 5)) + name[name.length - 1];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown size={22} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />;
  if (rank === 2) return <Medal size={20} className="text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]" />;
  if (rank === 3) return <Shield size={18} className="text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.4)]" />;
  return null;
}

function getRankBg(rank: number) {
  if (rank === 1) return 'bg-gradient-to-r from-yellow-500/15 via-yellow-400/10 to-transparent border-l-4 border-l-yellow-400';
  if (rank === 2) return 'bg-gradient-to-r from-slate-400/10 via-slate-300/5 to-transparent border-l-4 border-l-slate-300';
  if (rank === 3) return 'bg-gradient-to-r from-amber-600/10 via-amber-500/5 to-transparent border-l-4 border-l-amber-600';
  return 'border-l-4 border-l-transparent';
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

export default function TopServerPage() {
  const [tab, setTab] = useState<TopTab>('task');
  const [data, setData] = useState<Record<TopTab, TopEntry[]>>({ task: [], deposit: [], power: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  const isAdmin = user?.is_admin === 1;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch('/api/top-server')
      .then(r => r.json())
      .then(d => {
        setData({
          task: d.task || [],
          deposit: d.deposit || [],
          power: d.power || [],
        });
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []);

  const currentData = useMemo(() => data[tab], [data, tab]);

  const valueLabel: Record<TopTab, string> = {
    task: 'Nhiệm vụ',
    deposit: 'Số tiền nạp',
    power: 'Sức mạnh',
  };

  function formatTimestamp(ts?: number): string {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('vi-VN');
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background/0 to-background z-0" />
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-20 right-1/4 h-48 w-48 rounded-full bg-yellow-500/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-12 pb-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-4">
              <Trophy size={16} className="text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Bảng Xếp Hạng</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-3">
              Top <span className="bg-gradient-to-r from-yellow-400 via-primary to-orange-500 bg-clip-text text-transparent">Server</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Vinh danh những chiến binh mạnh nhất, chăm chỉ nhất và hào phóng nhất trên máy chủ
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-2">
        {/* Tab Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex gap-1 rounded-2xl border border-border bg-card/80 p-1.5 backdrop-blur-sm shadow-lg">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  tab === t.key
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab === t.key && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl gradient-fire shadow-glow"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {t.icon} {t.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Leaderboard Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-3xl"
        >
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className="grid grid-cols-[60px_1fr_150px] md:grid-cols-[80px_1fr_180px] items-center gap-4 border-b border-border bg-muted/30 px-4 md:px-6 py-3.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hạng</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nhân vật</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                {tab === 'task' ? 'Task ID' : valueLabel[tab]}
              </span>
            </div>

            {/* Table Body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <motion.div
                      className="h-8 w-8 rounded-full border-3 border-primary/30 border-t-primary"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : currentData.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground text-sm">
                    <Trophy size={40} className="mx-auto mb-3 opacity-20" />
                    Chưa có dữ liệu xếp hạng
                  </div>
                ) : (
                  currentData.map((entry, idx) => (
                    <motion.div
                      key={`${tab}-${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`grid grid-cols-[60px_1fr_150px] md:grid-cols-[80px_1fr_180px] items-center gap-4 px-4 md:px-6 py-3.5 transition-colors hover:bg-muted/20 ${getRankBg(entry.rank)} ${idx < currentData.length - 1 ? 'border-b border-border/50' : ''}`}
                    >
                      {/* Rank */}
                      <div className="flex items-center gap-2">
                        {getRankIcon(entry.rank) || (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-xs font-bold text-muted-foreground">
                            {entry.rank}
                          </span>
                        )}
                        {entry.rank <= 3 && (
                          <span className={`text-sm font-bold ${
                            entry.rank === 1 ? 'text-yellow-400' :
                            entry.rank === 2 ? 'text-slate-300' :
                            'text-amber-600'
                          }`}>
                            #{entry.rank}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div>
                        <span className={`font-display text-sm font-semibold ${
                          entry.rank === 1 ? 'text-yellow-400' :
                          entry.rank === 2 ? 'text-slate-200' :
                          entry.rank === 3 ? 'text-amber-500' :
                          'text-foreground'
                        }`}>
                          {isAdmin ? entry.name : maskName(entry.name)}
                        </span>
                      </div>

                      {/* Value */}
                      <div className="text-right">
                        {tab === 'deposit' && !isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                            <Wallet size={12} />
                            Ẩn
                          </span>
                        ) : tab === 'task' && entry.task_id ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-display text-sm font-bold ${
                              entry.rank === 1 ? 'text-yellow-400' :
                              entry.rank <= 3 ? 'text-primary' :
                              'text-foreground'
                            }`}>
                              {entry.task_id}
                            </span>
                            {entry.timestamp ? (
                              <span className="text-[10px] text-muted-foreground">
                                {formatTimestamp(entry.timestamp)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className={`font-display text-sm font-bold ${
                            entry.rank === 1 ? 'text-yellow-400' :
                            entry.rank <= 3 ? 'text-primary' :
                            'text-foreground'
                          }`}>
                            {formatNumber(entry.value)}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer */}
            {currentData.length > 0 && (
              <div className="border-t border-border bg-muted/10 px-6 py-3 text-center text-xs text-muted-foreground">
                Hiển thị top {currentData.length} • Cập nhật mỗi khi tải trang
              </div>
            )}
          </div>

          {/* Admin Notice */}
          {isAdmin && tab === 'deposit' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-xs text-primary"
            >
              👑 Bạn đang xem với quyền Admin — Số tiền nạp và tên đầy đủ được hiển thị
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
