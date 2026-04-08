import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import AnimatedSection from '@/components/shared/AnimatedSection';
import { ArrowLeft, Calendar, Tag, Share2, ChevronRight, MessageCircle, Send, Trash2 } from 'lucide-react';
import { fetchPost, fetchPosts, fetchComments, createComment, deleteComment, type Post, type Comment } from '@/lib/api';
import { renderEditorData } from '@/components/shared/Editor';
import { useSEO, generateSlug, extractPostPreview, getPostUrl, SITE_CONFIG } from '@/lib/seo';

const CATEGORY_LABELS: Record<number, string> = { 0: 'Tin tức', 1: 'Sự kiện', 2: 'Hướng dẫn', 3: 'Cập nhật', 4: 'Cộng đồng' };

interface UserInfo {
  id: number;
  username: string;
  is_admin: number;
}

/** Try to parse description as Editor.js JSON, return HTML or null */
function tryRenderEditorContent(description: string): string | null {
  try {
    const parsed = JSON.parse(description);
    if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
      return renderEditorData(parsed);
    }
  } catch {
    // Not JSON - plain text
  }
  return null;
}

export default function PostDetailPage() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPost(Number(id)),
    enabled: !!id,
  });

  // Redirect to slug URL if slug is missing or wrong
  useEffect(() => {
    if (post && post.title) {
      const correctSlug = generateSlug(post.title);
      if (!slug || slug !== correctSlug) {
        navigate(`/news/${post.id}/${correctSlug}`, { replace: true });
      }
    }
  }, [post, slug, navigate]);

  // Related posts (same category)
  const { data: relatedData } = useQuery({
    queryKey: ['related-posts', post?.category],
    queryFn: () => fetchPosts({ category: post?.category, limit: 4 }),
    enabled: !!post,
  });

  // Comments (only for community posts, category 4)
  const isCommunity = post?.category === 4;
  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => fetchComments(Number(id)),
    enabled: !!id && isCommunity,
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => createComment(Number(id), {
      user_id: user!.id,
      username: user!.username,
      content,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId, {
      user_id: user!.id,
      is_admin: user?.is_admin === 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
    },
  });

  // ===== SEO: Dynamic title, meta, JSON-LD =====
  const tag = post ? (CATEGORY_LABELS[post.category] || 'Khác') : '';
  const postPreview = post ? extractPostPreview(post.description) : '';
  const canonicalUrl = post ? `/news/${post.id}/${generateSlug(post.title)}` : undefined;

  useSEO({
    title: post ? post.title : 'Đang tải...',
    description: postPreview,
    ogType: 'article',
    canonical: canonicalUrl,
    jsonLd: post ? {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: postPreview,
      datePublished: post.created_at,
      dateModified: post.created_at,
      author: {
        '@type': 'Person',
        name: post.author_name || 'Ngọc Rồng Team',
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_CONFIG.name,
        url: SITE_CONFIG.domain,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${SITE_CONFIG.domain}${canonicalUrl}`,
      },
      articleSection: tag,
    } : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="mt-2 text-muted-foreground">Bài viết không tồn tại</p>
          <Link to="/news" className="mt-4 inline-block text-primary hover:underline">← Quay lại tin tức</Link>
        </div>
      </div>
    );
  }

  const related = (relatedData?.data || []).filter((p: Post) => p.id !== post.id).slice(0, 3);
  const comments = commentsData?.data || [];

  // Try to render as Editor.js content first, fallback to plain text
  const editorHtml = tryRenderEditorContent(post.description);
  const contentParagraphs = !editorHtml ? post.description.split('\n').filter((line: string) => line.trim()) : [];

  const handleSubmitComment = () => {
    if (!commentText.trim() || !user) return;
    addCommentMutation.mutate(commentText);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero / Breadcrumb */}
      <div className="relative bg-gradient-to-b from-primary/5 to-background px-6 pb-10 pt-24">
        {/* Breadcrumb for SEO */}
        <nav aria-label="Breadcrumb" className="container mx-auto max-w-4xl mb-4 pt-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link to="/" itemProp="item" className="hover:text-primary transition-colors">
                <span itemProp="name">Trang chủ</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <span>/</span>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link to={isCommunity ? '/community' : '/news'} itemProp="item" className="hover:text-primary transition-colors">
                <span itemProp="name">{isCommunity ? 'Cộng đồng' : 'Tin tức'}</span>
              </Link>
              <meta itemProp="position" content="2" />
            </li>
            <span>/</span>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-foreground font-medium truncate max-w-[200px] inline-block align-bottom">{post.title}</span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </nav>

        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <span className="inline-block rounded-full bg-primary/90 px-4 py-1 text-xs font-semibold text-primary-foreground">
              {tag}
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground md:text-5xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <time dateTime={post.created_at} className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(post.created_at).toLocaleDateString('vi-VN')}
              </time>
              <span className="flex items-center gap-1.5">
                <Tag size={14} />
                {tag}
              </span>
              {isCommunity && (
                <span className="flex items-center gap-1.5">
                  <MessageCircle size={14} />
                  {comments.length} bình luận
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <AnimatedSection>
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold uppercase">
                {(post.author_name || 'NR').slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{post.author_name || 'Ngọc Rồng Team'}</p>
                <time dateTime={post.created_at} className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString('vi-VN')}</time>
              </div>
            </div>
            <button className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Chia sẻ bài viết">
              <Share2 size={14} />
              Chia sẻ
            </button>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <article className="prose prose-lg dark:prose-invert mt-10 max-w-none prose-img:rounded-lg prose-img:mx-auto prose-headings:text-foreground prose-a:text-primary">
            {editorHtml ? (
              /* Editor.js content */
              <div dangerouslySetInnerHTML={{ __html: editorHtml }} />
            ) : (
              /* Plain text fallback */
              contentParagraphs.map((line: string, i: number) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('## ')) {
                  return <h2 key={i} className="mt-10 mb-4 font-display text-2xl font-bold text-foreground md:text-3xl">{trimmed.replace('## ', '')}</h2>;
                }
                if (trimmed.startsWith('### ')) {
                  return <h3 key={i} className="mt-8 mb-3 font-display text-xl font-semibold text-foreground">{trimmed.replace('### ', '')}</h3>;
                }
                if (trimmed.startsWith('> ')) {
                  return (
                    <blockquote key={i} className="my-6 border-l-4 border-primary/50 bg-primary/5 py-4 pl-6 pr-4 italic text-muted-foreground rounded-r-xl">
                      {trimmed.replace('> ', '')}
                    </blockquote>
                  );
                }
                if (trimmed.startsWith('- **')) {
                  const match = trimmed.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (match) {
                    return (
                      <div key={i} className="my-2 flex items-start gap-3">
                        <ChevronRight size={16} className="mt-1 shrink-0 text-primary" />
                        <p className="text-foreground/80">
                          <strong className="text-foreground">{match[1]}</strong>{match[2]}
                        </p>
                      </div>
                    );
                  }
                }
                return <p key={i} className="my-4 leading-relaxed text-foreground/80">{trimmed}</p>;
              })
            )}
          </article>
        </AnimatedSection>

        {/* Tags */}
        <AnimatedSection delay={0.2}>
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-border pt-8">
            <span className="text-sm font-medium text-muted-foreground">Tags:</span>
            {[tag, 'Ngọc Rồng', 'Game'].map(t => (
              <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {t}
              </span>
            ))}
          </div>
        </AnimatedSection>

        {/* Comments Section — only for community posts (category 4) */}
        {isCommunity && (
          <AnimatedSection delay={0.25}>
            <section className="mt-12 border-t border-border pt-8" aria-label="Bình luận">
              <h2 className="mb-6 flex items-center gap-2 font-display text-xl font-bold text-foreground">
                <MessageCircle size={22} className="text-primary" />
                Bình luận ({comments.length})
              </h2>

              {/* Comment Input */}
              {user ? (
                <div className="mb-8">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary uppercase">
                      {user.username.slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Viết bình luận..."
                        rows={3}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none resize-none transition-colors"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitComment();
                          }
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Nhấn Enter để gửi, Shift+Enter để xuống dòng</span>
                        <button
                          onClick={handleSubmitComment}
                          disabled={!commentText.trim() || addCommentMutation.isPending}
                          className="gradient-fire inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <Send size={14} />
                          {addCommentMutation.isPending ? 'Đang gửi...' : 'Gửi'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8 rounded-2xl border border-border bg-card/60 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Link to="/auth" className="text-primary hover:underline font-medium">Đăng nhập</Link> để bình luận
                  </p>
                </div>
              )}

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card/40 py-10 text-center">
                  <MessageCircle size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: Comment, i: number) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group flex gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground uppercase">
                        {comment.username.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{comment.username}</span>
                              <time dateTime={comment.created_at} className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString('vi-VN')}
                              </time>
                            </div>
                            {user && (user.id === comment.user_id || user.is_admin === 1) && (
                              <button
                                onClick={() => { if (confirm('Xóa bình luận này?')) deleteCommentMutation.mutate(comment.id); }}
                                className="rounded-lg p-1 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors hover:text-destructive"
                                title="Xóa bình luận"
                                aria-label="Xóa bình luận"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm text-foreground/80 whitespace-pre-wrap break-words">{comment.content}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </AnimatedSection>
        )}

        {/* Related Posts */}
        {related.length > 0 && (
          <AnimatedSection delay={0.3}>
            <section className="mt-16" aria-label="Bài viết liên quan">
              <h2 className="mb-8 font-display text-2xl font-bold text-foreground">Bài viết liên quan</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {related.map((item: Post, i: number) => (
                  <Link
                    key={item.id}
                    to={getPostUrl(item.id, item.title)}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="p-5">
                        <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                          {CATEGORY_LABELS[item.category] || 'Khác'}
                        </span>
                        <h3 className="mt-2 font-display text-sm font-semibold text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                          {item.title}
                        </h3>
                        <time dateTime={item.created_at} className="mt-2 block text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('vi-VN')}
                        </time>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </section>
          </AnimatedSection>
        )}
      </div>
    </main>
  );
}
