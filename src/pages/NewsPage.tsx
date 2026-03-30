import { useState } from 'react';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const allNews = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: [
    'Phiên bản 3.0 chính thức ra mắt',
    'Giải đấu Vô Địch Mùa Xuân 2026',
    'Nhân vật mới: Ultra Instinct',
    'Sự kiện Tết Nguyên Đán',
    'Cập nhật bản đồ Namek',
    'Top 10 chiến binh mạnh nhất',
    'Hướng dẫn tân thủ chi tiết',
    'Bảo trì máy chủ 30/03',
    'Skin mới: Golden Warrior',
    'Chế độ PvP mới',
    'Cập nhật cân bằng lực lượng',
    'Sự kiện kỷ niệm 1 năm',
  ][i],
  date: `${28 - i}/03/2026`,
  tag: ['Update', 'Tournament', 'New', 'Event', 'Update', 'Guide', 'Guide', 'Notice', 'New', 'Feature', 'Update', 'Event'][i],
  excerpt: 'Khám phá những thay đổi mới nhất trong thế giới Ngọc Rồng với những tính năng đột phá...',
}));

const TAGS = ['Tất cả', 'Update', 'Tournament', 'New', 'Event', 'Guide', 'Notice', 'Feature'];
const PER_PAGE = 6;

export default function NewsPage() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('Tất cả');
  const [page, setPage] = useState(1);

  const filtered = allNews.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = activeTag === 'Tất cả' || n.tag === activeTag;
    return matchSearch && matchTag;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
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

        {/* News Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paged.map((item, i) => (
            <AnimatedSection key={item.id} delay={i * 0.05}>
              <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">{item.tag}</span>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
                <p className="mt-3 text-xs text-muted-foreground">{item.date}</p>
              </div>
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
      </div>
    </div>
  );
}
