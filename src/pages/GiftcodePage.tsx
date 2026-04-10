import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Gift, Check, X, Copy, LogIn, User, Gamepad2, Wrench } from 'lucide-react';
import bgGiftcode from '@/assets/bg-giftcode.jpg';
import { fetchGiftcodes, redeemGiftcode, type Giftcode } from '@/lib/api';
import { useSEO } from '@/lib/seo';

interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_admin: number;
}

export default function GiftcodePage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const navigate = useNavigate();

  useSEO({
    title: 'Giftcode',
    description: 'Nhập mã Giftcode Thời Đại Ngọc Rồng để nhận quà miễn phí. Cập nhật danh sách giftcode mới nhất, còn hạn sử dụng.',
    canonical: '/giftcode',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const { data } = useQuery({
    queryKey: ['public-giftcodes'],
    queryFn: () => fetchGiftcodes(),
  });

  const redeemMutation = useMutation({
    mutationFn: (c: string) => redeemGiftcode(c, user!.id),
    onSuccess: (data) => {
      setResult('success');
      setResultMsg(data.message);
      setTimeout(() => setResult(null), 5000);
    },
    onError: (err: Error) => {
      setResult('error');
      setResultMsg(err.message);
      setTimeout(() => setResult(null), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!user) {
      setResult('error');
      setResultMsg('Vui lòng đăng nhập để sử dụng giftcode');
      setTimeout(() => setResult(null), 3000);
      return;
    }
    redeemMutation.mutate(code.trim());
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
  };

  const giftcodes = data?.data || [];
  const isActive = (gc: Giftcode) => gc.count_left > 0 && new Date(gc.expired) > new Date();

  return (
    <PageBackground src={bgGiftcode}>
    <div className="py-20">
      <div className="container mx-auto px-4">
        <SectionTitle title="Giftcode" subtitle="Nhập mã để nhận quà miễn phí" />

        {/* Login Warning */}
        {!user && (
          <AnimatedSection className="mx-auto mb-8 max-w-md">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center backdrop-blur-sm">
              <LogIn size={28} className="mx-auto mb-3 text-amber-400" />
              <p className="mb-1 font-display text-sm font-semibold text-amber-300">Bạn chưa đăng nhập</p>
              <p className="mb-4 text-xs text-amber-300/70">Đăng nhập để có thể nhập mã giftcode và nhận phần thưởng</p>
              <button
                onClick={() => navigate('/auth')}
                className="inline-flex items-center gap-2 rounded-xl gradient-fire px-6 py-2.5 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                <LogIn size={16} /> Đăng nhập ngay
              </button>
            </div>
          </AnimatedSection>
        )}

        {/* User Info */}
        {user && (
          <AnimatedSection className="mx-auto mb-4 max-w-md">
            <div className="flex items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 backdrop-blur-sm">
              <User size={16} className="text-primary" />
              <span className="text-sm text-muted-foreground">Tài khoản:</span>
              <span className="font-display text-sm font-semibold text-foreground">{user.username}</span>
            </div>
          </AnimatedSection>
        )}

        {/* Thông báo bảo trì */}
        <AnimatedSection className="mx-auto mb-6 max-w-md">
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center backdrop-blur-sm">
            <motion.div
              animate={{ rotate: [0, -15, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block"
            >
              <Wrench size={32} className="mx-auto mb-3 text-amber-400" />
            </motion.div>
            <p className="font-display text-base font-semibold text-amber-300">🔧 Đang bảo trì</p>
            <p className="mt-1 text-sm text-amber-300/80">Chức năng đổi Giftcode đang bảo trì. Vui lòng quay lại sau!</p>
          </div>
        </AnimatedSection>

        {/* Input Form */}
        <AnimatedSection className="mx-auto mb-16 max-w-md">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 opacity-50 pointer-events-none">
            <Gift size={40} className="mx-auto mb-4 text-primary" />
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Nhập giftcode tại đây..."
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-center font-mono text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled
            />
            <button
              type="submit"
              disabled
              className="mt-4 w-full rounded-xl gradient-fire py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Đang bảo trì
            </button>

            {/* Lưu ý */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3">
              <Gamepad2 size={16} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                Bạn cần <strong className="text-foreground">tạo nhân vật trong game</strong> trước khi nhập mã. 
                Vật phẩm sẽ được thêm trực tiếp vào <strong className="text-foreground">hành trang</strong> nhân vật. 
                Hãy đảm bảo hành trang còn đủ ô trống!
              </p>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-4 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium ${
                    result === 'success'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {result === 'success' ? <Check size={16} /> : <X size={16} />}
                  {resultMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </AnimatedSection>

        {/* Public Codes */}
        <AnimatedSection>
          <div className="mx-auto max-w-2xl">
            <h3 className="mb-6 text-center font-display text-xl font-semibold text-foreground">Danh sách Giftcode</h3>
            {giftcodes.length === 0 ? (
              <p className="text-center text-muted-foreground">Chưa có giftcode nào.</p>
            ) : (
              <div className="space-y-3">
                {giftcodes.map((c: Giftcode) => {
                  const active = isActive(c);
                  return (
                    <div key={c.id} className={`flex items-center justify-between rounded-xl border border-border p-4 transition-colors ${!active ? 'opacity-50' : 'bg-card hover:border-primary/30'}`}>
                      <div>
                        <p className="font-mono font-semibold text-foreground">{c.code}</p>
                        <p className="text-sm text-muted-foreground">Còn {c.count_left} lượt • Hết hạn: {new Date(c.expired).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!active ? (
                          <span className="text-xs text-muted-foreground">Hết hạn</span>
                        ) : (
                          <button onClick={() => copyCode(c.code)} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
    </PageBackground>
  );
}
