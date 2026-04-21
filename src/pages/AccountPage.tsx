import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldOff, Eye, EyeOff, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import { getCurrentUser, getSessionToken, clearAuth, changePassword, logoutAllDevices } from '@/lib/api';

export default function AccountPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const sessionToken = getSessionToken();

  // Redirect nếu chưa đăng nhập
  if (!user || !sessionToken) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-fire text-base font-bold text-primary-foreground shadow-glow">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{user.username}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Card: Đổi mật khẩu */}
          <ChangePasswordCard user={user} sessionToken={sessionToken} />

          {/* Card: Bảo mật thiết bị */}
          <LogoutAllCard user={user} sessionToken={sessionToken} navigate={navigate} />
        </div>
      </motion.div>
    </div>
  );
}

// ======================== CHANGE PASSWORD CARD ========================
function ChangePasswordCard({ user, sessionToken }: { user: NonNullable<ReturnType<typeof getCurrentUser>>; sessionToken: string }) {
  const [form, setForm] = useState({ oldPw: '', newPw: '', confirmPw: '' });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.oldPw) { setError('Vui lòng nhập mật khẩu cũ'); return; }
    if (!form.newPw) { setError('Vui lòng nhập mật khẩu mới'); return; }
    if (form.newPw.length < 6) { setError('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    if (form.newPw !== form.confirmPw) { setError('Mật khẩu xác nhận không khớp'); return; }
    if (form.oldPw === form.newPw) { setError('Mật khẩu mới phải khác mật khẩu cũ'); return; }

    setLoading(true);
    try {
      const result = await changePassword({
        user_id: user.id,
        session_token: sessionToken,
        old_password: form.oldPw,
        new_password: form.newPw,
      });

      // Cập nhật session token mới trong localStorage (thiết bị hiện tại vẫn đăng nhập)
      localStorage.setItem('session_token', result.session_token);
      setSuccess(result.message);
      setForm({ oldPw: '', newPw: '', confirmPw: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Lock size={18} className="text-primary" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Đổi Mật Khẩu</h2>
          <p className="text-xs text-muted-foreground">Sau khi đổi, các thiết bị khác sẽ bị đăng xuất tự động</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
          >
            <AlertTriangle size={15} className="shrink-0" />
            {error}
          </motion.div>
        )}
        {/* Success */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-500"
          >
            <CheckCircle size={15} className="shrink-0" />
            {success}
          </motion.div>
        )}

        {/* Mật khẩu cũ */}
        <PasswordField
          label="Mật khẩu hiện tại"
          value={form.oldPw}
          onChange={v => setForm(f => ({ ...f, oldPw: v }))}
          show={showOld}
          onToggleShow={() => setShowOld(s => !s)}
          placeholder="Nhập mật khẩu hiện tại"
          id="old-password"
        />

        {/* Mật khẩu mới */}
        <PasswordField
          label="Mật khẩu mới"
          value={form.newPw}
          onChange={v => setForm(f => ({ ...f, newPw: v }))}
          show={showNew}
          onToggleShow={() => setShowNew(s => !s)}
          placeholder="Ít nhất 6 ký tự"
          id="new-password"
        />

        {/* Xác nhận */}
        <PasswordField
          label="Xác nhận mật khẩu mới"
          value={form.confirmPw}
          onChange={v => setForm(f => ({ ...f, confirmPw: v }))}
          show={showNew}
          onToggleShow={() => setShowNew(s => !s)}
          placeholder="Nhập lại mật khẩu mới"
          id="confirm-password"
        />

        <button
          type="submit"
          disabled={loading}
          id="change-password-submit"
          className="gradient-fire flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-60"
        >
          {loading ? (
            <motion.div
              className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <><Lock size={15} /> Đổi Mật Khẩu</>
          )}
        </button>
      </form>
    </motion.div>
  );
}

// ======================== LOGOUT ALL CARD ========================
function LogoutAllCard({
  user,
  sessionToken,
  navigate,
}: {
  user: NonNullable<ReturnType<typeof getCurrentUser>>;
  sessionToken: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleLogoutAll = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await logoutAllDevices({ user_id: user.id, session_token: sessionToken });
      // Xóa localStorage và redirect về trang đăng nhập
      clearAuth();
      navigate('/auth');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
          <ShieldOff size={18} className="text-destructive" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Đăng Xuất Tất Cả Thiết Bị</h2>
          <p className="text-xs text-muted-foreground">Kick tất cả phiên đăng nhập, bao gồm thiết bị hiện tại</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400 mb-4">
        <p className="font-medium mb-0.5">⚠️ Lưu ý</p>
        <p className="text-xs leading-relaxed">
          Hành động này sẽ đăng xuất <strong>tất cả thiết bị</strong> (bao gồm thiết bị này).
          Bạn sẽ phải đăng nhập lại. Dùng khi tài khoản bị đăng nhập trên thiết bị lạ.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
        >
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </motion.div>
      )}

      <button
        onClick={handleLogoutAll}
        disabled={loading}
        id="logout-all-devices-btn"
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-sm font-semibold transition-all disabled:opacity-60 ${
          confirm
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse'
            : 'border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20'
        }`}
      >
        {loading ? (
          <motion.div
            className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <><LogOut size={15} /> {confirm ? 'Nhấn lần nữa để xác nhận!' : 'Đăng Xuất Tất Cả Thiết Bị'}</>
        )}
      </button>
      {confirm && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Nhấn lần nữa để xác nhận, hoặc{' '}
          <button onClick={() => setConfirm(false)} className="text-primary hover:underline">
            hủy
          </button>
        </p>
      )}
    </motion.div>
  );
}

// ======================== SHARED COMPONENTS ========================
function PasswordField({
  label, value, onChange, show, onToggleShow, placeholder, id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
  id: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-4 py-3 focus-within:border-primary/50 transition-colors">
        <Lock size={15} className="shrink-0 text-muted-foreground" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="button" onClick={onToggleShow} className="text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}
