import { Link } from 'react-router-dom';
import logo from '@/assets/logo.png';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <img src={logo} alt="Logo" className="mb-4 h-10" />
            <p className="text-sm text-muted-foreground">
              Thời Đại Ngọc Rồng — Game nhập vai hành động hấp dẫn nhất.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Khám phá</h4>
            <div className="flex flex-col gap-2">
              {[['Trang chủ', '/'], ['Hướng dẫn', '/guides'], ['Tải game', '/download']].map(([label, to]) => (
                <Link key={to} to={to} className="text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Cộng đồng</h4>
            <div className="flex flex-col gap-2">
              {[['Tin tức', '/news'], ['Sự kiện', '/events'], ['Cộng đồng', '/community']].map(([label, to]) => (
                <Link key={to} to={to} className="text-sm text-muted-foreground transition-colors hover:text-primary">{label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm font-semibold text-foreground">Liên hệ</h4>
            <p className="text-sm text-muted-foreground">support@thoidaingocrong.com</p>
            <p className="mt-1 text-sm text-muted-foreground">Facebook: /thoidaingocrong</p>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2026 Thời Đại Ngọc Rồng. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
