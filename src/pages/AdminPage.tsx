import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Users, Gift, ClipboardCheck,
  ChevronLeft, Menu, LogOut, Plus, Search, Trash2, Edit, Eye, Ban, CheckCircle, X, XCircle, Clock
} from 'lucide-react';
import {
  fetchPosts, deletePost, fetchPendingPosts, approvePost,
  fetchUsers, banUser,
  fetchGiftcodes, createGiftcode, deleteGiftcode,
  type Post, type User, type Giftcode
} from '@/lib/api';

type Tab = 'posts' | 'approval' | 'users' | 'giftcodes';

const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'posts', label: 'Bài viết', icon: FileText },
  { key: 'approval', label: 'Duyệt bài', icon: ClipboardCheck },
  { key: 'users', label: 'Người dùng', icon: Users },
  { key: 'giftcodes', label: 'Giftcode', icon: Gift },
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
        </motion.div>
      </main>
    </div>
  );
}

/* ============ POSTS ============ */
function PostsTab() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-posts', search],
    queryFn: () => fetchPosts({ search: search || undefined, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-posts'] }),
  });

  const posts = data?.data || [];

  const categoryLabels: Record<number, string> = { 0: 'Tin tức', 1: 'Sự kiện', 2: 'Hướng dẫn', 3: 'Cập nhật', 4: 'Cộng đồng' };
  const statusLabels: Record<string, { label: string; className: string }> = {
    pending: { label: 'Chờ duyệt', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    approved: { label: 'Đã duyệt', className: 'bg-emerald-500/10 text-emerald-500' },
    rejected: { label: 'Từ chối', className: 'bg-destructive/10 text-destructive' },
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Quản lý bài viết</h2>
        <Link
          to="/create-post"
          className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform"
        >
          <Plus size={16} /> Thêm bài viết
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
        <Search size={18} className="text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm bài viết..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Chưa có bài viết nào.</div>
      ) : (
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
      )}
    </div>
  );
}

/* ============ APPROVAL ============ */
function ApprovalTab() {
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

  const posts = data?.data || [];

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-foreground">Duyệt bài viết cộng đồng</h2>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500/30" />
          <p className="text-lg font-medium text-muted-foreground">Không có bài viết chờ duyệt</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Tất cả bài viết đã được xử lý</p>
        </div>
      ) : (
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
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, statusFilter],
    queryFn: () => fetchUsers({ search: search || undefined, role: roleFilter, status: statusFilter, limit: 50 }),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, ban }: { id: number; ban: boolean }) => banUser(id, ban),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data || [];

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-foreground">Quản lý người dùng</h2>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Search size={18} className="text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'admin', label: 'Admin' }, { key: 'user', label: 'User' }].map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
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
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key ? 'gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : (
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

  const giftcodes = data?.data || [];

  const isExpired = (gc: Giftcode) => gc.count_left <= 0 || new Date(gc.expired) <= new Date();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Quản lý Giftcode</h2>
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
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo mã..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'Tất cả' }, { key: 'active', label: 'Hoạt động' }, { key: 'expired', label: 'Hết hạn' }].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === f.key ? 'gradient-fire text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
      ) : giftcodes.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">Chưa có giftcode nào.</div>
      ) : (
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
      )}
    </div>
  );
}
