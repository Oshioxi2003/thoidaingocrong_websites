import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import bgNews from '@/assets/bg-news.jpg';
import { fetchPosts, type Post } from '@/lib/api';

const CATEGORY_LABELS: Record<number, string> = { 0: 'Tin tức', 1: 'Sự kiện', 2: 'Hướng dẫn', 3: 'Cập nhật', 4: 'Cộng đồng' };
const TAGS = ['Tất cả', 'Tin tức', 'Sự kiện', 'Hướng dẫn', 'Cập nhật'];
const TAG_TO_CATEGORY: Record<string, string> = { 'Tin tức': '0', 'Sự kiện': '1', 'Hướng dẫn': '2', 'Cập nhật': '3' };
const PER_PAGE = 6;

/** Extract plain text preview from Editor.js JSON or return plain text */
function tryGetPreview(description: string): string {
  try {
    const parsed = JSON.parse(description);
    if (parsed?.blocks) {
      const texts = parsed.blocks
        .filter((b: any) => b.type === 'paragraph' || b.type === 'header')
        .map((b: any) => b.data?.text?.replace(/<[^>]*>/g, '') || '')
        .join(' ');
      return texts.substring(0, 150) || '';
    }
  } catch {
    // plain text
  }
  return description.substring(0, 150);
}

export default function NewsPage() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('Tất cả');
  const [page, setPage] = useState(1);

  const categoryParam = activeTag === 'Tất cả' ? undefined : TAG_TO_CATEGORY[activeTag];

  const { data, isLoading } = useQuery({
    queryKey: ['news', search, categoryParam, page],
    queryFn: () => fetchPosts({
      search: search || undefined,
      category: categoryParam,
      page,
      limit: PER_PAGE,
    }),
  });

  const posts = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <PageBackground src={bgNews}>
    <div className="py-20">
      <div className="container mx-auto px-4">
        <SectionTitle title="Tin tức" subtitle="Tin tức và cập nhật mới nhất" />

        {/* Search & Filter */}
        <AnimatedSection className="mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm..."
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setActiveTag(tag); setPage(1); }}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    activeTag === tag
                      ? 'gradient-fire text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  }`}
                >{tag}</button>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* Loading */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Đang tải...</div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">Chưa có bài viết nào.</div>
        ) : (
          <>
            {/* News Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((item: Post, i: number) => (
                <AnimatedSection key={item.id} delay={i * 0.05}>
                  <Link to={`/news/${item.id}`} className="group block rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                    <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                      {CATEGORY_LABELS[item.category] || 'Khác'}
                    </span>
                    <h3 className="mt-3 font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {tryGetPreview(item.description)}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </Link>
                </AnimatedSection>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                      page === i + 1 ? 'gradient-fire text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >{i + 1}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </PageBackground>
  );
}
