'use client';

import { RefreshCw, Home, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="tus-card p-8 max-w-md w-full text-center space-y-4 border-2 border-[var(--color-danger)] animate-scale-pop">
        <AlertCircle className="w-12 h-12 text-[var(--color-danger)] mx-auto" />
        <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
          เกิดข้อผิดพลาดชั่วคราว
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          ไม่สามารถแสดงผลหน้านี้ได้ในขณะนี้ กรุณากดลองโหลดใหม่หรือกลับหน้าแรก
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button type="button" onClick={() => reset()} className="btn-primary-3d">
            <RefreshCw className="w-4 h-4" /> ลองโหลดใหม่
          </button>
          <Link href="/" className="btn-secondary-3d">
            <Home className="w-4 h-4" /> หน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  );
}
