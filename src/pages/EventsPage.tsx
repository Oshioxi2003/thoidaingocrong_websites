import { useState, useEffect } from 'react';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import { Clock, Flame } from 'lucide-react';

const events = [
  { id: 1, title: 'Lễ Hội Ngọc Rồng', desc: 'Nhận x2 phần thưởng mỗi ngày đăng nhập, quay thưởng miễn phí và nhiều vật phẩm giá trị.', badge: 'HOT', endsIn: 3 * 24 * 3600 },
  { id: 2, title: 'Đua Top Máy Chủ', desc: 'Top 1 nhận vật phẩm huyền thoại SSR. Top 10 nhận giftcode VIP.', badge: 'NEW', endsIn: 7 * 24 * 3600 },
  { id: 3, title: 'Check-in 7 ngày', desc: 'Tích lũy phần thưởng mỗi ngày. Ngày thứ 7 nhận nhân vật SR miễn phí!', badge: 'EVENT', endsIn: 5 * 24 * 3600 },
  { id: 4, title: 'Thử thách Boss Thế Giới', desc: 'Hợp tác cùng đồng đội tiêu diệt Boss để nhận phần thưởng cực khủng.', badge: 'HOT', endsIn: 2 * 24 * 3600 },
];

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const interval = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(interval);
  }, []);
  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

function EventCard({ event, index }: { event: typeof events[0]; index: number }) {
  const countdown = useCountdown(event.endsIn);
  return (
    <AnimatedSection delay={index * 0.1}>
      <div className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
        <div className="flex items-center justify-between">
          <Flame size={24} className="text-accent" />
          <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${
            event.badge === 'HOT' ? 'bg-accent/15 text-accent' : event.badge === 'NEW' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}>{event.badge}</span>
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{event.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{event.desc}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-primary">
          <Clock size={14} />
          <span className="font-mono font-medium">{countdown}</span>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default function EventsPage() {
  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <SectionTitle title="Sự kiện" subtitle="Tham gia ngay để không bỏ lỡ phần thưởng" />
        <div className="grid gap-6 md:grid-cols-2">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
