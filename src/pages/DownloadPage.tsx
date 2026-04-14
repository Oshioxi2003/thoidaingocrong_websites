import AnimatedSection from '@/components/shared/AnimatedSection';
import SectionTitle from '@/components/shared/SectionTitle';
import PageBackground from '@/components/shared/PageBackground';
import { Smartphone, Monitor, Apple, Download, ExternalLink, Shield, Zap, Star, Coffee } from 'lucide-react';
import bgDownload from '@/assets/bg-download.jpg';
import { useSEO } from '@/lib/seo';

const GOOGLE_DRIVE = 'https://drive.google.com/drive/folders/1RPsdAu7aQXTR5bA_RUnsqaE2nOO1x7M-?usp=sharing';
const IOS_TESTFLIGHT = 'https://testflight.apple.com/join/KSvswayS';

// QR code URLs (dùng API miễn phí)
const qrApi = (url: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

const platforms = [
  {
    icon: Apple,
    name: 'iOS',
    version: 'iOS 14.0+',
    size: '520 MB',
    link: IOS_TESTFLIGHT,
    color: 'from-gray-700 to-gray-900',
    glow: 'shadow-[0_0_30px_rgba(255,255,255,0.1)]',
    badge: 'TestFlight',
    external: true,
  },
  {
    icon: Smartphone,
    name: 'Android',
    version: 'Android 8.0+',
    size: '61.8 MB',
    link: GOOGLE_DRIVE,
    color: 'from-green-500 to-emerald-700',
    glow: 'shadow-[0_0_30px_rgba(34,197,94,0.2)]',
    badge: 'APK',
    external: true,
  },
  {
    icon: Monitor,
    name: 'PC',
    version: 'Windows 10+',
    size: '56.4 MB',
    link: GOOGLE_DRIVE,
    color: 'from-blue-500 to-indigo-700',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    badge: 'RAR',
    external: true,
  },
  {
    icon: Coffee,
    name: 'Java',
    version: 'Java Phone',
    size: '5 MB',
    link: GOOGLE_DRIVE,
    color: 'from-orange-500 to-red-700',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.2)]',
    badge: 'JAR',
    external: true,
  },
];

const features = [
  { icon: Shield, text: 'An toàn & bảo mật', desc: 'Không chứa mã độc' },
  { icon: Zap, text: 'Cài đặt nhanh', desc: 'Dung lượng nhỏ gọn' },
  { icon: Star, text: 'Cập nhật mới nhất', desc: 'Phiên bản ổn định' },
];

export default function DownloadPage() {
  useSEO({
    title: 'Tải Game',
    description: 'Tải Thời Đại Ngọc Rồng miễn phí cho Android, iOS và PC. Cài đặt nhanh chóng, bảo mật và luôn cập nhật phiên bản mới nhất.',
    canonical: '/download',
  });

  return (
    <PageBackground src={bgDownload}>
      <div className="py-20">
        <div className="container mx-auto px-4">
          <SectionTitle title="Tải Game" subtitle="Chọn nền tảng và bắt đầu cuộc phiêu lưu" />

          {/* Features bar */}
          <AnimatedSection className="mb-12">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-8">
              {features.map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <f.icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{f.text}</p>
                    <p className="text-xs">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* Platform cards */}
          <div className="mb-16 grid gap-8 md:grid-cols-4">
            {platforms.map((p, i) => (
              <AnimatedSection key={p.name} delay={i * 0.15}>
                <div className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center transition-all duration-500 hover:border-primary/40 hover:-translate-y-2 ${p.glow} hover:shadow-glow`}>
                  {/* Badge */}
                  <div className="absolute right-4 top-4">
                    <span className={`inline-block rounded-full bg-gradient-to-r ${p.color} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white`}>
                      {p.badge}
                    </span>
                  </div>

                  {/* Decorative gradient orb */}
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${p.color} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-20`} />

                  {/* Icon */}
                  <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${p.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <p.icon size={36} className="text-white" />
                  </div>

                  <h3 className="font-display text-2xl font-bold text-foreground">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.version}</p>

                  <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span className="rounded-lg bg-muted/50 px-3 py-1">{p.size}</span>
                  </div>

                  <a
                    href={p.link}
                    target={p.external ? '_blank' : undefined}
                    rel={p.external ? 'noopener noreferrer' : undefined}
                    download={!p.external ? true : undefined}
                    className={`mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${p.color} px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                  >
                    {p.name === 'iOS' ? (
                      <>
                        <ExternalLink size={18} />
                        Mở TestFlight
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Tải xuống
                      </>
                    )}
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Instructions */}
          <AnimatedSection className="mb-16">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/80 p-8 backdrop-blur-md">
              <h3 className="mb-6 text-center font-display text-xl font-bold text-foreground">
                📋 Hướng dẫn cài đặt
              </h3>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary">iOS</h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    <li>Nhấn &quot;Mở TestFlight&quot;</li>
                    <li>Cài đặt ứng dụng TestFlight (nếu chưa có)</li>
                    <li>Chấp nhận lời mời thử nghiệm</li>
                    <li>Cài đặt và mở game</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary">Android</h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    <li>Tải file APK về máy</li>
                    <li>Cho phép cài từ &quot;Nguồn không xác định&quot;</li>
                    <li>Mở file APK và cài đặt</li>
                    <li>Mở game và đăng nhập</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary">PC</h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    <li>Tải file RAR về máy</li>
                    <li>Giải nén bằng WinRAR / 7-Zip</li>
                    <li>Chạy file .exe trong thư mục</li>
                    <li>Đăng nhập và chơi game</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-primary">Java</h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    <li>Tải file JAR về máy</li>
                    <li>Cài Java trên điện thoại</li>
                    <li>Mở file JAR bằng Java</li>
                    <li>Đăng nhập và chơi game</li>
                  </ol>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* QR Codes */}
          <AnimatedSection>
            <h3 className="mb-8 text-center font-display text-xl font-bold text-foreground">
              Quét mã QR để tải nhanh
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {/* iOS QR */}
              <div className="flex flex-col items-center rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-md">
                <img
                  src={qrApi(IOS_TESTFLIGHT)}
                  alt="QR iOS TestFlight"
                  width={160}
                  height={160}
                  className="rounded-lg bg-white p-2"
                />
                <div className="mt-3 flex items-center gap-2">
                  <Apple size={18} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">iOS (TestFlight)</span>
                </div>
              </div>
              {/* Google Drive QR */}
              <div className="flex flex-col items-center rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-md">
                <img
                  src={qrApi(GOOGLE_DRIVE)}
                  alt="QR Google Drive"
                  width={160}
                  height={160}
                  className="rounded-lg bg-white p-2"
                />
                <div className="mt-3 flex items-center gap-2">
                  <Smartphone size={18} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Tải Game (Google Drive)</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Dùng camera hoặc ứng dụng quét QR trên điện thoại
            </p>
          </AnimatedSection>
        </div>
      </div>
    </PageBackground>
  );
}
