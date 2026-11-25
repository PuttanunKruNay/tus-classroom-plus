'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { PrBanner } from '@/types/database';

interface BannerCarouselProps {
  banners: PrBanner[];
  loading?: boolean;
}

export function BannerCarousel({ banners, loading }: BannerCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const timer = setInterval(() => {
      setIdx(prev => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [paused, banners.length]);

  if (loading) {
    return <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[20px] skeleton" />;
  }

  if (!banners.length) {
    return (
      <div className="tus-card p-8 text-center text-[var(--text-secondary)]">
        ยังไม่มีข่าวประชาสัมพันธ์ในขณะนี้
      </div>
    );
  }

  const current = banners[idx % banners.length];

  function goPrev() {
    setIdx(prev => (prev - 1 + banners.length) % banners.length);
  }

  function goNext() {
    setIdx(prev => (prev + 1) % banners.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diff = touchStartX.current - endX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }

  return (
    <section
      aria-label="ข่าวประชาสัมพันธ์โรงเรียน"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') goPrev();
        if (e.key === 'ArrowRight') goNext();
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="tus-card overflow-hidden relative select-none"
    >
      {/* 16:9 บนมือถือ, 21:9 บนคอม + object-fit: contain พร้อมรูปเดียวกันเบลอเป็นพื้นหลัง ไม่ตัดภาพขาด */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-black/90 overflow-hidden">
        <img
          src={current.imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-65 pointer-events-none"
        />
        <img
          key={current.id}
          src={current.imageUrl}
          alt={current.title}
          className="relative z-10 w-full h-full object-contain animate-scale-pop"
        />

        {/* แถบเกรเดียนต์ดำด้านล่างให้อ่านข้อความคมชัด Contrast >= 4.5:1 */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-14 pb-4 px-4 sm:px-6 text-white">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1 min-w-0">
              {current.badge && (
                <span className="inline-block text-xs font-heading font-bold px-2.5 py-0.5 rounded-lg bg-[#B8194F] text-white">
                  {current.badge}
                </span>
              )}
              <h2 className="font-heading font-bold text-base sm:text-xl leading-snug text-white">
                {current.title}
              </h2>
              <p className="text-sm text-white/90 line-clamp-2">{current.subtitle}</p>
            </div>

            {current.linkUrl && (
              <a
                href={current.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-sm font-heading font-semibold border border-white/30 transition"
              >
                อ่านต่อ <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* ปุ่มลูกศรซ้าย-ขวา */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="แบนเนอร์ก่อนหน้า"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center border border-white/25 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="แบนเนอร์ถัดไป"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center border border-white/25 transition cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* จุดบอกหน้าด้านล่าง */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-2.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`ไปยังแบนเนอร์ที่ ${i + 1}`}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                i === idx ? 'w-8 bg-[var(--color-primary)]' : 'w-2.5 bg-[var(--border-strong)] hover:bg-[var(--color-primary)]/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
