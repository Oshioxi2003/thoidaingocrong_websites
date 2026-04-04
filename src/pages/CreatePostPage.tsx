import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, FileText, ShieldAlert, Calendar } from 'lucide-react';
import type { OutputData } from '@editorjs/editorjs';
import Editor from '@/components/shared/Editor';
import { createPost, updatePost, fetchPost } from '@/lib/api';

const ALL_CATEGORIES: Record<number, string> = {
  0: 'Tin tức',
  1: 'Sự kiện',
  2: 'Hướng dẫn',
  3: 'Cập nhật',
  4: 'Cộng đồng',
};

// Admin-only categories (0-3), users can only post in category 4
const ADMIN_ONLY_CATEGORIES = [0, 1, 2, 3];

interface UserInfo {
  id: number;
  username: string;
  is_admin: number;
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(4); // default to Cộng đồng
  const [editorData, setEditorData] = useState<OutputData | null>(null);
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [badge, setBadge] = useState('HOT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit mode
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const [editLoading, setEditLoading] = useState(false);
  const [initialData, setInitialData] = useState<OutputData | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);

  // Load post data for edit mode
  useEffect(() => {
    if (editId && user) {
      setEditLoading(true);
      fetchPost(Number(editId))
        .then((post) => {
          setTitle(post.title);
          setCategory(post.category);
          setEventStart(post.event_start ? post.event_start.slice(0, 16) : '');
          setEventEnd(post.event_end ? post.event_end.slice(0, 16) : '');
          setBadge(post.badge || 'HOT');

          // Parse description as Editor.js data
          try {
            const parsed = JSON.parse(post.description);
            if (parsed?.blocks) {
              setInitialData(parsed);
              setEditorData(parsed);
            }
          } catch {
            // Plain text fallback
            setInitialData({
              time: Date.now(),
              blocks: [{ type: 'paragraph', data: { text: post.description } }],
              version: '2.28.0',
            });
          }
        })
        .catch((err) => setError(err.message || 'Không thể tải bài viết'))
        .finally(() => setEditLoading(false));
    }
  }, [editId, user]);

  // If from community page, default category = 4
  useEffect(() => {
    if (!isEditMode && searchParams.get('category') === 'community') {
      setCategory(4);
    }
  }, [searchParams, isEditMode]);

  const isAdmin = user?.is_admin === 1;

  // Categories this user can post in
  const availableCategories = isAdmin
    ? ALL_CATEGORIES
    : { 4: 'Cộng đồng' };

  const handleEditorChange = useCallback((data: OutputData) => {
    setEditorData(data);
  }, []);

  const handlePublish = async () => {
    if (!user) {
      setError('Vui lòng đăng nhập để đăng bài');
      return;
    }
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!editorData || editorData.blocks.length === 0) {
      setError('Vui lòng nhập nội dung bài viết');
      return;
    }
    if (!isAdmin && ADMIN_ONLY_CATEGORIES.includes(category)) {
      setError('Bạn chỉ có quyền đăng bài trong mục Cộng đồng');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const description = JSON.stringify(editorData);

      if (isEditMode) {
        // Update existing post
        await updatePost(Number(editId), {
          title,
          description,
          category,
          author_id: user.id,
          is_admin: isAdmin,
          event_start: category === 1 && eventStart ? eventStart : undefined,
          event_end: category === 1 && eventEnd ? eventEnd : undefined,
          badge: category === 1 ? badge : undefined,
        });
      } else {
        // Create new post
        const postData: any = {
          title,
          description,
          category,
          author_id: user.id,
          author_name: user.username,
          is_admin: isAdmin,
        };
        if (category === 1) {
          if (eventEnd) postData.event_end = eventEnd;
          if (eventStart) postData.event_start = eventStart;
          postData.badge = badge;
        }
        await createPost(postData);
      }

      if (category === 4) {
        navigate('/community');
      } else {
        navigate('/news');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="text-center">
          <ShieldAlert size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="font-display text-xl font-bold text-foreground">Chưa đăng nhập</h2>
          <p className="mt-2 text-sm text-muted-foreground">Bạn cần đăng nhập để đăng bài viết</p>
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

  if (editLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pt-16">
        <div className="text-center text-muted-foreground">Đang tải bài viết...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>

          <button
            onClick={handlePublish}
            disabled={loading}
            className="gradient-fire inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? (
              <motion.div
                className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <Send size={16} />
            )}
            {loading ? (isEditMode ? 'Đang lưu...' : 'Đang đăng...') : (isEditMode ? 'Lưu thay đổi' : 'Đăng bài')}
          </button>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Post form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Page title indicator */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-fire">
              <FileText size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {isEditMode ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditMode
                  ? 'Cập nhật nội dung bài viết'
                  : isAdmin ? 'Đăng bài với quyền quản trị viên' : 'Chia sẻ bài viết với cộng đồng'}
              </p>
            </div>
          </div>

          {/* Status notice for pending posts */}
          {isEditMode && !isAdmin && category === 4 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Bài viết cộng đồng cần được admin duyệt trước khi hiển thị công khai.
            </div>
          )}

          {/* Title input */}
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề bài viết..."
              className="w-full rounded-2xl border border-border bg-card px-6 py-4 font-display text-xl font-bold text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Category select */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">Danh mục:</span>
            {Object.entries(availableCategories).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setCategory(Number(k))}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  category === Number(k)
                    ? 'gradient-fire text-primary-foreground shadow-glow'
                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {v}
              </button>
            ))}
            {!isAdmin && (
              <span className="text-xs text-muted-foreground italic ml-2">
                (Chỉ admin mới có thể đăng Tin tức, Sự kiện, Hướng dẫn, Cập nhật)
              </span>
            )}
          </div>

          {/* Event fields (only for category 1 - Sự kiện) */}
          {category === 1 && isAdmin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Calendar size={16} />
                Thông tin sự kiện
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={eventStart}
                    onChange={e => setEventStart(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    value={eventEnd}
                    onChange={e => setEventEnd(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Badge</label>
                <div className="flex gap-2">
                  {['HOT', 'NEW', 'EVENT'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBadge(b)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                        badge === b
                          ? b === 'HOT' ? 'bg-accent/20 text-accent ring-2 ring-accent/40'
                          : b === 'NEW' ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
                          : 'bg-muted text-foreground ring-2 ring-foreground/20'
                          : 'bg-muted text-muted-foreground hover:bg-primary/10'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Editor.js */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Nội dung bài viết</label>
            {/* Key forces remount when initialData changes */}
            <Editor
              key={isEditMode ? `edit-${editId}` : 'create'}
              data={initialData}
              onChange={handleEditorChange}
              placeholder="Bắt đầu viết nội dung bài viết tại đây..."
              postId={isEditMode ? Number(editId) : undefined}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
