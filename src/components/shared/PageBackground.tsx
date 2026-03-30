interface PageBackgroundProps {
  src: string;
  alt?: string;
  children: React.ReactNode;
}

export default function PageBackground({ src, alt = '', children }: PageBackgroundProps) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0">
        <img src={src} alt={alt} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-background/70 dark:bg-background/80" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
