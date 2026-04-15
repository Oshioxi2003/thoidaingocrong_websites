import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { MessageCircle, Users, ExternalLink, Plus, Calendar, ChevronRight } from 'lucide-react';
import bgCommunity from '@/assets/bg-community.jpg';
import { fetchPosts, type Post } from '@/lib/api';
import { useSEO, getPostUrl } from '@/lib/seo';

const communities = [
  { name: 'Facebook Group', desc: 'Tham gia cộng đồng 50.000+ thành viên trên Facebook', url: 'https://www.facebook.com/thoidaingocrong/', icon: Users, members: '50K+' },
  { name: 'Zalo Group', desc: 'Chat trực tiếp, tìm đội, chia sẻ chiến thuật', url: 'https://zalo.me/g/uytblh319', icon: MessageCircle, members: '25K+' },
  { name: 'YouTube Channel', desc: 'Xem gameplay, hướng dẫn và livestream hàng tuần', url: 'https://www.youtube.com/@huymetv007', icon: ExternalLink, members: '100K+' },
];

interface UserInfo {
  id: number;
  username: string;
  is_admin: number;
}

export default function CommunityPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useSEO({
    title: 'Cộng đồng',
    description: 'Cộng đồng Thời Đại Ngọc Rồng — Kết nối với hàng nghìn chiến binh, chia sẻ kinh nghiệm, chiến thuật và tham gia thảo luận.',
    canonical: '/community',
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);

  // Fetch community posts (category = 4)
  const { data, isLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => fetchPosts({ category: 4, limit: 20 }),
  });

  const posts = data?.data || [];

  return (
    <PageBackground src={bgCommunity}>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Cộng đồng" subtitle="Kết nối với hàng nghìn chiến binh" />

          {/* Community Links */}
          <div className="mb-16 grid gap-6 md:grid-cols-3">
            {communities.map((c, i) => (
              <AnimatedSection key={c.name} delay={i * 0.1}>
                <a href={c.url} className="group block rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                  <c.icon size={40} className="mx-auto mb-4 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-foreground">{c.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
                  <span className="mt-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">{c.members} thành viên</span>
                </a>
              </AnimatedSection>
            ))}
          </div>

          {/* Community Posts */}
          <AnimatedSection>
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-foreground">Bài viết cộng đồng</h3>
                {user ? (
                  <Link
                    to="/create-post?category=community"
                    className="gradient-fire inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
                  >
                    <Plus size={16} />
                    Đăng bài
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Đăng nhập để đăng bài
                  </Link>
                )}
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">Đang tải bài viết...</div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card/60 py-16 text-center backdrop-blur-sm">
                  <MessageCircle size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Chưa có bài viết nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post: Post, i: number) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={getPostUrl(post.id, post.title)}
                        className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/20 hover:shadow-glow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {post.title}
                            </h4>
                            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                              {tryGetPreview(post.description)}
                            </p>
                          </div>
                          <ChevronRight size={18} className="mt-1 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(post.created_at).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            Cộng đồng
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>

          {/* CTA */}
          <AnimatedSection className="mt-16 text-center">
            <div className="mx-auto max-w-md rounded-2xl gradient-fire p-8 shadow-glow">
              <Users size={32} className="mx-auto mb-3 text-primary-foreground" />
              <h3 className="font-display text-xl font-bold text-primary-foreground">Tham gia ngay!</h3>
              <p className="mt-2 text-sm text-primary-foreground/80">Cùng nhau chiến đấu và chia sẻ niềm vui</p>
              <a href="https://zalo.me/g/uytblh319" className="mt-4 inline-block rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-105">
                Vào Zalo
              </a>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </PageBackground>
  );
}

/** Try to extract a text preview from Editor.js JSON or plain text */
function tryGetPreview(description: string): string {
  try {
    const parsed = JSON.parse(description);
    if (parsed?.blocks) {
      const textBlock = parsed.blocks.find((b: any) => b.type === 'paragraph' || b.type === 'header');
      if (textBlock) {
        return textBlock.data.text?.replace(/<[^>]*>/g, '') || '';
      }
    }
  } catch {
    // plain text
  }
  return description.substring(0, 150);
}
