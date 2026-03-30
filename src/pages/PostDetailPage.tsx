import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedSection from '@/components/shared/AnimatedSection';
import { ArrowLeft, Calendar, Tag, Clock, Share2, ChevronRight } from 'lucide-react';

const allPosts = Array.from({ length: 12 }, (_, i) => ({
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
  tag: ['Cập nhật', 'Giải đấu', 'Mới', 'Sự kiện', 'Cập nhật', 'Hướng dẫn', 'Hướng dẫn', 'Thông báo', 'Mới', 'Tính năng', 'Cập nhật', 'Sự kiện'][i],
  readTime: `${3 + (i % 5)} phút đọc`,
  cover: `https://images.unsplash.com/photo-${[
    '1534996858221-380b92700493',
    '1542751371-adc38448a05e',
    '1511512578047-dfb367046420',
    '1550745165-9bc0b252726f',
    '1518709268805-4e9042af9f23',
    '1560419015-7c427e8ae5ba',
    '1542751110-97427bbecf20',
    '1535016120-5e2be74746e6',
    '1511882150382-421056c89033',
    '1498736297812-3a08021f206f',
    '1504384308090-c894fdcc538d',
    '1519125323398-675f0ddb6308',
  ][i]}?w=1200&h=600&fit=crop`,
  content: `
## Tổng quan

Chào mừng các chiến binh đến với bản cập nhật mới nhất! Đây là một trong những bản cập nhật lớn nhất từ trước đến nay, mang đến hàng loạt tính năng mới và cải tiến đáng kể.

### Những thay đổi chính

Bản cập nhật này tập trung vào việc nâng cao trải nghiệm người chơi với nhiều cải tiến quan trọng. Chúng tôi đã lắng nghe phản hồi từ cộng đồng và thực hiện những điều chỉnh cần thiết.

- **Hệ thống chiến đấu được cải tiến** với combo mới và hiệu ứng kỹ năng ấn tượng hơn
- **Bản đồ mới** với địa hình đa dạng và nhiều khu vực khám phá
- **Cân bằng nhân vật** dựa trên dữ liệu từ hàng triệu trận đấu
- **Tối ưu hiệu năng** giúp game chạy mượt hơn trên mọi thiết bị

### Chi tiết kỹ thuật

Đội ngũ phát triển đã dành hơn 3 tháng để hoàn thiện bản cập nhật này. Mỗi tính năng đều được kiểm tra kỹ lưỡng trước khi ra mắt.

> "Chúng tôi tin rằng bản cập nhật này sẽ mang đến trải nghiệm tốt nhất cho người chơi" — Đội ngũ phát triển

### Lịch trình triển khai

Bản cập nhật sẽ được triển khai theo giai đoạn để đảm bảo sự ổn định của hệ thống. Giai đoạn 1 bắt đầu từ ngày mai với các tính năng cốt lõi, tiếp theo là giai đoạn 2 với nội dung bổ sung trong tuần sau.

Hãy theo dõi kênh thông báo chính thức để cập nhật thông tin mới nhất!
  `.trim(),
}));

export default function PostDetailPage() {
  const { id } = useParams();
  const post = allPosts.find(p => p.id === Number(id));

  if (!post) {
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

  const related = allPosts.filter(p => p.id !== post.id && p.tag === post.tag).slice(0, 3);
  if (related.length < 3) {
    const extra = allPosts.filter(p => p.id !== post.id && !related.includes(p)).slice(0, 3 - related.length);
    related.push(...extra);
  }

  const contentParagraphs = post.content.split('\n').filter(line => line.trim());

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Cover */}
      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden md:h-[60vh]">
        <motion.img
          src={post.cover}
          alt={post.title}
          className="h-full w-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Back button */}
        <Link
          to="/news"
          className="absolute left-6 top-24 z-20 flex items-center gap-2 rounded-full bg-card/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-card"
        >
          <ArrowLeft size={16} />
          Quay lại
        </Link>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-10">
          <div className="container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="inline-block rounded-full bg-primary/90 px-4 py-1 text-xs font-semibold text-primary-foreground">
                {post.tag}
              </span>
              <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-foreground md:text-5xl">
                {post.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {post.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {post.readTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag size={14} />
                  {post.tag}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <AnimatedSection>
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                NR
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ngọc Rồng Team</p>
                <p className="text-xs text-muted-foreground">Đội ngũ phát triển</p>
              </div>
            </div>
            <button className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Share2 size={14} />
              Chia sẻ
            </button>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <article className="prose prose-lg dark:prose-invert mt-10 max-w-none">
            {contentParagraphs.map((line, i) => {
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
            })}
          </article>
        </AnimatedSection>

        {/* Tags */}
        <AnimatedSection delay={0.2}>
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-border pt-8">
            <span className="text-sm font-medium text-muted-foreground">Tags:</span>
            {[post.tag, 'Ngọc Rồng', 'Game'].map(tag => (
              <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </AnimatedSection>

        {/* Related Posts */}
        <AnimatedSection delay={0.3}>
          <div className="mt-16">
            <h2 className="mb-8 font-display text-2xl font-bold text-foreground">Bài viết liên quan</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item, i) => (
                <Link
                  key={item.id}
                  to={`/news/${item.id}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-glow"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={item.cover}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
                    </div>
                    <div className="p-5">
                      <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                        {item.tag}
                      </span>
                      <h3 className="mt-2 font-display text-sm font-semibold text-foreground line-clamp-2 transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
