import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Gift, BarChart3,
  ChevronLeft, Menu, LogOut, Plus, Search, Trash2, Edit, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// Mock Data
const statsData = [
  { name: 'T1', users: 1200, downloads: 3400 },
  { name: 'T2', users: 1800, downloads: 4200 },
  { name: 'T3', users: 2400, downloads: 5100 },
  { name: 'T4', users: 3100, downloads: 6800 },
  { name: 'T5', users: 4200, downloads: 8200 },
  { name: 'T6', users: 5500, downloads: 10400 },
];

const platformData = [
  { name: 'Android', value: 45, color: 'hsl(142, 76%, 36%)' },
  { name: 'iOS', value: 30, color: 'hsl(217, 91%, 60%)' },
  { name: 'PC', value: 25, color: 'hsl(30, 90%, 50%)' },
];

const mockPosts = [
  { id: 1, title: 'Phiên bản 3.0 chính thức ra mắt', status: 'published', date: '28/03/2026', views: 12400 },
  { id: 2, title: 'Giải đấu Vô Địch Mùa Xuân 2026', status: 'published', date: '25/03/2026', views: 8200 },
  { id: 3, title: 'Nhân vật mới: Ultra Instinct', status: 'draft', date: '20/03/2026', views: 0 },
  { id: 4, title: 'Sự kiện Tết Nguyên Đán', status: 'published', date: '15/03/2026', views: 15600 },
  { id: 5, title: 'Cập nhật cân bằng lực lượng', status: 'draft', date: '10/03/2026', views: 0 },
];

const mockUsers = [
  { id: 1, name: 'SonGoku_VN', email: 'goku@mail.com', role: 'admin', joined: '01/01/2025', status: 'active' },
  { id: 2, name: 'Vegeta_Pro', email: 'vegeta@mail.com', role: 'user', joined: '15/02/2025', status: 'active' },
  { id: 3, name: 'Gohan123', email: 'gohan@mail.com', role: 'moderator', joined: '10/03/2025', status: 'active' },
  { id: 4, name: 'Piccolo_X', email: 'piccolo@mail.com', role: 'user', joined: '20/04/2025', status: 'banned' },
  { id: 5, name: 'Krillin_Fan', email: 'krillin@mail.com', role: 'user', joined: '05/05/2025', status: 'active' },
];

const mockGiftcodes = [
  { id: 1, code: 'NGOCRONGVIP', reward: '500 Kim Cương', uses: 1240, maxUses: 5000, status: 'active' },
  { id: 2, code: 'TANTHU2026', reward: '200 KC + Skin SR', uses: 3200, maxUses: 3000, status: 'expired' },
  { id: 3, code: 'MUAXUAN', reward: '300 Kim Cương', uses: 890, maxUses: 2000, status: 'active' },
  { id: 4, code: 'DRAGONBALL7', reward: '1000 KC + SSR', uses: 50, maxUses: 100, status: 'active' },
];

type Tab = 'overview' | 'posts' | 'users' | 'giftcodes';

const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { key: 'posts', label: 'Bài viết', icon: FileText },
  { key: 'users', label: 'Người dùng', icon: Users },
  { key: 'giftcodes', label: 'Giftcode', icon: Gift },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'posts' && <PostsTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'giftcodes' && <GiftcodesTab />}
        </motion.div>
      </main>
    </div>
  );
}

/* ============ OVERVIEW ============ */
function OverviewTab() {
  const stats = [
    { label: 'Tổng người dùng', value: '52,400', change: '+12%', color: 'text-primary' },
    { label: 'Lượt tải hôm nay', value: '1,280', change: '+8%', color: 'text-emerald-500' },
    { label: 'Bài viết', value: '156', change: '+3', color: 'text-blue-500' },
    { label: 'Giftcode hoạt động', value: '12', change: '4 hết hạn', color: 'text-amber-500' },
  ];

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-foreground">Tổng quan</h2>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar Chart - Users & Downloads */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Người dùng & Lượt tải</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Bar dataKey="users" fill="hsl(30, 90%, 50%)" radius={[6, 6, 0, 0]} name="Người dùng" />
              <Bar dataKey="downloads" fill="hsl(15, 85%, 55%)" radius={[6, 6, 0, 0]} name="Lượt tải" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Tăng trưởng người dùng</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Line type="monotone" dataKey="users" stroke="hsl(30, 90%, 50%)" strokeWidth={3} dot={{ fill: 'hsl(30, 90%, 50%)', r: 5 }} name="Người dùng" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Nền tảng tải</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={platformData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                {platformData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[
              { text: 'Bài viết "Phiên bản 3.0" đã được xuất bản', time: '2 phút trước' },
              { text: 'Người dùng mới: Vegeta_Pro đã đăng ký', time: '15 phút trước' },
              { text: 'Giftcode NGOCRONGVIP đã được sử dụng 50 lần', time: '1 giờ trước' },
              { text: 'Báo cáo từ người dùng Piccolo_X', time: '3 giờ trước' },
              { text: 'Sự kiện "Lễ Hội Ngọc Rồng" đã bắt đầu', time: '5 giờ trước' },
            ].map((a, i) => (
              <div key={i} className="flex items-start justify-between gap-4 border-b border-border/50 pb-3 last:border-0">
                <p className="text-sm text-foreground">{a.text}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ POSTS ============ */
function PostsTab() {
  const [search, setSearch] = useState('');
  const filtered = mockPosts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Quản lý bài viết</h2>
        <button className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform">
          <Plus size={16} /> Thêm bài viết
        </button>
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

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tiêu đề</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ngày</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Lượt xem</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(post => (
              <tr key={post.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{post.title}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    post.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {post.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{post.date}</td>
                <td className="px-4 py-3 text-muted-foreground">{post.views.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Eye size={16} /></button>
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"><Edit size={16} /></button>
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ USERS ============ */
function UsersTab() {
  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-primary/10 text-primary',
      moderator: 'bg-blue-500/10 text-blue-500',
      user: 'bg-muted text-muted-foreground',
    };
    return colors[role] || colors.user;
  };

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-foreground">Quản lý người dùng</h2>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tên</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Vai trò</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ngày tham gia</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map(user => (
              <tr key={user.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${roleBadge(user.role)}`}>{user.role}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.joined}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {user.status === 'active' ? 'Hoạt động' : 'Bị cấm'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"><Edit size={16} /></button>
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ GIFTCODES ============ */
function GiftcodesTab() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-foreground">Quản lý Giftcode</h2>
        <button className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition-transform">
          <Plus size={16} /> Tạo Giftcode
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mockGiftcodes.map((gc, i) => (
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
                <p className="mt-1 text-sm text-muted-foreground">{gc.reward}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                gc.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
              }`}>
                {gc.status === 'active' ? 'Hoạt động' : 'Hết hạn'}
              </span>
            </div>

            {/* Usage bar */}
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Đã dùng: {gc.uses.toLocaleString()}</span>
                <span>Tối đa: {gc.maxUses.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((gc.uses / gc.maxUses) * 100, 100)}%` }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                  className={`h-full rounded-full ${gc.uses >= gc.maxUses ? 'bg-destructive' : 'gradient-fire'}`}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Edit size={14} className="mx-auto" />
              </button>
              <button className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
                <Trash2 size={14} className="mx-auto" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
