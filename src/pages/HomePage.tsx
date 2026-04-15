import { motion } from 'framer-motion';
import { Download, Flame, Newspaper, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import Gallery3DSlider from '@/components/Gallery3DSlider';
import heroCharacter from '@/assets/hero-character.jpg';
import heroBgExtended from '@/assets/hero-bg-extended.jpg';
import { fetchPosts, fetchGallery, type Post } from '@/lib/api';
import { useSEO, getPostUrl } from '@/lib/seo';

const CATEGORY_LABELS: Record<number, string> = { 0: 'Tin tức', 1: 'Sự kiện', 2: 'Hướng dẫn', 3: 'Cập nhật', 4: 'Cộng đồng' };

export default function HomePage() {
  useSEO({
    title: 'Trang chủ',
    description: 'Thời Đại Ngọc Rồng — Game nhập vai hành động lấy cảm hứng từ Dragon Ball. Thu thập Ngọc Rồng, chiến đấu với chiến binh toàn vũ trụ. Tải game miễn phí!',
    canonical: '/',
  });

  const { data: newsData } = useQuery({
    queryKey: ['home-news'],
    queryFn: () => fetchPosts({ limit: 3 }),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['home-events'],
    queryFn: () => fetchPosts({ category: 1, limit: 3 }),
  });

  const { data: galleryData } = useQuery({
    queryKey: ['home-gallery'],
    queryFn: fetchGallery,
  });

  const latestPosts = newsData?.data || [];
  const eventPosts = eventsData?.data || [];
  const galleryImages = galleryData?.data || [];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.img
            src={heroBgExtended}
            alt=""
            className="h-full w-full object-cover"
            animate={{ scale: [1, 1.08, 1], x: [0, -15, 0], y: [0, -10, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            // @ts-ignore — native fetchpriority for LCP
            fetchpriority="high"
          />
          <div className="absolute inset-0 bg-background/30 dark:bg-background/50" />

          {/* Animated energy particles — 6 for perf */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${4 + Math.random() * 6}px`,
                height: `${4 + Math.random() * 6}px`,
                left: `${5 + (i * 16)}%`,
                bottom: `${10 + Math.random() * 40}%`,
                background: `radial-gradient(circle, hsl(30 90% 60% / 0.8), hsl(15 85% 55% / 0))`,
              }}
              animate={{
                y: [0, -120 - Math.random() * 200],
                opacity: [0, 0.9, 0],
                scale: [0.5, 1.2, 0.3],
              }}
              transition={{
                duration: 4 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Pulsing glow overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 60%, hsl(30 90% 50% / 0.08), transparent 70%)' }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="container mx-auto flex min-h-[85vh] flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <motion.img
              src={heroCharacter}
              alt="Hero Character"
              className="mx-auto mb-8 h-64 w-64 rounded-full border-4 border-primary/30 object-cover shadow-glow md:h-80 md:w-80"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              loading="eager"
              decoding="async"
            />
            <h1 className="font-display text-4xl font-bold text-foreground md:text-6xl lg:text-7xl">
              Thời Đại <span className="text-gradient-fire">Ngọc Rồng</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Tham gia cuộc phiêu lưu huyền thoại. Thu thập Ngọc Rồng, chiến đấu với chiến binh toàn vũ trụ.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/download"
                className="gradient-fire inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-display text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                <Download size={18} /> Tải Game Ngay
              </Link>
              <Link
                to="/guides"
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-8 py-4 font-display text-sm font-semibold text-foreground transition-all hover:border-primary/50 hover:shadow-card"
              >
                Khám phá thêm
              </Link>
            </div>
          </motion.div>
        </div>
        {/* Decorative glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* News Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Tin tức mới nhất" subtitle="Cập nhật liên tục từ thế giới Ngọc Rồng" />
          <div className="grid gap-6 md:grid-cols-3">
            {latestPosts.map((item: Post, i: number) => (
              <AnimatedSection key={item.id} delay={i * 0.1}>
                <Link to={getPostUrl(item.id, item.title)} className="group block rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                  <div className="mb-3 flex items-center gap-2">
                    <Newspaper size={16} className="text-primary" />
                    <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">{CATEGORY_LABELS[item.category] || 'Khác'}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="border-t border-border bg-card/50 py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Sự kiện nổi bật" subtitle="Tham gia ngay để nhận thưởng cực khủng" />
          {eventPosts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Chưa có sự kiện nào</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {eventPosts.map((event: Post, i: number) => (
                <AnimatedSection key={event.id} delay={i * 0.1}>
                  <Link to={getPostUrl(event.id, event.title)} className="group block rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                    <div className="mb-3 flex items-center justify-between">
                      <Flame size={20} className="text-accent" />
                      {event.badge && (
                        <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${event.badge === 'HOT' ? 'bg-accent/15 text-accent'
                          : event.badge === 'NEW' ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-foreground'
                          }`}>{event.badge}</span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{event.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {event.event_end
                        ? `Đến ${new Date(event.event_end).toLocaleDateString('vi-VN')}`
                        : new Date(event.created_at).toLocaleDateString('vi-VN')
                      }
                    </p>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Video Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Video giới thiệu" subtitle="Khám phá server NRO cùng HuyMeTV" />
          <AnimatedSection>
            <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border shadow-glow">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube.com/embed/XAsgQmYuBgE"
                  title="Server NRO của HuyMeTV chính thức Open - Cơ chế hay, dame gốc, Free cải trang up ngọc"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <section className="border-t border-border bg-card/50 py-20">
          <div className="container mx-auto px-4">
            <SectionTitle title="Hình ảnh trong Game" subtitle="Trải nghiệm thực tế từ thế giới Ngọc Rồng" />
            <AnimatedSection>
              <Gallery3DSlider images={galleryImages} />
            </AnimatedSection>
          </div>
        </section>
      )}


    </div>
  );
}
