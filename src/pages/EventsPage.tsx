import { useState, useEffect } from 'react';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Clock, Flame, CalendarX } from 'lucide-react';
import { fetchPosts, type Post } from '@/lib/api';
import bgEvents from '@/assets/bg-events.jpg';
import { useSEO } from '@/lib/seo';

function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState(() => {
    if (!endDate) return 0;
    return Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!endDate) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (remaining <= 0) return 'Đã kết thúc';
  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

function EventCard({ event, index }: { event: Post; index: number }) {
  const countdown = useCountdown(event.event_end);
  const badge = event.badge || 'EVENT';

  // Parse description — lấy text thuần nếu là JSON (Editor.js)
  let desc = event.description;
  try {
    const parsed = JSON.parse(event.description);
    if (parsed.blocks) {
      desc = parsed.blocks
        .filter((b: any) => b.type === 'paragraph')
        .map((b: any) => b.data?.text || '')
        .join(' ')
        .replace(/<[^>]*>/g, '')
        .slice(0, 120);
      if (desc.length >= 120) desc += '...';
    }
  } catch {
    // plain text
    if (desc.length > 120) desc = desc.slice(0, 120) + '...';
  }

  return (
    <AnimatedSection delay={index * 0.1}>
      <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
        <div className="flex items-center justify-between">
          <Flame size={24} className="text-accent" />
          <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${
            badge === 'HOT' ? 'bg-accent/15 text-accent' : badge === 'NEW' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}>{badge}</span>
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{event.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-primary">
          <Clock size={14} />
          <span className="font-mono font-medium">{countdown}</span>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: 'Sự kiện',
    description: 'Sự kiện Thời Đại Ngọc Rồng — Tham gia các sự kiện nổi bật, nhận thưởng cực khủng và trải nghiệm gameplay độc đáo.',
    canonical: '/events',
  });

  useEffect(() => {
    fetchPosts({ category: 1, limit: 50 })
      .then(res => setEvents(res.data))
      .catch(err => console.error('Fetch events error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageBackground src={bgEvents}>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Sự kiện" subtitle="Tham gia ngay để không bỏ lỡ phần thưởng" />

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <CalendarX size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">Chưa có sự kiện nào</p>
              <p className="text-sm">Hãy quay lại sau nhé!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageBackground>
  );
}
