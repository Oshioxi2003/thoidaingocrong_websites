import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Gift, Check, X, Copy } from 'lucide-react';
import bgGiftcode from '@/assets/bg-giftcode.jpg';
import { fetchGiftcodes, redeemGiftcode, type Giftcode } from '@/lib/api';

export default function GiftcodePage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [resultMsg, setResultMsg] = useState('');

  const { data } = useQuery({
    queryKey: ['public-giftcodes'],
    queryFn: () => fetchGiftcodes(),
  });

  const redeemMutation = useMutation({
    mutationFn: (c: string) => redeemGiftcode(c),
    onSuccess: (data) => {
      setResult('success');
      setResultMsg(data.message);
      setTimeout(() => setResult(null), 3000);
    },
    onError: (err: Error) => {
      setResult('error');
      setResultMsg(err.message);
      setTimeout(() => setResult(null), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
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

        {/* Input Form */}
        <AnimatedSection className="mx-auto mb-16 max-w-md">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8">
            <Gift size={40} className="mx-auto mb-4 text-primary" />
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Nhập giftcode tại đây..."
              className="w-full rounded-xl border border-border bg-background py-3 px-4 text-center font-mono text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={redeemMutation.isPending}
              className="mt-4 w-full rounded-xl gradient-fire py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {redeemMutation.isPending ? 'Đang xử lý...' : 'Đổi mã'}
            </button>

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
