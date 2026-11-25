'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Download, Smartphone, ExternalLink, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PlatformBridge() {
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosInstallHint, setIosInstallHint] = useState(false);
  const [inAppBrowserHint, setInAppBrowserHint] = useState(false);
  const [dismissedInstall, setDismissedInstall] = useState(true);

  useEffect(() => {
    // 1. ลงทะเบียน Service Worker เพื่อให้ติดตั้งเป็นแอปได้ทุกแพลตฟอร์ม (Android / iOS / Windows / macOS / Chromebook)
    if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 2. ตรวจจับสถานะอินเทอร์เน็ต (Online / Offline)
    const syncOnline = () => setIsOffline(!navigator.onLine);
    syncOnline();
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);

    // 3. ตรวจจับแพลตฟอร์ม: LINE / Facebook In-App Browser (พบบ่อยมากในโรงเรียนไทย)
    const ua = navigator.userAgent || '';
    const isLineOrSocial = /Line\/|FBAN|FBAV|Instagram/i.test(ua);
    if (isLineOrSocial && !sessionStorage.getItem('tus_dismiss_inapp')) {
      setInAppBrowserHint(true);
    }

    // 4. ตรวจจับการติดตั้งเป็นแอป (PWA) สำหรับ Android / Desktop และ iOS Safari
    const alreadyStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as unknown as { standalone?: boolean }).standalone);

    const dismissedBefore = localStorage.getItem('tus_dismiss_install') === '1';
    setDismissedInstall(dismissedBefore);

    const isIosSafari = /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|Line\//i.test(ua);
    if (isIosSafari && !alreadyStandalone && !dismissedBefore) {
      setIosInstallHint(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissedInstall(true);
    }
  }

  function dismissInstall() {
    setDismissedInstall(true);
    setIosInstallHint(false);
    localStorage.setItem('tus_dismiss_install', '1');
  }

  return (
    <>
      {/* แถบแจ้งเตือนเมื่ออินเทอร์เน็ตหลุด */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-[85] bg-[var(--color-danger)] text-white px-4 py-2 text-center text-sm font-heading font-semibold flex items-center justify-center gap-2 shadow-lg"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>ขณะนี้ออฟไลน์ — กรุณาตรวจสอบ Wi-Fi หรืออินเทอร์เน็ตมือถือเพื่อบันทึกข้อมูล</span>
        </div>
      )}

      {/* คำแนะนำเมื่อนักเรียนเปิดลิงก์จากในแอป LINE / Facebook */}
      {inAppBrowserHint && (
        <div className="bg-[var(--color-primary-soft)] border-b border-[var(--color-primary-border)] px-4 py-2.5 text-xs sm:text-sm text-[var(--color-primary)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>
                คุณกำลังเปิดผ่านเบราว์เซอร์ในแอป LINE/Facebook — แนะนำแตะเมนูมุมขวาแล้วเลือก{' '}
                <strong>“เปิดด้วยเบราว์เซอร์เริ่มต้น (Chrome / Safari)”</strong> เพื่อใช้ไมค์ AI และอัปโหลดรูปได้เต็มที่
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setInAppBrowserHint(false);
                sessionStorage.setItem('tus_dismiss_inapp', '1');
              }}
              className="p-1 rounded-lg hover:bg-black/10 cursor-pointer shrink-0"
              aria-label="ปิดคำแนะนำ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* แบนเนอร์ติดตั้งเป็นแอปลงหน้าจอ (Android / Windows / macOS / Chromebook / iOS) */}
      {!dismissedInstall && (deferredPrompt || iosInstallHint) && (
        <div className="fixed bottom-20 md:bottom-5 left-4 z-40 max-w-sm animate-scale-pop">
          <div className="tus-card p-3.5 shadow-xl border-2 border-[var(--color-primary-border)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-heading font-bold text-sm text-[var(--text-primary)]">
                ติดตั้ง TUS Classroom Plus
              </div>
              {deferredPrompt ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  เปิดใช้งานได้เร็วเหมือนแอปบนมือถือและคอมพิวเตอร์
                </p>
              ) : (
                <p className="text-xs text-[var(--text-secondary)]">
                  บน iPhone/iPad: แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="btn-primary-3d btn-compact-3d !px-3"
                >
                  <Download className="w-4 h-4" /> ติดตั้ง
                </button>
              )}
              <button
                type="button"
                onClick={dismissInstall}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
                aria-label="ปิดป้ายติดตั้งแอป"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
