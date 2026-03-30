import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { MessageCircle, Users, ExternalLink } from 'lucide-react';
import bgCommunity from '@/assets/bg-community.jpg';

const communities = [
  { name: 'Facebook Group', desc: 'Tham gia cộng đồng 50.000+ thành viên trên Facebook', url: '#', icon: Users, members: '50K+' },
  { name: 'Discord Server', desc: 'Chat trực tiếp, tìm đội, chia sẻ chiến thuật', url: '#', icon: MessageCircle, members: '25K+' },
  { name: 'YouTube Channel', desc: 'Xem gameplay, hướng dẫn và livestream hàng tuần', url: '#', icon: ExternalLink, members: '100K+' },
];

const posts = [
  { author: 'GokuMaster99', content: 'Vừa đạt lv. 100! Ai muốn cùng farm boss không? 🔥', time: '5 phút trước' },
  { author: 'VegetaPro', content: 'Share team comp cho ai mới chơi: Goku SSR + Vegeta SR + Piccolo R. Ez clear tất cả story mode.', time: '15 phút trước' },
  { author: 'DragonHunter', content: 'Sự kiện Lễ Hội Ngọc Rồng phần thưởng quá xịn! Đã nhận 500 KC miễn phí 💎', time: '1 giờ trước' },
];

export default function CommunityPage() {
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

        {/* Feed */}
        <AnimatedSection>
          <div className="mx-auto max-w-2xl">
            <h3 className="mb-6 font-display text-xl font-semibold text-foreground text-center">Bài viết gần đây</h3>
            <div className="space-y-4">
              {posts.map((post, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-semibold text-primary">{post.author}</span>
                    <span className="text-xs text-muted-foreground">{post.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* CTA */}
        <AnimatedSection className="mt-16 text-center">
          <div className="mx-auto max-w-md rounded-2xl gradient-fire p-8 shadow-glow">
            <Users size={32} className="mx-auto mb-3 text-primary-foreground" />
            <h3 className="font-display text-xl font-bold text-primary-foreground">Tham gia ngay!</h3>
            <p className="mt-2 text-sm text-primary-foreground/80">Cùng nhau chiến đấu và chia sẻ niềm vui</p>
            <a href="#" className="mt-4 inline-block rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-105">
              Vào Discord
            </a>
          </div>
        </AnimatedSection>
      </div>
    </div>
    </PageBackground>
  );
}
