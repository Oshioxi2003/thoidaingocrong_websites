import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import bgAuth from '@/assets/bg-auth.jpg';

type AuthMode = 'login' | 'register' | 'forgot';

// reCAPTCHA v3 site key
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeDdZgsAAAAANxQniBNuuQToBXnnsu-hOhEZx2i';

// Helper: lấy reCAPTCHA v3 token
function getRecaptchaToken(action: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) {
      reject(new Error('reCAPTCHA chưa được tải'));
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action })
        .then((token: string) => resolve(token))
        .catch((err: any) => reject(err));
    });
  });
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const tab = searchParams.get('tab');
    return tab === 'register' ? 'register' : 'login';
  });

  // Sync mode when URL query changes (e.g. user clicks navbar register button while on auth page)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setMode('register');
  }, [searchParams]);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', identifier: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (mode === 'login') {
      if (!form.identifier.trim()) errs.identifier = 'Vui lòng nhập email hoặc tên tài khoản';
    } else {
      if (!form.email.trim()) errs.email = 'Email không được để trống';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email không hợp lệ';
    }

    if (mode !== 'forgot') {
      if (!form.password) errs.password = 'Mật khẩu không được để trống';
    }

    if (mode === 'register') {
      if (!form.name.trim()) errs.name = 'Tên không được để trống';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Mật khẩu không khớp';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      if (mode === 'forgot') {
        // Forgot password - chưa implement backend
        await new Promise(r => setTimeout(r, 1000));
        setMode('login');
        setLoading(false);
        return;
      }

      // Lấy reCAPTCHA v3 token
      let recaptchaToken = '';
      try {
        recaptchaToken = await getRecaptchaToken(mode === 'login' ? 'login' : 'register');
      } catch {
        setErrors({ server: 'Không thể xác minh reCAPTCHA. Vui lòng tải lại trang.' });
        setLoading(false);
        return;
      }

      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register'
        ? { username: form.name, email: form.email, password: form.password, recaptchaToken }
        : { identifier: form.identifier, password: form.password, recaptchaToken };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ server: data.error || 'Đã xảy ra lỗi' });
        setLoading(false);
        return;
      }

      // Lưu user info vào localStorage
      localStorage.setItem('user', JSON.stringify(data.user));

      setLoading(false);
      navigate('/');
    } catch (err) {
      setErrors({ server: 'Không thể kết nối tới server' });
      setLoading(false);
    }
  };

  const titles = {
    login: 'Đăng Nhập',
    register: 'Đăng Ký',
    forgot: 'Quên Mật Khẩu',
  };

  const subtitles = {
    login: 'Chào mừng chiến binh trở lại!',
    register: 'Bắt đầu cuộc phiêu lưu mới',
    forgot: 'Nhập email để lấy lại mật khẩu',
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src={bgAuth} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-background/60 dark:bg-background/75" />
      </div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-4 w-full max-w-md"
      >
        <div className="rounded-3xl border border-border/50 bg-card/80 p-8 shadow-glow backdrop-blur-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="mb-1 text-center font-display text-3xl font-bold text-foreground">
                {titles[mode]}
              </h1>
              <p className="mb-8 text-center text-sm text-muted-foreground">{subtitles[mode]}</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Server error */}
                {errors.server && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
                  >
                    {errors.server}
                  </motion.div>
                )}
                {/* Name field (register only) */}
                {mode === 'register' && (
                  <InputField
                    icon={<User size={18} />}
                    placeholder="Tên chiến binh"
                    value={form.name}
                    onChange={v => setForm(f => ({ ...f, name: v }))}
                    error={errors.name}
                  />
                )}

                {/* Email / Identifier */}
                {mode === 'login' ? (
                  <InputField
                    icon={<User size={18} />}
                    type="text"
                    placeholder="Email hoặc tên tài khoản"
                    value={form.identifier}
                    onChange={v => setForm(f => ({ ...f, identifier: v }))}
                    error={errors.identifier}
                  />
                ) : (
                  <InputField
                    icon={<Mail size={18} />}
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={v => setForm(f => ({ ...f, email: v }))}
                    error={errors.email}
                  />
                )}

                {/* Password */}
                {mode !== 'forgot' && (
                  <InputField
                    icon={<Lock size={18} />}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu"
                    value={form.password}
                    onChange={v => setForm(f => ({ ...f, password: v }))}
                    error={errors.password}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                )}

                {/* Confirm Password (register only) */}
                {mode === 'register' && (
                  <InputField
                    icon={<Lock size={18} />}
                    type="password"
                    placeholder="Xác nhận mật khẩu"
                    value={form.confirmPassword}
                    onChange={v => setForm(f => ({ ...f, confirmPassword: v }))}
                    error={errors.confirmPassword}
                  />
                )}

                {/* Forgot password link */}
                {mode === 'login' && (
                  <div className="text-right">
                    <button type="button" onClick={() => setMode('forgot')} className="text-sm text-primary hover:underline">
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-fire flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-60"
                >
                  {loading ? (
                    <motion.div
                      className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <>
                      {titles[mode]} <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* reCAPTCHA branding notice */}
                <p className="text-center text-[10px] leading-tight text-muted-foreground/60">
                  Trang này được bảo vệ bởi reCAPTCHA và tuân theo{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">
                    Chính sách bảo mật
                  </a>{' '}
                  &{' '}
                  <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">
                    Điều khoản dịch vụ
                  </a>{' '}
                  của Google.
                </p>
              </form>

              {/* Switch mode */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === 'login' ? (
                  <>Chưa có tài khoản?{' '}<button onClick={() => setMode('register')} className="font-semibold text-primary hover:underline">Đăng ký ngay</button></>
                ) : (
                  <>Đã có tài khoản?{' '}<button onClick={() => setMode('login')} className="font-semibold text-primary hover:underline">Đăng nhập</button></>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function InputField({
  icon, type = 'text', placeholder, value, onChange, error, suffix,
}: {
  icon: React.ReactNode; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; error?: string; suffix?: React.ReactNode;
}) {
  return (
    <div>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${error ? 'border-destructive bg-destructive/5' : 'border-border bg-background/50 focus-within:border-primary/50'}`}>
        <span className="text-muted-foreground">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {suffix}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
