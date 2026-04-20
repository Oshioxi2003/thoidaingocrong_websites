import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Users, Gift, ClipboardCheck, Package, Wallet,
  ChevronLeft, Menu, LogOut, Plus, Search, Trash2, Edit, Eye, Ban, CheckCircle, X, XCircle, Clock,
  TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, ShieldAlert
} from 'lucide-react';
import {
  fetchPosts, deletePost, fetchPendingPosts, approvePost,
  fetchUsers, banUser,
  fetchGiftcodes, createGiftcode, deleteGiftcode, fetchItemOptions, fetchGiftcodeItems,
  fetchPlayers, fetchPlayerInventory, addInventoryItem, deleteInventoryItem, fetchItemTemplates,
  fetchAdminDeposits, fetchDepositStats, approveDeposit, getCurrentUser,
  type Post, type User, type Giftcode, type Player, type InventoryItem, type ItemTemplate,
  type ItemOption, type GiftcodeDetailItem, type DepositOrder, type DepositStats
} from '@/lib/api';

/* ============ SHARED PAGINATION ============ */
function Pagination({ page, totalPages, total, perPage, onPageChange, label = 'mục' }: {
  page: number; totalPages: number; total: number; perPage: number;
  onPageChange: (p: number) => void; label?: string;
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Hiển thị {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} / {total.toLocaleString()} {label}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={page <= 1}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed" title="Trang đầu">««</button>
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed" title="Trang trước">«</button>
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-xs text-muted-foreground">…</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={`min-w-[32px] rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                page === p ? 'gradient-fire text-primary-foreground shadow-glow' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>{p}</button>
          )
        )}
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed" title="Trang sau">»</button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed" title="Trang cuối">»»</button>
      </div>
    </div>
  );
}

function PerPageSelector({ perPage, onChange }: { perPage: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Hiển thị:</span>
      {[20, 50, 100].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            perPage === n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
          }`}>{n}</button>
      ))}
    </div>
  );
}

type Tab = 'posts' | 'approval' | 'users' | 'giftcodes' | 'inventory' | 'deposits';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'posts', label: 'Bài viết', icon: FileText },
  { key: 'approval', label: 'Duyệt bài', icon: ClipboardCheck },
  { key: 'users', label: 'Người dùng', icon: Users },
  { key: 'giftcodes', label: 'Giftcode', icon: Gift },
  { key: 'inventory', label: 'Hành trang', icon: Package },
  { key: 'deposits', label: 'Dòng tiền', icon: Wallet },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra quyền admin khi vào trang
  useEffect(() => {
    const checkAdmin = async () => {
      const user = getCurrentUser();
      if (!user || !user.id) {
        navigate('/auth', { replace: true });
        return;
      }
      if (user.is_admin !== 1) {
        navigate('/', { replace: true });
        return;
      }
      // Xác thực lại từ server để tránh giả mạo localStorage
      try {
        const res = await fetch(`/api/auth/me?user_id=${user.id}`);
        const data = await res.json();
        if (!res.ok || !data.user || data.user.is_admin !== 1) {
          navigate('/', { replace: true });
          return;
        }
        setIsAuthorized(true);
      } catch {
        navigate('/', { replace: true });
        return;
      }
      setAuthChecked(true);
    };
    checkAdmin();
  }, [navigate]);

  // Loading state khi đang kiểm tra quyền
  if (!authChecked || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <motion.div
            className="mx-auto mb-4 h-10 w-10 rounded-full border-3 border-primary/30 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-sm text-muted-foreground">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 64 }}
        className="fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] flex-col border-r border-border bg-card"
      >
        <div className="flex items-center justify-between p-4">
          {sidebarOpen && <span className="font-display text-sm font-bold text-foreground">Admin Panel</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-primary/10 font-semibold text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon size={18} />
              {sidebarOpen && <span>{tab.label}</span>}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Về trang chủ</span>}
          </Link>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main
        className="flex-1 p-6 transition-all"
        style={{ marginLeft: sidebarOpen ? 256 : 64 }}
      >
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'posts' && <PostsTab />}
          {activeTab === 'approval' && <ApprovalTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'giftcodes' && <GiftcodesTab />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'deposits' && <DepositsTab />}
        </motion.div>
      </main>
    </div>
  );
}

/* ============ POSTS ============ */
function PostsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', search, page, perPage],
    queryFn: () => fetchPosts({ search: search || undefined, page, limit: perPage }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posts'] }),
  });

  const posts = data?.data || [];
  const totalPosts = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePerPage = (n: number) => { setPerPage(n); setPage(1); };

  const categoryLabels: Record<number, string> = { 0: 'Tin tức', 1: 'Sự kiện', 2: 'Hướng dẫn', 3: 'Cập nhật', 4: 'Cộng đồng' };
  const statusLabels: Record<string, { label: string; className: string }> = {
    pending: { label: 'Chờ duyệt', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    approved: { label: 'Đã duyệt', className: 'bg-emerald-500/10 text-emerald-500' },
    rejected: { label: 'Từ chối', className: 'bg-destructive/10 text-destructive' },
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Quản lý bài viết</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng cộng <strong className="text-foreground">{totalPosts.toLocaleString()}</strong> bài viết
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PerPageSelector perPage={perPage} onChange={handlePerPage} />
          <Link
            to="/create-post"
            className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
          >
            <Plus size={16} /> Thêm bài viết
          </Link>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
        <Search size={18} className="text-muted-foreground" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Tìm kiếm bài viết..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Chưa có bài viết nào.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tiêu đề</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Danh mục</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ngày tạo</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post: Post) => {
                  const st = statusLabels[post.status || 'approved'] || statusLabels.approved;
                  return (
                    <tr key={post.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground">#{post.id}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{post.title}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {categoryLabels[post.category] || 'Khác'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${st.className}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(post.created_at).toLocaleDateString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/create-post?edit=${post.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" title="Sửa">
                            <Edit size={16} />
                          </Link>
                          <Link to={`/news/${post.id}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Xem">
                            <Eye size={16} />
                          </Link>
                          <button
                            onClick={() => { if (confirm('Xóa bài viết này?')) deleteMutation.mutate(post.id); }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={totalPosts} perPage={perPage} onPageChange={setPage} label="bài viết" />
        </>
      )}
    </div>
  );
}

/* ============ APPROVAL ============ */
function ApprovalTab() {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-posts'],
    queryFn: fetchPendingPosts,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => approvePost(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    },
  });

  const allPosts = data?.data || [];
  const totalPages = Math.ceil(allPosts.length / perPage);
  const posts = useMemo(() => allPosts.slice((page - 1) * perPage, page * perPage), [allPosts, page, perPage]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Duyệt bài viết cộng đồng</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Có <strong className="text-foreground">{allPosts.length}</strong> bài viết chờ duyệt
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : allPosts.length === 0 ? (
        <div className="py-20 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500/30" />
          <p className="text-lg font-medium text-muted-foreground">Không có bài viết chờ duyệt</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Tất cả bài viết đã được xử lý</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post: Post, i: number) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-yellow-500/20 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">
                        <Clock size={11} />
                        Chờ duyệt
                      </span>
                      <span className="text-xs text-muted-foreground">
                        bởi <strong className="text-foreground">{post.author_name || 'Unknown'}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{post.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {tryGetPreview(post.description)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/news/${post.id}`}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={() => approveMutation.mutate({ id: post.id, status: 'approved' })}
                      disabled={approveMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                      title="Duyệt bài"
                    >
                      <CheckCircle size={16} />
                      Duyệt
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ id: post.id, status: 'rejected' })}
                      disabled={approveMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                      title="Từ chối"
                    >
                      <XCircle size={16} />
                      Từ chối
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={allPosts.length} perPage={perPage} onPageChange={setPage} label="bài chờ duyệt" />
        </>
      )}
    </div>
  );
}

function tryGetPreview(description: string): string {
  try {
    const parsed = JSON.parse(description);
    if (parsed?.blocks) {
      const textBlock = parsed.blocks.find((b: any) => b.type === 'paragraph' || b.type === 'header');
      if (textBlock) return textBlock.data.text?.replace(/<[^>]*>/g, '') || '';
    }
  } catch { /* plain text */ }
  return description.substring(0, 200);
}

/* ============ USERS ============ */
function UsersTab() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter, page, perPage],
    queryFn: () => fetchUsers({ search: search || undefined, role: roleFilter, status: statusFilter, page, limit: perPage }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, ban }: { id: number; ban: boolean }) => banUser(id, ban),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data || [];
  const totalUsers = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleRole = (v: string) => { setRoleFilter(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPage = (v: number) => { setPerPage(v); setPage(1); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Quản lý người dùng</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng cộng <strong className="text-foreground">{totalUsers.toLocaleString()}</strong> người dùng
          </p>
        </div>
        <PerPageSelector perPage={perPage} onChange={handlePerPage} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Tìm theo tên, email hoặc IP..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'admin', label: 'Admin' }, { key: 'user', label: 'User' }].map(f => (
            <button
              key={f.key}
              onClick={() => handleRole(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === f.key ? 'gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >{f.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'active', label: 'Hoạt động' }, { key: 'banned', label: 'Bị cấm' }].map(f => (
            <button
              key={f.key}
              onClick={() => handleStatus(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key ? 'gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : users.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Không tìm thấy người dùng nào.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tên</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Vai trò</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Cash</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">IP Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: User) => (
                  <tr key={user.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">#{user.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{user.username}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        user.is_admin ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.cash.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.ip_address || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        user.ban ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {user.ban ? 'Bị cấm' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => banMutation.mutate({ id: user.id, ban: !user.ban })}
                        className={`rounded-lg p-1.5 transition-colors ${
                          user.ban
                            ? 'text-emerald-500 hover:bg-emerald-500/10'
                            : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                        }`}
                        title={user.ban ? 'Mở cấm' : 'Cấm user'}
                      >
                        {user.ban ? <CheckCircle size={16} /> : <Ban size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={totalUsers} perPage={perPage} onPageChange={setPage} label="người dùng" />
        </>
      )}
    </div>
  );
}

/* ============ GIFTCODES ============ */
function GiftcodesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [viewGcId, setViewGcId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-giftcodes', search, statusFilter],
    queryFn: () => fetchGiftcodes({ search: search || undefined, status: statusFilter }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGiftcode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-giftcodes'] }),
  });

  const allGiftcodes = data?.data || [];
  const totalPages = Math.ceil(allGiftcodes.length / perPage);
  const giftcodes = useMemo(() => allGiftcodes.slice((page - 1) * perPage, page * perPage), [allGiftcodes, page, perPage]);

  const isExpired = (gc: Giftcode) => gc.count_left <= 0 || new Date(gc.expired) <= new Date();

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Quản lý Giftcode</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng cộng <strong className="text-foreground">{allGiftcodes.length}</strong> giftcode
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
        >
          <Plus size={16} /> Tạo Giftcode
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Tìm theo mã..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'active', label: 'Hoạt động' }, { key: 'expired', label: 'Hết hạn' }].map(f => (
            <button
              key={f.key}
              onClick={() => handleStatus(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key ? 'gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : allGiftcodes.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Chưa có giftcode nào.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {giftcodes.map((gc: Giftcode, i: number) => (
              <GiftcodeCard
                key={gc.id}
                gc={gc}
                isExpired={isExpired(gc)}
                index={i}
                onDelete={() => { if (confirm('Xóa giftcode này?')) deleteMutation.mutate(gc.id); }}
                onView={() => setViewGcId(gc.id)}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={allGiftcodes.length} perPage={perPage} onPageChange={setPage} label="giftcode" />
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateGiftcodeModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-giftcodes'] });
            setShowCreate(false);
          }}
        />
      )}

      {/* View Detail Modal */}
      {viewGcId !== null && (
        <ViewGiftcodeModal
          gcId={viewGcId}
          gc={allGiftcodes.find(g => g.id === viewGcId)!}
          onClose={() => setViewGcId(null)}
        />
      )}
    </div>
  );
}

/* ============ GIFTCODE CARD ============ */
function GiftcodeCard({ gc, isExpired: expired, index, onDelete, onView }: {
  gc: Giftcode; isExpired: boolean; index: number; onDelete: () => void; onView: () => void;
}) {
  // Parse detail to show item icons
  const items = useMemo(() => {
    try { return JSON.parse(gc.detail || '[]'); } catch { return []; }
  }, [gc.detail]);

  // Fetch templates for icon_id mapping
  const { data: templateData } = useQuery({
    queryKey: ['item-templates-all'],
    queryFn: () => fetchItemTemplates({ limit: 5000 }),
    staleTime: 300000,
  });
  const templateMap = useMemo(() => {
    const map: Record<number, { icon_id: number; name: string }> = {};
    (templateData?.data || []).forEach(t => { map[t.id] = t; });
    return map;
  }, [templateData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card shadow-card overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-display text-lg font-bold text-foreground">{gc.code}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Còn lại: <span className="text-foreground font-semibold">{gc.count_left.toLocaleString()}</span> lượt
              • Hạn: {new Date(gc.expired).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            expired ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            {expired ? 'Hết hạn' : 'Hoạt động'}
          </span>
        </div>

        {/* Item icons grid */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {items.slice(0, 20).map((item: { id: number; quantity: number }, idx: number) => {
              const t = templateMap[item.id];
              const iconId = t?.icon_id ?? item.id;
              return (
                <div
                  key={idx}
                  className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-border/60 bg-gradient-to-br from-muted/60 to-muted/20"
                  title={`${t?.name || `Item #${item.id}`} (x${item.quantity})`}
                >
                  <img
                    src={`/media/icon/${iconId}.png`}
                    alt=""
                    className="h-8 w-8 object-contain drop-shadow-sm"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 rounded bg-black/70 px-1 text-[8px] font-bold text-white leading-tight">
                    {item.quantity > 999999 ? `${(item.quantity / 1000000).toFixed(0)}M` : item.quantity > 999 ? `${Math.round(item.quantity / 1000)}K` : item.quantity}
                  </span>
                </div>
              );
            })}
            {items.length > 20 && (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border/40 text-xs text-muted-foreground">
                +{items.length - 20}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary inline-flex items-center justify-center gap-1"
          >
            <Eye size={14} /> Xem
          </button>
          <button
            onClick={onDelete}
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ============ VIEW GIFTCODE MODAL ============ */
function ViewGiftcodeModal({ gcId, gc, onClose }: { gcId: number; gc: Giftcode; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['giftcode-items', gcId],
    queryFn: () => fetchGiftcodeItems(gcId),
  });

  const { data: optionsData } = useQuery({
    queryKey: ['item-options'],
    queryFn: fetchItemOptions,
    staleTime: 300000,
  });
  const optionMap = useMemo(() => {
    const map: Record<number, ItemOption> = {};
    (optionsData?.data || []).forEach(o => { map[o.id] = o; });
    return map;
  }, [optionsData]);

  const items = data?.data || [];

  const OPTION_COLORS: Record<number, string> = {
    0: 'text-gray-300', 1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-orange-400',
    4: 'text-red-400', 5: 'text-purple-400', 6: 'text-blue-400', 7: 'text-pink-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-glow max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Chi tiết Giftcode: <span className="text-primary">{gc.code}</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              {items.length} vật phẩm • Còn {gc.count_left.toLocaleString()} lượt • Hạn {new Date(gc.expired).toLocaleDateString('vi-VN')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
        ) : (
          <>
            {/* Visual item grid */}
            <div className="flex flex-wrap gap-2 mb-4">
              {items.map((item: GiftcodeDetailItem, idx: number) => (
                <div
                  key={idx}
                  className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-border/60 bg-gradient-to-br from-muted/60 to-muted/20 hover:border-primary/50 transition-colors"
                  title={`${item.name} (x${item.quantity})`}
                >
                  <img
                    src={`/media/icon/${item.icon_id}.png`}
                    alt={item.name}
                    className="h-9 w-9 object-contain drop-shadow-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white leading-tight">
                    {item.quantity > 999999 ? `${(item.quantity / 1000000).toFixed(0)}M` : item.quantity > 999 ? `${Math.round(item.quantity / 1000)}K` : item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Detail table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-10">Icon</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tên</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-16">ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-16">SL</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Options</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: GiftcodeDetailItem, idx: number) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <img src={`/media/icon/${item.icon_id}.png`} alt="" className="h-7 w-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </td>
                      <td className="px-3 py-2 text-foreground font-medium">{item.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{item.id}</td>
                      <td className="px-3 py-2 text-foreground">{item.quantity.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {item.options && item.options.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {item.options.map((opt, oi) => {
                              const optTpl = optionMap[opt.id];
                              const colorClass = optTpl ? OPTION_COLORS[optTpl.color] || 'text-gray-300' : 'text-gray-400';
                              const label = optTpl ? optTpl.name.replace('#', String(opt.param)) : `Option ${opt.id}: ${opt.param}`;
                              return <span key={oi} className={`${colorClass} text-[10px]`}>{label}</span>;
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ============ CREATE GIFTCODE MODAL ============ */
interface GiftcodeItemEntry {
  item_id: number;
  quantity: number;
  options: { id: number; param: number }[];
  icon_id?: number;
  name?: string;
}

function CreateGiftcodeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [countLeft, setCountLeft] = useState(100);
  const [expired, setExpired] = useState('2030-01-01');
  const [items, setItems] = useState<GiftcodeItemEntry[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemPickerPage, setItemPickerPage] = useState(1);

  // Item templates
  const { data: templateData } = useQuery({
    queryKey: ['item-templates', itemSearch, itemPickerPage],
    queryFn: () => fetchItemTemplates({ search: itemSearch || undefined, page: itemPickerPage, limit: 60 }),
    staleTime: 60000,
  });

  // Item options
  const { data: optionsData } = useQuery({
    queryKey: ['item-options'],
    queryFn: fetchItemOptions,
    staleTime: 300000,
  });

  const createMutation = useMutation({
    mutationFn: createGiftcode,
    onSuccess,
  });

  const itemTemplates = templateData?.data || [];
  const totalTemplatePages = templateData?.totalPages || 1;
  const allOptions = optionsData?.data || [];

  const OPTION_COLORS: Record<number, string> = {
    0: 'text-gray-300', 1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-orange-400',
    4: 'text-red-400', 5: 'text-purple-400', 6: 'text-blue-400', 7: 'text-pink-400',
  };

  const addItem = (t: ItemTemplate) => {
    setItems(prev => [...prev, { item_id: t.id, quantity: 1, options: [], icon_id: t.icon_id, name: t.name }]);
    setShowItemPicker(false);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: qty } : it));
  };

  const addOption = (itemIdx: number, optId: number) => {
    setItems(prev => prev.map((it, i) => i === itemIdx ? { ...it, options: [...it.options, { id: optId, param: 0 }] } : it));
  };

  const removeOption = (itemIdx: number, optIdx: number) => {
    setItems(prev => prev.map((it, i) => i === itemIdx ? { ...it, options: it.options.filter((_, oi) => oi !== optIdx) } : it));
  };

  const updateOptionParam = (itemIdx: number, optIdx: number, param: number) => {
    setItems(prev => prev.map((it, i) => i === itemIdx ? {
      ...it, options: it.options.map((o, oi) => oi === optIdx ? { ...o, param } : o)
    } : it));
  };

  const handleCreate = () => {
    const detail = JSON.stringify(items.map(it => ({
      id: it.item_id,
      quantity: it.quantity,
      options: it.options,
    })));
    createMutation.mutate({
      code,
      count_left: countLeft,
      detail,
      expired: expired + ' 23:59:59',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-glow max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground">Tạo Giftcode mới</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Code + Count + Expired */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Mã Giftcode</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="NGOCRONGVIP"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Số lượt</label>
              <input
                type="number"
                value={countLeft}
                onChange={e => setCountLeft(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Hết hạn</label>
              <input
                type="date"
                value={expired}
                onChange={e => setExpired(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Items list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Vật phẩm ({items.length})</label>
              <button
                onClick={() => setShowItemPicker(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors"
                type="button"
              >
                <Plus size={12} /> Thêm vật phẩm
              </button>
            </div>

            {/* Visual preview */}
            {items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-3 rounded-xl border border-border/50 bg-muted/10">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-border/60 bg-gradient-to-br from-muted/60 to-muted/20"
                    title={`${it.name || `Item #${it.item_id}`} (x${it.quantity})`}
                  >
                    <img
                      src={`/media/icon/${it.icon_id ?? it.item_id}.png`}
                      alt=""
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 rounded bg-black/70 px-1 text-[8px] font-bold text-white leading-tight">
                      {it.quantity > 999 ? `${Math.round(it.quantity / 1000)}K` : it.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Item entries */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-muted/10 p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={`/media/icon/${it.icon_id ?? it.item_id}.png`}
                      alt=""
                      className="h-8 w-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{it.name || `Item #${it.item_id}`}</p>
                      <p className="text-[10px] text-muted-foreground">ID: {it.item_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground">SL:</label>
                      <input
                        type="number"
                        value={it.quantity}
                        onChange={e => updateItemQuantity(idx, Number(e.target.value))}
                        min={1}
                        className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    <button onClick={() => removeItem(idx)} className="rounded-lg p-1 text-muted-foreground hover:text-destructive">
                      <X size={14} />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="ml-11">
                    {it.options.map((opt, oi) => {
                      const optTpl = allOptions.find(o => o.id === opt.id);
                      const colorClass = optTpl ? OPTION_COLORS[optTpl.color] || 'text-gray-300' : 'text-gray-400';
                      return (
                        <div key={oi} className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] flex-1 ${colorClass}`}>
                            {optTpl ? optTpl.name.replace('#', '___') : `Option ${opt.id}`}
                          </span>
                          <input
                            type="number"
                            value={opt.param}
                            onChange={e => updateOptionParam(idx, oi, Number(e.target.value))}
                            className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground focus:border-primary focus:outline-none"
                            placeholder="param"
                          />
                          <button onClick={() => removeOption(idx, oi)} className="text-muted-foreground hover:text-destructive">
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                    <ItemOptionPicker
                      allOptions={allOptions}
                      onSelect={(optId: number) => addOption(idx, optId)}
                      optionColors={OPTION_COLORS}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={!code || items.length === 0 || createMutation.isPending}
            className="gradient-fire w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-all hover:shadow-glow"
          >
            {createMutation.isPending ? 'Đang tạo...' : `Tạo Giftcode (${items.length} vật phẩm)`}
          </button>

          {createMutation.isError && (
            <p className="text-xs text-destructive text-center">Lỗi: {(createMutation.error as Error).message}</p>
          )}
        </div>

        {/* Item Picker Overlay */}
        <AnimatePresence>
          {showItemPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setShowItemPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="mx-4 w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-glow max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">Chọn vật phẩm</h4>
                  <button onClick={() => setShowItemPicker(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
                </div>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    value={itemSearch}
                    onChange={e => { setItemSearch(e.target.value); setItemPickerPage(1); }}
                    placeholder="Tìm theo tên hoặc ID..."
                    className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
                  {itemTemplates.map((t: ItemTemplate) => (
                    <button
                      key={t.id}
                      onClick={() => addItem(t)}
                      className="flex flex-col items-center justify-center rounded-lg border border-border/30 bg-background/50 p-1 text-[7px] transition-all hover:border-primary hover:bg-primary/10"
                      title={`${t.name} (ID: ${t.id})`}
                    >
                      <img
                        src={`/media/icon/${t.icon_id}.png`}
                        alt={t.name}
                        className="h-7 w-7 object-contain"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className="mt-0.5 text-muted-foreground truncate w-full text-center leading-tight">{t.id}</span>
                    </button>
                  ))}
                </div>
                {totalTemplatePages > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setItemPickerPage(p => Math.max(1, p - 1))}
                      disabled={itemPickerPage <= 1}
                      className="rounded px-3 py-1 text-xs border border-border hover:bg-muted disabled:opacity-30"
                    >←</button>
                    <span className="text-xs text-muted-foreground">{itemPickerPage}/{totalTemplatePages}</span>
                    <button
                      onClick={() => setItemPickerPage(p => Math.min(totalTemplatePages, p + 1))}
                      disabled={itemPickerPage >= totalTemplatePages}
                      className="rounded px-3 py-1 text-xs border border-border hover:bg-muted disabled:opacity-30"
                    >→</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ============ ITEM OPTION PICKER (Dropdown) ============ */
function ItemOptionPicker({ allOptions, onSelect, optionColors }: {
  allOptions: ItemOption[];
  onSelect: (optId: number) => void;
  optionColors: Record<number, string>;
}) {
  return (
    <select
      value=""
      onChange={e => {
        const val = Number(e.target.value);
        if (!isNaN(val) && val >= 0) onSelect(val);
      }}
      className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-muted-foreground focus:border-primary focus:outline-none cursor-pointer"
    >
      <option value="">+ Thêm option...</option>
      {allOptions.map(opt => (
        <option key={opt.id} value={opt.id}>
          [{opt.id}] {opt.name}
        </option>
      ))}
    </select>
  );
}

/* ============ INVENTORY ============ */

// Parse data_inventory: [vàng, ngọc_xanh, hồng_ngọc, ...]
function parsePlayerInventoryData(dataInventory: string | null | undefined) {
  try {
    const arr = JSON.parse(dataInventory || '[]');
    return {
      vang: Number(arr[0]) || 0,
      ngocXanh: Number(arr[1]) || 0,
      hongNgoc: Number(arr[2]) || 0,
    };
  } catch { return { vang: 0, ngocXanh: 0, hongNgoc: 0 }; }
}

// Parse data_point: [..., sức_mạnh (index 1), ...]
function parsePlayerPower(dataPoint: string | null | undefined) {
  try {
    const arr = JSON.parse(dataPoint || '[]');
    return Number(arr[1]) || 0;
  } catch { return 0; }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function InventoryTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const queryClient = useQueryClient();

  // Fetch players
  const { data: playersData, isLoading: loadingPlayers } = useQuery({
    queryKey: ['admin-players', search, page, perPage],
    queryFn: () => fetchPlayers({ search: search || undefined, page, limit: perPage }),
  });

  // Fetch inventory for selected player
  const { data: inventoryData, isLoading: loadingInventory } = useQuery({
    queryKey: ['admin-inventory', selectedPlayer?.id],
    queryFn: () => fetchPlayerInventory(selectedPlayer!.id),
    enabled: !!selectedPlayer,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ playerId, slot }: { playerId: number; slot: number }) => deleteInventoryItem(playerId, slot),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-inventory', selectedPlayer?.id] }),
  });

  const players = playersData?.data || [];
  const totalPlayers = playersData?.total || 0;
  const totalPages = playersData?.totalPages || 1;
  const inventory = inventoryData?.data || [];

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handlePerPage = (n: number) => { setPerPage(n); setPage(1); };

  // Fill grid to 20 slots for visual
  const GRID_SLOTS = 20;
  const gridItems: (InventoryItem | null)[] = [];
  for (let i = 0; i < Math.max(GRID_SLOTS, inventory.length); i++) {
    gridItems.push(inventory.find(item => item.slot === i) || null);
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Quản lý hành trang</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tổng cộng <strong className="text-foreground">{totalPlayers.toLocaleString()}</strong> nhân vật
        </p>
      </div>

      {/* Player Search */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Tìm nhân vật theo tên..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>
        <PerPageSelector perPage={perPage} onChange={handlePerPage} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Players List */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <div className="border-b border-border bg-muted/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Danh sách nhân vật</h3>
          </div>
          {loadingPlayers ? (
            <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
          ) : players.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Không tìm thấy nhân vật nào.</div>
          ) : (
            <>
              <div className="divide-y divide-border/50">
                {players.map((player: Player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/30 ${
                      selectedPlayer?.id === player.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <img
                      src={`/media/icon/${player.head || 0}.png`}
                      alt=""
                      className="h-8 w-8 rounded-full object-contain bg-muted/50"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/media/icon/0.png'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{player.name}</p>
                      <p className="text-xs text-muted-foreground">ID: {player.id} • Account: {player.account_id}</p>
                      {(() => {
                        const inv = parsePlayerInventoryData(player.data_inventory);
                        const power = parsePlayerPower(player.data_point);
                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[10px] text-yellow-500" title="Vàng">🪙 {formatNumber(inv.vang)}</span>
                            <span className="text-[10px] text-blue-400" title="Ngọc xanh">💎 {formatNumber(inv.ngocXanh)}</span>
                            <span className="text-[10px] text-pink-400" title="Hồng ngọc">🔮 {formatNumber(inv.hongNgoc)}</span>
                            {power > 0 && <span className="text-[10px] text-orange-400" title="Sức mạnh">⚡ {formatNumber(power)}</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3">
                <Pagination page={page} totalPages={totalPages} total={totalPlayers} perPage={perPage} onPageChange={setPage} label="nhân vật" />
              </div>
            </>
          )}
        </div>

        {/* Inventory Grid */}
        <div className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              {selectedPlayer ? (
                <>Hành trang của <span className="text-foreground">{selectedPlayer.name}</span> ({inventory.length} vật phẩm)</>
              ) : 'Chọn nhân vật để xem hành trang'}
            </h3>
            {selectedPlayer && (
              <button
                onClick={() => setShowAddItem(true)}
                className="gradient-fire inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
              >
                <Plus size={14} /> Thêm vật phẩm
              </button>
            )}
          </div>

          {!selectedPlayer ? (
            <div className="py-20 text-center">
              <Package size={48} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Chọn nhân vật từ danh sách bên trái</p>
            </div>
          ) : loadingInventory ? (
            <div className="py-20 text-center text-muted-foreground">Đang tải hành trang...</div>
          ) : (
            <>
            {/* Player Stats Banner */}
            {(() => {
              const inv = parsePlayerInventoryData(selectedPlayer.data_inventory);
              const power = parsePlayerPower(selectedPlayer.data_point);
              return (
                <div className="mx-4 mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                    <span className="text-base">🪙</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Vàng</p>
                      <p className="text-xs font-bold text-yellow-500 truncate">{inv.vang.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2">
                    <span className="text-base">💎</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Ngọc xanh</p>
                      <p className="text-xs font-bold text-blue-400 truncate">{inv.ngocXanh.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/5 px-3 py-2">
                    <span className="text-base">🔮</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Hồng ngọc</p>
                      <p className="text-xs font-bold text-pink-400 truncate">{inv.hongNgoc.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-3 py-2">
                    <span className="text-base">⚡</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Sức mạnh</p>
                      <p className="text-xs font-bold text-orange-400 truncate">{power.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="p-4">
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
                {gridItems.map((item, i) => (
                  <div
                    key={i}
                    className={`group relative flex aspect-square items-center justify-center rounded-lg border transition-all ${
                      item
                        ? 'border-border/80 bg-gradient-to-br from-muted/80 to-muted/30 hover:border-primary/50 hover:shadow-md cursor-pointer'
                        : 'border-dashed border-border/40 bg-muted/10'
                    }`}
                    title={item ? `${item.name} (ID: ${item.item_id}) | SL: ${item.quantity} | Slot: ${item.slot}` : `Slot ${i}`}
                  >
                    {item && (
                      <>
                        <img
                          src={`/media/icon/${item.icon_id}.png`}
                          alt={item.name}
                          className="h-8 w-8 object-contain drop-shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {item.quantity > 1 && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white leading-tight">
                            {item.quantity > 999999 ? `${(item.quantity / 1000000).toFixed(1)}M` : item.quantity > 999 ? `${(item.quantity / 1000).toFixed(0)}K` : item.quantity}
                          </span>
                        )}
                        {/* Delete overlay on hover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Xóa vật phẩm "${item.name}" (ID: ${item.item_id}, slot ${item.slot})?`))
                              deleteMutation.mutate({ playerId: selectedPlayer!.id, slot: item.slot });
                          }}
                          className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-white shadow-md transition-transform hover:scale-110 group-hover:block"
                          title="Xóa vật phẩm"
                        >
                          <X size={10} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Item detail table */}
              {inventory.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Slot</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Icon</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tên vật phẩm</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item ID</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Số lượng</th>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Options</th>
                        <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item: InventoryItem) => (
                        <tr key={item.slot} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground">{item.slot}</td>
                          <td className="px-3 py-2">
                            <img
                              src={`/media/icon/${item.icon_id}.png`}
                              alt=""
                              className="h-6 w-6 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </td>
                          <td className="px-3 py-2 text-foreground max-w-[150px] truncate" title={item.name}>{item.name}</td>
                          <td className="px-3 py-2 font-mono text-foreground">{item.item_id}</td>
                          <td className="px-3 py-2 text-foreground">{item.quantity.toLocaleString()}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate font-mono text-muted-foreground" title={item.options}>{item.options}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => {
                                if (confirm(`Xóa "${item.name}" (ID: ${item.item_id})?`))
                                  deleteMutation.mutate({ playerId: selectedPlayer!.id, slot: item.slot });
                              }}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddItem && selectedPlayer && (
        <AddItemModal
          playerId={selectedPlayer.id}
          playerName={selectedPlayer.name}
          onClose={() => setShowAddItem(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-inventory', selectedPlayer.id] });
            setShowAddItem(false);
          }}
        />
      )}
    </div>
  );
}

/* ============ ADD ITEM MODAL ============ */
function AddItemModal({ playerId, playerName, onClose, onSuccess }: {
  playerId: number;
  playerName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [options, setOptions] = useState('[]');
  const [iconSearch, setIconSearch] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [itemPickerPage, setItemPickerPage] = useState(1);
  const iconGridRef = useRef<HTMLDivElement>(null);

  // Fetch item templates from database
  const { data: itemTemplateData } = useQuery({
    queryKey: ['item-templates', iconSearch, itemPickerPage],
    queryFn: () => fetchItemTemplates({ search: iconSearch || undefined, page: itemPickerPage, limit: 100 }),
    staleTime: 60000,
  });

  const addMutation = useMutation({
    mutationFn: () => addInventoryItem(playerId, {
      item_id: Number(itemId),
      quantity,
      options,
    }),
    onSuccess,
  });

  const itemTemplates = itemTemplateData?.data || [];
  const totalTemplates = itemTemplateData?.total || 0;
  const totalTemplatePages = itemTemplateData?.totalPages || 1;

  // Find selected item template info for preview
  const selectedTemplate = useMemo(() => {
    if (!itemId) return null;
    return itemTemplates.find(t => t.id === Number(itemId)) || null;
  }, [itemTemplates, itemId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-glow max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground">
            Thêm vật phẩm cho <span className="text-primary">{playerName}</span>
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Item ID + preview */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Item ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={itemId}
                  onChange={e => setItemId(e.target.value)}
                  placeholder="VD: 457"
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  type="button"
                >
                  {showIconPicker ? 'Đóng' : 'Chọn item'}
                </button>
              </div>
            </div>
            {itemId && (
              <div className="flex h-12 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3">
                <img
                  src={`/media/icon/${selectedTemplate?.icon_id ?? itemId}.png`}
                  alt=""
                  className="h-8 w-8 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {selectedTemplate && (
                  <span className="text-xs text-foreground max-w-[120px] truncate">{selectedTemplate.name}</span>
                )}
              </div>
            )}
          </div>

          {/* Item Picker Grid */}
          <AnimatePresence>
            {showIconPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Search size={14} className="text-muted-foreground" />
                    <input
                      value={iconSearch}
                      onChange={e => { setIconSearch(e.target.value); setItemPickerPage(1); }}
                      placeholder="Tìm theo tên hoặc ID..."
                      className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground">{itemTemplates.length} / {totalTemplates}</span>
                  </div>
                  <div ref={iconGridRef} className="grid grid-cols-8 gap-1 max-h-[240px] overflow-y-auto sm:grid-cols-10 md:grid-cols-12">
                    {itemTemplates.map((t: ItemTemplate) => (
                      <button
                        key={t.id}
                        onClick={() => { setItemId(String(t.id)); setShowIconPicker(false); }}
                        className={`flex flex-col items-center justify-center rounded-md border p-1 text-[8px] transition-all hover:border-primary hover:bg-primary/10 ${
                          String(t.id) === itemId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border/30 bg-background/50'
                        }`}
                        title={`${t.name} (ID: ${t.id}, Icon: ${t.icon_id})`}
                      >
                        <img
                          src={`/media/icon/${t.icon_id}.png`}
                          alt={t.name}
                          className="h-6 w-6 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                          }}
                        />
                        <span className="mt-0.5 text-muted-foreground truncate w-full text-center leading-tight">{t.id}</span>
                      </button>
                    ))}
                  </div>
                  {/* Pagination for item picker */}
                  {totalTemplatePages > 1 && (
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setItemPickerPage(p => Math.max(1, p - 1))}
                        disabled={itemPickerPage <= 1}
                        className="rounded px-2 py-0.5 text-[10px] border border-border hover:bg-muted disabled:opacity-30"
                      >←</button>
                      <span className="text-[10px] text-muted-foreground">{itemPickerPage}/{totalTemplatePages}</span>
                      <button
                        onClick={() => setItemPickerPage(p => Math.min(totalTemplatePages, p + 1))}
                        disabled={itemPickerPage >= totalTemplatePages}
                        className="rounded px-2 py-0.5 text-[10px] border border-border hover:bg-muted disabled:opacity-30"
                      >→</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Số lượng</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              min={1}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Options */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Options (JSON)</label>
            <textarea
              value={options}
              onChange={e => setOptions(e.target.value)}
              placeholder='[]'
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={() => addMutation.mutate()}
            disabled={!itemId || addMutation.isPending}
            className="gradient-fire w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-all hover:shadow-glow"
          >
            {addMutation.isPending ? 'Đang thêm...' : 'Thêm vật phẩm'}
          </button>

          {addMutation.isError && (
            <p className="text-xs text-destructive text-center">Lỗi: {(addMutation.error as Error).message}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ============ DEPOSITS (DÒNG TIỀN) ============ */
function DepositsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deposits', search, statusFilter, page, perPage],
    queryFn: () => fetchAdminDeposits({ search: search || undefined, status: statusFilter, page, limit: perPage }),
  });

  const { data: stats } = useQuery({
    queryKey: ['deposit-stats'],
    queryFn: fetchDepositStats,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) => approveDeposit(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['deposit-stats'] });
    },
  });

  const deposits = data?.data || [];
  const totalDeposits = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };
  const handlePerPage = (v: number) => { setPerPage(v); setPage(1); };

  const formatVND = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Quản lý dòng tiền</h2>
        <p className="mt-1 text-sm text-muted-foreground">Theo dõi tất cả giao dịch nạp tiền</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <DollarSign size={20} className="text-emerald-500" />
              </div>
              <ArrowUpRight size={16} className="text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
            <p className="font-display text-xl font-bold text-foreground">{formatVND(stats.totalAmount)}đ</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.totalDeposits} giao dịch thành công</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp size={20} className="text-primary" />
              </div>
              <ArrowUpRight size={16} className="text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Hôm nay</p>
            <p className="font-display text-xl font-bold text-foreground">{formatVND(stats.todayAmount)}đ</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.todayDeposits} giao dịch</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-yellow-500/30 bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                <Clock size={20} className="text-yellow-500" />
              </div>
              <span className="text-xs font-semibold text-yellow-500">{stats.pendingCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Đang chờ</p>
            <p className="font-display text-xl font-bold text-foreground">{formatVND(stats.pendingAmount)}đ</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.pendingCount} đơn chờ xử lý</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <Wallet size={20} className="text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Tổng giao dịch</p>
            <p className="font-display text-xl font-bold text-foreground">{totalDeposits}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tất cả trạng thái</p>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Tìm theo username, mã chuyển khoản..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => handleSearch('')} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'success', label: 'Thành công' }, { key: 'pending', label: 'Đang chờ' }].map(f => (
            <button
              key={f.key}
              onClick={() => handleStatus(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key ? 'gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >{f.label}</button>
          ))}
        </div>
        <PerPageSelector perPage={perPage} onChange={handlePerPage} />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : deposits.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Không có giao dịch nào.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nội dung CK</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Số tiền</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Thời gian</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ref</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d: DepositOrder) => (
                  <tr key={d.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">#{d.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{d.username || '—'}</p>
                        <p className="text-xs text-muted-foreground">UID: {d.user_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[200px] truncate" title={d.transfer_code}>
                      {d.transfer_code}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-display font-semibold text-foreground">{formatVND(d.amount)}đ</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        d.status === 1
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {d.status === 1 ? 'Thành công' : 'Đang chờ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate" title={d.refNo}>
                      {d.refNo || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.status === 0 && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { if (confirm(`Duyệt đơn #${d.id} — Cộng ${formatVND(d.amount)} cash cho ${d.username}?`)) approveMutation.mutate({ id: d.id, status: 1 }); }}
                            disabled={approveMutation.isPending}
                            className="rounded-lg p-1.5 text-emerald-500 transition-colors hover:bg-emerald-500/10"
                            title="Duyệt (cộng cash)"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Từ chối đơn #${d.id}?`)) approveMutation.mutate({ id: d.id, status: -1 }); }}
                            disabled={approveMutation.isPending}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Từ chối (xóa đơn)"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                      {d.status === 1 && (
                        <span className="text-xs text-muted-foreground">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={totalDeposits} perPage={perPage} onPageChange={setPage} label="giao dịch" />
        </>
      )}
    </div>
  );
}
