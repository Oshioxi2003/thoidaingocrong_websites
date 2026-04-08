import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Users, Gift, ClipboardCheck, Package,
  ChevronLeft, Menu, LogOut, Plus, Search, Trash2, Edit, Eye, Ban, CheckCircle, X, XCircle, Clock
} from 'lucide-react';
import {
  fetchPosts, deletePost, fetchPendingPosts, approvePost,
  fetchUsers, banUser,
  fetchGiftcodes, createGiftcode, deleteGiftcode,
  fetchPlayers, fetchPlayerInventory, addInventoryItem, deleteInventoryItem, fetchIconList,
  type Post, type User, type Giftcode, type Player, type InventoryItem
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

type Tab = 'posts' | 'approval' | 'users' | 'giftcodes' | 'inventory';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'posts', label: 'Bài viết', icon: FileText },
  { key: 'approval', label: 'Duyệt bài', icon: ClipboardCheck },
  { key: 'users', label: 'Người dùng', icon: Users },
  { key: 'giftcodes', label: 'Giftcode', icon: Gift },
  { key: 'inventory', label: 'Hành trang', icon: Package },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
            placeholder="Tìm theo tên hoặc email..."
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
  const [newCode, setNewCode] = useState('');
  const [newCount, setNewCount] = useState(100);
  const [newDetail, setNewDetail] = useState('');
  const [newExpired, setNewExpired] = useState('2030-01-01');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-giftcodes', search, statusFilter],
    queryFn: () => fetchGiftcodes({ search: search || undefined, status: statusFilter }),
  });

  const createMutation = useMutation({
    mutationFn: createGiftcode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-giftcodes'] });
      setShowCreate(false);
      setNewCode('');
      setNewCount(100);
      setNewDetail('');
    },
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

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">Tạo Giftcode mới</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="Mã giftcode (VD: NGOCRONGVIP)"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                value={newCount}
                onChange={e => setNewCount(Number(e.target.value))}
                placeholder="Số lượt sử dụng"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <textarea
                value={newDetail}
                onChange={e => setNewDetail(e.target.value)}
                placeholder='Chi tiết phần thưởng (JSON), VD: [{"id":457,"quantity":100,"options":[]}]'
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
              />
              <input
                type="date"
                value={newExpired}
                onChange={e => setNewExpired(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => createMutation.mutate({
                  code: newCode,
                  count_left: newCount,
                  detail: newDetail || '[]',
                  expired: newExpired + ' 00:00:00',
                })}
                disabled={!newCode || createMutation.isPending}
                className="gradient-fire w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createMutation.isPending ? 'Đang tạo...' : 'Tạo Giftcode'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <motion.div
                key={gc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold text-foreground">{gc.code}</p>
                    <p className="mt-1 text-xs text-muted-foreground font-mono">{gc.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isExpired(gc) ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {isExpired(gc) ? 'Hết hạn' : 'Hoạt động'}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Còn lại: {gc.count_left}</span>
                    <span>Hết hạn: {new Date(gc.expired).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => { if (confirm('Xóa giftcode này?')) deleteMutation.mutate(gc.id); }}
                    className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 size={14} className="mx-auto" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={allGiftcodes.length} perPage={perPage} onPageChange={setPage} label="giftcode" />
        </>
      )}
    </div>
  );
}

/* ============ INVENTORY ============ */
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
                    title={item ? `ID: ${item.item_id} | SL: ${item.quantity} | Slot: ${item.slot}` : `Slot ${i}`}
                  >
                    {item && (
                      <>
                        <img
                          src={`/media/icon/${item.item_id}.png`}
                          alt={`Item ${item.item_id}`}
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
                            if (confirm(`Xóa vật phẩm ID ${item.item_id} (slot ${item.slot})?`))
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
                              src={`/media/icon/${item.item_id}.png`}
                              alt=""
                              className="h-6 w-6 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-foreground">{item.item_id}</td>
                          <td className="px-3 py-2 text-foreground">{item.quantity.toLocaleString()}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate font-mono text-muted-foreground" title={item.options}>{item.options}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => {
                                if (confirm(`Xóa vật phẩm ID ${item.item_id}?`))
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
  const iconGridRef = useRef<HTMLDivElement>(null);

  // Fetch icon list
  const { data: iconData } = useQuery({
    queryKey: ['icon-list'],
    queryFn: fetchIconList,
    staleTime: Infinity,
  });

  const addMutation = useMutation({
    mutationFn: () => addInventoryItem(playerId, {
      item_id: Number(itemId),
      quantity,
      options,
    }),
    onSuccess,
  });

  const allIcons = iconData?.data || [];
  const filteredIcons = useMemo(() => {
    if (!iconSearch) return allIcons.slice(0, 200); // show first 200 by default
    const searchNum = parseInt(iconSearch, 10);
    if (!isNaN(searchNum)) {
      return allIcons.filter(id => String(id).includes(iconSearch)).slice(0, 200);
    }
    return allIcons.slice(0, 200);
  }, [allIcons, iconSearch]);

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
                  {showIconPicker ? 'Đóng' : 'Chọn icon'}
                </button>
              </div>
            </div>
            {itemId && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/5">
                <img
                  src={`/media/icon/${itemId}.png`}
                  alt={`Item ${itemId}`}
                  className="h-8 w-8 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Icon Picker Grid */}
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
                      onChange={e => setIconSearch(e.target.value)}
                      placeholder="Tìm theo ID..."
                      className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground">{filteredIcons.length} / {allIcons.length}</span>
                  </div>
                  <div ref={iconGridRef} className="grid grid-cols-10 gap-1 max-h-[200px] overflow-y-auto sm:grid-cols-12 md:grid-cols-14">
                    {filteredIcons.map(id => (
                      <button
                        key={id}
                        onClick={() => { setItemId(String(id)); setShowIconPicker(false); }}
                        className={`flex aspect-square items-center justify-center rounded-md border text-[9px] transition-all hover:border-primary hover:bg-primary/10 ${
                          String(id) === itemId ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border/30 bg-background/50'
                        }`}
                        title={`ID: ${id}`}
                      >
                        <img
                          src={`/media/icon/${id}.png`}
                          alt={`${id}`}
                          className="h-6 w-6 object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            el.parentElement!.textContent = String(id);
                          }}
                        />
                      </button>
                    ))}
                  </div>
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
