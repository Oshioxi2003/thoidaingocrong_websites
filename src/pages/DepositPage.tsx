import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Wallet, Copy, Check, X, Clock, CheckCircle2, Loader2, History, CreditCard, ArrowRight, Sparkles } from 'lucide-react';
import bgEvents from '@/assets/bg-events.jpg';
import {
  createDeposit,
  checkDeposit,
  fetchDepositHistory,
  type DepositOrder,
  type DepositCreateResponse,
} from '@/lib/api';

const PRESET_AMOUNTS = [
  { label: '10K', value: 10000 },
  { label: '20K', value: 20000 },
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '200K', value: 200000 },
  { label: '500K', value: 500000 },
];

interface UserInfo {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  cash: number;
  vang: number;
  vip: number;
}

export default function DepositPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [currentDeposit, setCurrentDeposit] = useState<DepositCreateResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{ status: string; message: string } | null>(null);
  const [autoChecking, setAutoChecking] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { navigate('/auth'); }
    } else {
      navigate('/auth');
    }
  }, [navigate]);

  // Deposit history
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['deposit-history', user?.id],
    queryFn: () => fetchDepositHistory(user!.id),
    enabled: !!user,
  });

  // Auto-resume: nếu có đơn pending (status=0) khi reload trang → tự động vào step 2
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (!historyData || !user || currentDeposit || resumeChecked) return;
    setResumeChecked(true);
    const pendingDeposit = historyData.data.find(
      (d) => d.status === 0 && new Date(d.created_at).getTime() > Date.now() - 30 * 60 * 1000
    );
    if (pendingDeposit) {
      // Gọi create để lấy đầy đủ bank info (server trả lại đơn pending nếu có)
      createDeposit({ user_id: user.id, username: user.username, amount: pendingDeposit.amount })
        .then((data) => {
          setCurrentDeposit(data);
          setAmount(pendingDeposit.amount);
          setStep(2);
        })
        .catch(() => { /* ignore - user sẽ tạo đơn mới */ });
    }
  }, [historyData, user, currentDeposit, resumeChecked]);

  // Create deposit mutation
  const createMutation = useMutation({
    mutationFn: (amt: number) => createDeposit({ user_id: user!.id, username: user!.username, amount: amt }),
    onSuccess: (data) => {
      setCurrentDeposit(data);
      setStep(2);
    },
    onError: (err: Error) => {
      setCheckResult({ status: 'error', message: err.message });
    },
  });

  // Check deposit mutation
  const checkMutation = useMutation({
    mutationFn: (depositId: number) => checkDeposit(depositId),
    onSuccess: (data) => {
      setCheckResult({ status: data.status, message: data.message });
      if (data.status === 'success') {
        setAutoChecking(false);
        setStep(3);
        refetchHistory();
        // Update user in localStorage
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
      }
    },
    onError: (err: Error) => {
      setAutoChecking(false);
      setCheckResult({ status: 'error', message: err.message });
    },
  });

  const [autoCheckCount, setAutoCheckCount] = useState(0);
  const MAX_AUTO_CHECK = 60; // Tối đa ~5 phút (60 x 5s)

  // Auto-check every 5 seconds (dừng khi thành công, lỗi, hoặc quá 60 lần)
  useEffect(() => {
    if (!autoChecking || !currentDeposit) return;
    if (autoCheckCount >= MAX_AUTO_CHECK) {
      setAutoChecking(false);
      setCheckResult({ status: 'error', message: 'Đã hết thời gian kiểm tra tự động. Vui lòng bấm kiểm tra lại.' });
      return;
    }
    const interval = setInterval(() => {
      setAutoCheckCount(prev => prev + 1);
      checkMutation.mutate(currentDeposit.deposit.id);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoChecking, currentDeposit, autoCheckCount]);

  const handleSelectAmount = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomAmount = (val: string) => {
    const num = val.replace(/\D/g, '');
    setCustomAmount(num);
    setAmount(Number(num));
  };

  const handleCreateDeposit = () => {
    if (amount < 10000) {
      setCheckResult({ status: 'error', message: 'Số tiền tối thiểu 10,000 VND' });
      return;
    }
    setCheckResult(null);
    createMutation.mutate(amount);
  };

  const handleStartCheck = () => {
    if (!currentDeposit) return;
    setAutoChecking(true);
    setAutoCheckCount(0);
    setCheckResult(null);
    checkMutation.mutate(currentDeposit.deposit.id);
  };

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleNewDeposit = () => {
    setStep(1);
    setAmount(0);
    setCustomAmount('');
    setCurrentDeposit(null);
    setCheckResult(null);
    setAutoChecking(false);
    queryClient.invalidateQueries({ queryKey: ['deposit-history'] });
  };

  const formatVND = (n: number) => n.toLocaleString('vi-VN');

  const deposits = historyData?.data || [];

  if (!user) return null;

  return (
    <PageBackground src={bgEvents}>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle
            title="Nạp Cash"
            subtitle="Chuyển khoản ngân hàng — Xử lý tự động"
          />

          {/* Step Indicator */}
          <div className="mx-auto mb-10 flex max-w-md items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    step >= s
                      ? 'gradient-fire text-primary-foreground shadow-glow'
                      : 'border border-border bg-card text-muted-foreground'
                  }`}
                >
                  {step > s ? <Check size={16} /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 w-8 rounded transition-colors duration-300 ${
                      step > s ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Chọn mệnh giá */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatedSection className="mx-auto max-w-lg">
                  <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-8">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-fire">
                        <Wallet size={20} className="text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground">Chọn số tiền nạp</h3>
                        <p className="text-sm text-muted-foreground">Tỷ giá: 1 VND = 1 Cash</p>
                      </div>
                    </div>

                    {/* Preset buttons */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                      {PRESET_AMOUNTS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => handleSelectAmount(preset.value)}
                          className={`relative overflow-hidden rounded-xl border py-4 text-center font-display text-sm font-semibold transition-all duration-200 hover:scale-[1.03] ${
                            amount === preset.value && !customAmount
                              ? 'border-primary bg-primary/10 text-primary shadow-glow'
                              : 'border-border bg-background text-foreground hover:border-primary/30'
                          }`}
                        >
                          <span className="text-lg">{preset.label}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">{formatVND(preset.value)}đ</span>
                          {amount === preset.value && !customAmount && (
                            <motion.div
                              layoutId="amount-check"
                              className="absolute right-1.5 top-1.5"
                            >
                              <CheckCircle2 size={16} className="text-primary" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Custom amount */}
                    <div className="mb-6">
                      <label className="mb-2 block text-sm text-muted-foreground">Hoặc nhập số tiền tuỳ ý</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customAmount}
                          onChange={(e) => handleCustomAmount(e.target.value)}
                          placeholder="Nhập số tiền (tối thiểu 10,000)"
                          className="w-full rounded-xl border border-border bg-background py-3 px-4 pr-14 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">VND</span>
                      </div>
                    </div>

                    {/* Current balance */}
                    <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Số dư hiện tại</span>
                      <span className="font-display text-sm font-semibold text-primary">{formatVND(user.cash)} Cash</span>
                    </div>

                    {checkResult && checkResult.status === 'error' && (
                      <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                        <X size={16} /> {checkResult.message}
                      </div>
                    )}

                    <button
                      onClick={handleCreateDeposit}
                      disabled={amount < 10000 || createMutation.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl gradient-fire py-3.5 font-display text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    >
                      {createMutation.isPending ? (
                        <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
                      ) : (
                        <>Tiếp tục <ArrowRight size={16} /></>
                      )}
                    </button>
                  </div>
                </AnimatedSection>
              </motion.div>
            )}

            {/* Step 2: Thông tin chuyển khoản */}
            {step === 2 && currentDeposit && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatedSection className="mx-auto max-w-lg">
                  <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-8">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-fire">
                        <CreditCard size={20} className="text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-semibold text-foreground">Thông tin chuyển khoản</h3>
                        <p className="text-sm text-muted-foreground">Chuyển khoản đúng nội dung bên dưới</p>
                      </div>
                    </div>

                    {/* QR Code VietQR */}
                    <div className="mb-6 flex flex-col items-center">
                      <div className="rounded-2xl border border-border bg-white p-3">
                        <img
                          src={`https://img.vietqr.io/image/ACB-${currentDeposit.bank.accountNumber}-compact.png?amount=${currentDeposit.deposit.amount}&addInfo=${currentDeposit.deposit.transfer_code}&accountName=${encodeURIComponent(currentDeposit.bank.accountName)}`}
                          alt="QR Code chuyển khoản"
                          className="h-52 w-52 object-contain"
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Quét mã QR bằng app ngân hàng</p>
                    </div>

                    {/* Bank info */}
                    <div className="mb-6 space-y-3">
                      <InfoRow label="Ngân hàng" value={currentDeposit.bank.bank} onCopy={() => handleCopy(currentDeposit.bank.bank, 'bank')} copied={copied === 'bank'} />
                      <InfoRow label="Chủ tài khoản" value={currentDeposit.bank.accountName} onCopy={() => handleCopy(currentDeposit.bank.accountName, 'name')} copied={copied === 'name'} />
                      <InfoRow label="Số tài khoản" value={currentDeposit.bank.accountNumber} onCopy={() => handleCopy(currentDeposit.bank.accountNumber, 'stk')} copied={copied === 'stk'} highlight />
                      <InfoRow label="Số tiền" value={`${formatVND(currentDeposit.deposit.amount)} VND`} onCopy={() => handleCopy(String(currentDeposit.deposit.amount), 'amount')} copied={copied === 'amount'} highlight />
                      <InfoRow label="Nội dung CK" value={currentDeposit.deposit.transfer_code} onCopy={() => handleCopy(currentDeposit.deposit.transfer_code, 'code')} copied={copied === 'code'} highlight important />
                    </div>

                    {/* Warning */}
                    <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                      <p className="text-sm text-yellow-500">
                        ⚠️ Vui lòng chuyển đúng <strong>số tiền</strong> và <strong>nội dung</strong> để hệ thống tự động xác nhận.
                      </p>
                    </div>

                    {/* Check result */}
                    <AnimatePresence>
                      {checkResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${
                            checkResult.status === 'success'
                              ? 'bg-green-500/10 text-green-500'
                              : checkResult.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {checkResult.status === 'success' ? <CheckCircle2 size={16} /> : checkResult.status === 'pending' ? <Clock size={16} /> : <X size={16} />}
                          {checkResult.message}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex gap-3">
                      <button
                        onClick={handleNewDeposit}
                        className="flex-1 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        Huỷ
                      </button>
                      <button
                        onClick={handleStartCheck}
                        disabled={checkMutation.isPending || autoChecking}
                        className="flex flex-[2] items-center justify-center gap-2 rounded-xl gradient-fire py-3 font-display text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-70"
                      >
                        {autoChecking ? (
                          <><Loader2 size={16} className="animate-spin" /> Đang kiểm tra...</>
                        ) : checkMutation.isPending ? (
                          <><Loader2 size={16} className="animate-spin" /> Kiểm tra...</>
                        ) : (
                          <><Check size={16} /> Đã chuyển khoản</>
                        )}
                      </button>
                    </div>
                  </div>
                </AnimatedSection>
              </motion.div>
            )}

            {/* Step 3: Thành công */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <AnimatedSection className="mx-auto max-w-lg">
                  <div className="rounded-2xl border border-green-500/30 bg-card/90 backdrop-blur-sm p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10"
                    >
                      <Sparkles size={32} className="text-green-500" />
                    </motion.div>
                    <h3 className="mb-2 font-display text-xl font-semibold text-green-500">Nạp thành công!</h3>
                    <p className="mb-4 text-muted-foreground">{checkResult?.message}</p>
                    <div className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Số dư mới: </span>
                      <span className="font-display text-lg font-semibold text-primary">{formatVND(user.cash)} Cash</span>
                    </div>
                    <button
                      onClick={handleNewDeposit}
                      className="gradient-fire rounded-xl px-8 py-3 font-display text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                    >
                      Nạp thêm
                    </button>
                  </div>
                </AnimatedSection>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deposit History */}
          <AnimatedSection className="mt-16">
            <div className="mx-auto max-w-2xl">
              <div className="mb-6 flex items-center gap-2">
                <History size={20} className="text-primary" />
                <h3 className="font-display text-xl font-semibold text-foreground">Lịch sử nạp</h3>
              </div>
              {deposits.length === 0 ? (
                <p className="text-center text-muted-foreground">Chưa có lịch sử nạp.</p>
              ) : (
                <div className="space-y-2">
                  {deposits.map((d: DepositOrder) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card/80 px-4 py-3 backdrop-blur-sm transition-colors hover:border-primary/20"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground">{d.transfer_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(d.created_at).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-sm font-semibold text-foreground">
                          {formatVND(d.amount)}đ
                        </span>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                            d.status === 1
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-yellow-500/10 text-yellow-500'
                          }`}
                        >
                          {d.status === 1 ? 'Thành công' : 'Đang chờ'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </PageBackground>
  );
}

// Sub-component: Info row with copy button
function InfoRow({ label, value, onCopy, copied, highlight, important }: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  highlight?: boolean;
  important?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
      important
        ? 'border-primary/40 bg-primary/5'
        : highlight
        ? 'border-border bg-muted/30'
        : 'border-border bg-background'
    }`}>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono text-sm font-semibold ${important ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="ml-3 flex-shrink-0 rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
