import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, Eye, Edit, Calendar, ArrowLeft, ShieldAlert, Clock, CheckCircle, XCircle } from 'lucide-react';
import { fetchMyPosts, deletePost, type Post } from '@/lib/api';

const CATEGORY_LABELS: Record<number, string> = { 0: 'Tin tức', 1: 'Sự kiện', 2: 'Hướng dẫn', 3: 'Cập nhật', 4: 'Cộng đồng' };

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Chờ duyệt', icon: Clock, className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  approved: { label: 'Đã duyệt', icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-500' },
  rejected: { label: 'Từ chối', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
};

interface UserInfo {
  id: number;
  username: string;
  is_admin: number;
}

export default function MyPostsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['my-posts', user?.id],
    queryFn: () => fetchMyPosts(user!.id),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-posts'] }),
  });

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="text-center">
          <ShieldAlert size={48} className="mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="font-display text-xl font-bold text-foreground">Chưa đăng nhập</h2>
          <p className="mt-2 text-sm text-muted-foreground">Bạn cần đăng nhập để xem bài viết của mình</p>
          <button
            onClick={() => navigate('/auth')}
            className="gradient-fire mt-6 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  const posts = data?.data || [];

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-fire">
              <FileText size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Bài viết của tôi</h1>
              <p className="text-sm text-muted-foreground">{posts.length} bài viết</p>
            </div>
          </div>

          <Link
            to="/create-post?category=community"
            className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            <Plus size={16} />
            Viết bài mới
          </Link>
        </motion.div>

        {/* Post List */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card/60 py-20 text-center backdrop-blur-sm"
          >
            <FileText size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Bạn chưa có bài viết nào</p>
            <p className="mt-1 text-sm text-muted-foreground/70">Hãy bắt đầu viết bài đầu tiên!</p>
            <Link
              to="/create-post?category=community"
              className="gradient-fire mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <Plus size={16} />
              Viết bài ngay
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: Post, i: number) => {
              const statusKey = post.status || 'approved';
              const statusInfo = STATUS_CONFIG[statusKey] || STATUS_CONFIG.approved;
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {CATEGORY_LABELS[post.category] || 'Khác'}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                          <StatusIcon size={11} />
                          {statusInfo.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={11} />
                          {new Date(post.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground line-clamp-1">
                        {post.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                        {tryGetPreview(post.description)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to={`/create-post?edit=${post.id}`}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        title="Sửa bài viết"
                      >
                        <Edit size={16} />
                      </Link>
                      <Link
                        to={`/news/${post.id}`}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Xem bài viết"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        onClick={() => { if (confirm('Xóa bài viết này?')) deleteMutation.mutate(post.id); }}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Xóa bài viết"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
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
  return description.substring(0, 150);
}
