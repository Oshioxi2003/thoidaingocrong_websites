import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Smartphone, Monitor, Apple, QrCode } from 'lucide-react';
import bgDownload from '@/assets/bg-download.jpg';

const platforms = [
  { icon: Smartphone, name: 'Android', version: 'Android 8.0+', size: '450 MB', link: '#' },
  { icon: Apple, name: 'iOS', version: 'iOS 14.0+', size: '520 MB', link: '#' },
  { icon: Monitor, name: 'PC', version: 'Windows 10+', size: '1.2 GB', link: '#' },
];


export default function DownloadPage() {
  return (
    <PageBackground src={bgDownload}>
    <div className="py-20">
      <div className="container mx-auto px-4">
        <SectionTitle title="Tải Game" subtitle="Chọn nền tảng và bắt đầu cuộc phiêu lưu" />

        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {platforms.map((p, i) => (
            <AnimatedSection key={p.name} delay={i * 0.1}>
              <div className="group rounded-2xl border border-border bg-card p-8 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-glow">
                <p.icon size={48} className="mx-auto mb-4 text-primary" />
                <h3 className="font-display text-xl font-bold text-foreground">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.version}</p>
                <p className="mt-1 text-sm text-muted-foreground">Dung lượng: {p.size}</p>
                <a href={p.link} className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-fire px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105">
                  Tải xuống
                </a>
              </div>
            </AnimatedSection>
          ))}
        </div>


        {/* QR Code */}
        <AnimatedSection className="mt-16 text-center">
          <div className="mx-auto inline-flex flex-col items-center rounded-2xl border border-border bg-card p-8">
            <QrCode size={120} className="text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Quét mã QR để tải nhanh</p>
          </div>
        </AnimatedSection>
      </div>
    </div>
    </PageBackground>
  );
}
