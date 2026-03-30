import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Gift, Check, X, Copy } from 'lucide-react';
import bgGiftcode from '@/assets/bg-giftcode.jpg';

const publicCodes = [
  { code: 'NGOCRONGVIP', reward: '500 Kim Cương + 10 Ngọc Rồng', status: 'active' },
  { code: 'TANTHU2026', reward: '200 Kim Cương + Skin SR', status: 'active' },
  { code: 'MUAXUAN', reward: '300 Kim Cương', status: 'expired' },
];

export default function GiftcodePage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (publicCodes.some(c => c.code === code.toUpperCase().trim() && c.status === 'active')) {
      setResult('success');
    } else {
      setResult('error');
    }
    setTimeout(() => setResult(null), 3000);
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
  };

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
              className="mt-4 w-full rounded-xl gradient-fire py-3 font-display text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Đổi mã
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
                  {result === 'success' ? 'Đổi mã thành công! Kiểm tra hộp thư.' : 'Mã không hợp lệ hoặc đã hết hạn.'}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </AnimatedSection>

        {/* Public Codes */}
        <AnimatedSection>
          <div className="mx-auto max-w-2xl">
            <h3 className="mb-6 text-center font-display text-xl font-semibold text-foreground">Mã đang hoạt động</h3>
            <div className="space-y-3">
              {publicCodes.map(c => (
                <div key={c.code} className={`flex items-center justify-between rounded-xl border border-border p-4 transition-colors ${c.status === 'expired' ? 'opacity-50' : 'bg-card hover:border-primary/30'}`}>
                  <div>
                    <p className="font-mono font-semibold text-foreground">{c.code}</p>
                    <p className="text-sm text-muted-foreground">{c.reward}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === 'expired' ? (
                      <span className="text-xs text-muted-foreground">Hết hạn</span>
                    ) : (
                      <button onClick={() => copyCode(c.code)} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
    </PageBackground>
  );
}
