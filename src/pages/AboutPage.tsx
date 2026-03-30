import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Sparkles, Target, Users, Zap } from 'lucide-react';
import bgAbout from '@/assets/bg-about.jpg';

const timeline = [
  { year: '2023', title: 'Ý tưởng ra đời', desc: 'Khởi nguồn từ niềm đam mê Dragon Ball' },
  { year: '2024', title: 'Phát triển Alpha', desc: 'Phiên bản thử nghiệm nội bộ đầu tiên' },
  { year: '2025', title: 'Ra mắt Beta', desc: 'Hơn 100.000 người chơi thử nghiệm' },
  { year: '2026', title: 'Chính thức ra mắt', desc: 'Mở cửa toàn cầu với phiên bản 3.0' },
];

const values = [
  { icon: Sparkles, title: 'Sáng tạo', desc: 'Gameplay độc đáo, không ngừng đổi mới' },
  { icon: Users, title: 'Cộng đồng', desc: 'Xây dựng cộng đồng mạnh mẽ và thân thiện' },
  { icon: Target, title: 'Chất lượng', desc: 'Cam kết trải nghiệm hoàn hảo nhất' },
  { icon: Zap, title: 'Tốc độ', desc: 'Cập nhật nhanh, lắng nghe người chơi' },
];

export default function AboutPage() {
  return (
    <PageBackground src={bgAbout}>
    <div className="py-20">
      <div className="container mx-auto px-4">
        <SectionTitle title="Về Thời Đại Ngọc Rồng" subtitle="Câu chuyện đằng sau thế giới huyền thoại" />

        <AnimatedSection className="mx-auto mb-20 max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-muted-foreground">
            Thời Đại Ngọc Rồng là game nhập vai hành động lấy cảm hứng từ vũ trụ Dragon Ball,
            nơi bạn hóa thân thành chiến binh mạnh mẽ, thu thập Ngọc Rồng và chiến đấu
            bảo vệ vũ trụ khỏi những thế lực bóng tối.
          </p>
        </AnimatedSection>

        {/* Values */}
        <div className="mb-20 grid gap-6 grid-cols-2">
          {values.map((v, i) => (
            <AnimatedSection key={v.title} delay={i * 0.1}>
              <div className="rounded-2xl border border-border bg-card p-6 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                <v.icon size={32} className="mx-auto mb-3 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Timeline */}
        <SectionTitle title="Hành trình phát triển" />
        <div className="mx-auto max-w-2xl">
          {timeline.map((item, i) => (
            <AnimatedSection key={item.year} delay={i * 0.1}>
              <div className="flex gap-6 pb-10 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-fire text-sm font-bold text-primary-foreground">{item.year}</div>
                  {i < timeline.length - 1 && <div className="mt-2 h-full w-px bg-border" />}
                </div>
                <div className="pb-2">
                  <h4 className="font-display text-lg font-semibold text-foreground">{item.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
    </PageBackground>
  );
}
