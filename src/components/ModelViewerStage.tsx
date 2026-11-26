'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Image as ImageIcon,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3d,
  Sparkles,
  Focus
} from 'lucide-react';
import type { LabHotspot } from '@/lib/interactive-labs-data';

interface ModelViewerStageProps {
  chapterTitle: string;
  modelUrl: string;
  posterUrl: string;
  hotspots: LabHotspot[];
  activeHotspotId: string | null;
  onSelectHotspot: (id: string) => void;
  activeAnimationName?: string;
}

type ModelViewerEl = HTMLElement & {
  availableAnimations?: string[];
  paused?: boolean;
  play?: () => void;
  pause?: () => void;
  cameraOrbit?: string;
  cameraTarget?: string;
  animationName?: string;
};

declare global {
  interface Window {
    __tusModelViewerLoaded?: boolean;
  }
}

export function ModelViewerStage({
  chapterTitle,
  modelUrl,
  posterUrl,
  hotspots,
  activeHotspotId,
  onSelectHotspot,
  activeAnimationName
}: ModelViewerStageProps) {
  const viewerRef = useRef<ModelViewerEl | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [scriptReady, setScriptReady] = useState(false);
  const [hasGlb, setHasGlb] = useState<boolean | null>(null);
  const [glbError, setGlbError] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hasAnimations, setHasAnimations] = useState(false);
  const [isPlayingAnim, setIsPlayingAnim] = useState(false);

  // Interactive 3D Photoreal Studio Camera State
  const [rotY, setRotY] = useState(0); // -26..+26 deg
  const [rotX, setRotX] = useState(4); // -16..+16 deg
  const [zoom, setZoom] = useState(1); // 1..2.1
  const [panX, setPanX] = useState(0); // % offset when zoomed/focused
  const [panY, setPanY] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocusedPin, setIsFocusedPin] = useState(false);

  const dragStartRef = useRef<{
    x: number;
    y: number;
    rotY: number;
    rotX: number;
    panX: number;
    panY: number;
  } | null>(null);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    if (mq.matches) setAutoOrbit(false);
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setAutoOrbit(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Reset camera cleanly when switching chapters
  useEffect(() => {
    setRotY(0);
    setRotX(4);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setIsFocusedPin(false);
    if (!reducedMotion) setAutoOrbit(true);
  }, [posterUrl, modelUrl, reducedMotion]);

  // Smooth idle studio auto-orbit for 3D photoreal mode
  useEffect(() => {
    if (!autoOrbit || reducedMotion || isDragging || hasGlb || isFocusedPin) return;
    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      setRotY(Math.sin(elapsed * 0.65) * 11);
      setRotX(3 + Math.cos(elapsed * 0.45) * 3.5);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoOrbit, reducedMotion, isDragging, hasGlb, isFocusedPin]);

  // Check whether the .glb file exists in public/models/
  useEffect(() => {
    let active = true;
    setGlbError(false);
    setHasAnimations(false);
    setIsPlayingAnim(false);

    if (!modelUrl || !modelUrl.trim()) {
      setHasGlb(false);
      return;
    }

    fetch(modelUrl, { method: 'HEAD' })
      .then(res => {
        if (!active) return;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        const ok = res.ok && !ct.includes('text/html');
        setHasGlb(ok);
      })
      .catch(() => {
        if (active) setHasGlb(false);
      });

    return () => {
      active = false;
    };
  }, [modelUrl]);

  // Dynamically load Google <model-viewer> when a .glb file is present
  useEffect(() => {
    if (!hasGlb || typeof window === 'undefined') return;
    if (window.customElements?.get('model-viewer') || window.__tusModelViewerLoaded) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector('script[data-tus-model-viewer="1"]');
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
    script.dataset.tusModelViewer = '1';
    script.onload = () => {
      window.__tusModelViewerLoaded = true;
      setScriptReady(true);
    };
    script.onerror = () => setGlbError(true);
    document.head.appendChild(script);
  }, [hasGlb]);

  // Listen for model load / animations / error events on <model-viewer>
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !hasGlb || !scriptReady) return;

    const handleLoad = () => {
      const anims = el.availableAnimations || [];
      if (anims.length > 0) {
        setHasAnimations(true);
        setIsPlayingAnim(!el.paused);
      } else {
        setHasAnimations(false);
      }
    };
    const handleError = () => setGlbError(true);

    el.addEventListener('load', handleLoad);
    el.addEventListener('error', handleError);
    return () => {
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
    };
  }, [hasGlb, scriptReady, modelUrl]);

  // Sync optional animation name when step changes
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !hasAnimations || !activeAnimationName) return;
    const anims = el.availableAnimations || [];
    if (anims.includes(activeAnimationName)) {
      el.animationName = activeAnimationName;
      el.play?.();
      setIsPlayingAnim(true);
    }
  }, [activeAnimationName, hasAnimations]);

  function handleHotspotClick(hs: LabHotspot) {
    onSelectHotspot(hs.id);

    // If real <model-viewer> is active, orbit camera there
    const el = viewerRef.current;
    if (el && hasGlb && !glbError) {
      if (hs.cameraOrbit) el.cameraOrbit = hs.cameraOrbit;
      el.cameraTarget = hs.position;
      return;
    }

    // In 3D Photoreal Studio mode: smoothly zoom, pan & tilt camera toward the clicked hotspot!
    setAutoOrbit(false);
    setIsFocusedPin(true);
    const targetPanX = Math.max(-22, Math.min(22, (50 - hs.x) * 0.55));
    const targetPanY = Math.max(-18, Math.min(18, (50 - hs.y) * 0.5));
    const targetRotY = Math.max(-22, Math.min(22, (hs.x - 50) * 0.42));
    const targetRotX = Math.max(-14, Math.min(14, (50 - hs.y) * 0.28));
    setZoom(1.36);
    setPanX(targetPanX);
    setPanY(targetPanY);
    setRotY(targetRotY);
    setRotX(targetRotX);
  }

  function handleResetCamera() {
    const el = viewerRef.current;
    if (el) {
      el.cameraOrbit = 'auto auto auto';
      el.cameraTarget = 'auto auto auto';
    }
    setRotY(0);
    setRotX(4);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setIsFocusedPin(false);
    if (!reducedMotion) setAutoOrbit(true);
  }

  function handleToggleAnimation() {
    const el = viewerRef.current;
    if (!el || !hasAnimations) return;
    if (isPlayingAnim) {
      el.pause?.();
      setIsPlayingAnim(false);
    } else {
      el.play?.();
      setIsPlayingAnim(true);
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Ignore pointer starts on buttons (hotspots / toolbar)
    if ((e.target as HTMLElement).closest('button')) return;
    // ห้าม setPointerCapture บน touch เพื่อไม่ให้แย่งนิ้วเลื่อนหน้าจอแนวตั้งบน Android/iOS
    if (e.pointerType !== 'touch') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setIsDragging(true);
    setAutoOrbit(false);
    setIsFocusedPin(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY,
      rotX,
      panX,
      panY
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const nextRotY = Math.max(-26, Math.min(26, dragStartRef.current.rotY + dx * 0.16));
    const nextRotX = Math.max(-16, Math.min(16, dragStartRef.current.rotX - dy * 0.12));
    setRotY(nextRotY);
    setRotX(nextRotX);

    if (zoom > 1.05) {
      const nextPanX = Math.max(-26, Math.min(26, dragStartRef.current.panX + dx * 0.08));
      const nextPanY = Math.max(-22, Math.min(22, dragStartRef.current.panY + dy * 0.08));
      setPanX(nextPanX);
      setPanY(nextPanY);
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }

  const show3D = Boolean(hasGlb && scriptReady && !glbError);

  // Dynamic specular reflection & floor shadow position derived from 3D rotation angles
  const glareX = 50 + rotY * 1.9;
  const glareY = 38 - rotX * 2.1;
  const shadowShiftX = -rotY * 0.9;
  const shadowShiftY = rotX * 0.5;

  return (
    <div className="space-y-3">
      {/* 4:3 Interactive 3D Studio Stage */}
      <div
        ref={stageRef}
        onPointerDown={!show3D ? onPointerDown : undefined}
        onPointerMove={!show3D ? onPointerMove : undefined}
        onPointerUp={!show3D ? onPointerUp : undefined}
        onPointerCancel={!show3D ? onPointerUp : undefined}
        className={`relative w-full aspect-[4/3] rounded-3xl overflow-hidden border-2 border-[var(--color-primary-border)] shadow-lg select-none ${
          !show3D ? (isDragging ? 'cursor-grabbing touch-pan-y' : 'cursor-grab touch-pan-y') : ''
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 38%, #FFFFFF 0%, #FBF5F7 58%, #F2DFE7 100%)',
          perspective: '1150px'
        }}
      >
        {/* Subtle Dark Mode Ambient Studio Backdrop */}
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, #35212B 0%, #24151C 62%, #180E13 100%)'
          }}
        />

        {/* Top Left Mode Pill */}
        <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-heading font-bold bg-white/92 dark:bg-neutral-900/85 text-[var(--color-primary)] border border-[var(--color-primary-border)] shadow-sm backdrop-blur-sm">
            {show3D ? (
              <>
                <Box className="w-4 h-4" /> โมเดล 3D สมจริง (หมุน-ซูมได้)
              </>
            ) : (
              <>
                <Move3d className="w-4 h-4" /> มุมมอง 3D สตูดิโอ (ลากหมุน / ซูมได้)
              </>
            )}
          </span>
        </div>

        {/* Top Right Controls Toolbar */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
          {show3D ? (
            <>
              {hasAnimations && (
                <button
                  type="button"
                  onClick={handleToggleAnimation}
                  className="min-h-[42px] px-3 rounded-xl bg-white/95 dark:bg-neutral-900/90 text-[var(--text-primary)] border-2 border-[var(--border-strong)] font-heading font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-sm cursor-pointer hover:border-[var(--color-primary)]"
                >
                  {isPlayingAnim ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlayingAnim ? 'หยุด' : 'เล่น'}
                </button>
              )}
              <button
                type="button"
                onClick={handleResetCamera}
                className="min-h-[42px] px-2.5 rounded-xl bg-white/95 dark:bg-neutral-900/90 text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-sm cursor-pointer hover:border-[var(--color-primary)]"
                title="รีเซ็ตมุมกล้อง"
                aria-label="รีเซ็ตมุมกล้อง"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setAutoOrbit(false);
                  setZoom(z => Math.min(2.1, Number((z + 0.25).toFixed(2))));
                }}
                className="min-h-[40px] w-10 rounded-xl bg-white/92 dark:bg-neutral-900/90 text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-sm cursor-pointer hover:border-[var(--color-primary)] flex items-center justify-center"
                title="ซูมเข้า"
                aria-label="ซูมเข้า"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(z => {
                    const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                    if (next === 1) {
                      setPanX(0);
                      setPanY(0);
                      setIsFocusedPin(false);
                    }
                    return next;
                  });
                }}
                className="min-h-[40px] w-10 rounded-xl bg-white/92 dark:bg-neutral-900/90 text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-sm cursor-pointer hover:border-[var(--color-primary)] flex items-center justify-center"
                title="ซูมออก"
                aria-label="ซูมออก"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFocusedPin(false);
                  setAutoOrbit(v => !v);
                }}
                className={`min-h-[40px] px-2.5 rounded-xl border-2 shadow-sm cursor-pointer inline-flex items-center gap-1 text-xs font-heading font-bold ${
                  autoOrbit
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-white/92 dark:bg-neutral-900/90 text-[var(--text-primary)] border-[var(--border-strong)]'
                }`}
                title={autoOrbit ? 'หยุดหมุนอัตโนมัติ' : 'เปิดหมุนอัตโนมัติ'}
                aria-label="สลับหมุนอัตโนมัติ"
              >
                {autoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{autoOrbit ? 'กำลังหมุน' : 'หมุน 3D'}</span>
              </button>
              <button
                type="button"
                onClick={handleResetCamera}
                className="min-h-[40px] w-10 rounded-xl bg-white/92 dark:bg-neutral-900/90 text-[var(--text-primary)] border-2 border-[var(--border-strong)] shadow-sm cursor-pointer hover:border-[var(--color-primary)] flex items-center justify-center"
                title="รีเซ็ตมุมกล้อง"
                aria-label="รีเซ็ตมุมกล้อง"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {show3D ? (
          // @ts-expect-error -- model-viewer is a standard custom web component loaded dynamically
          <model-viewer
            ref={viewerRef}
            src={modelUrl}
            poster={posterUrl}
            alt={chapterTitle}
            environment-image="neutral"
            exposure="1.0"
            shadow-intensity="1"
            shadow-softness="0.8"
            camera-controls
            touch-action="pan-y"
            auto-rotate={reducedMotion ? undefined : true}
            loading="lazy"
            className="w-full h-full block"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
          >
            {hotspots.map((hs, idx) => {
              const isSelected = activeHotspotId === hs.id;
              return (
                <button
                  key={hs.id}
                  type="button"
                  slot={`hotspot-${hs.id}`}
                  data-position={hs.position}
                  data-normal={hs.normal}
                  onClick={() => handleHotspotClick(hs)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-heading font-bold border-2 shadow-md transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white border-white scale-105'
                      : 'bg-white/95 text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]'
                  }`}
                >
                  {idx + 1}. {hs.label}
                </button>
              );
            })}
            {/* @ts-expect-error -- closing tag for dynamic web component */}
          </model-viewer>
        ) : (
          /* Interactive 3D Parallax Studio Diorama (Drag/Orbit/Tilt/Zoom/Focus!) */
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Layer 0: Ground Turntable Ring & Dynamic Contact Shadow */}
            <div
              className="absolute bottom-[7%] left-1/2 pointer-events-none"
              style={{
                width: '74%',
                height: '18%',
                transform: `translateX(calc(-50% + ${shadowShiftX}px)) translateY(${shadowShiftY}px) rotateX(74deg) scale(${0.92 + (zoom - 1) * 0.2})`,
                transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              <div
                className="w-full h-full rounded-full border-2 border-dashed border-[#B8194F]/30 dark:border-[#F2B31B]/35"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(184,25,79,0.22) 0%, rgba(184,25,79,0.06) 52%, transparent 74%)',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.16)'
                }}
              />
            </div>

            {/* Layer 1 + 2: 3D Transformed Photoreal Subject + Floating Z-Depth Hotspots */}
            <div
              className="relative w-[92%] h-[90%] flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
                transform: `translate3d(${panX}%, ${panY}%, 0) scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                transition: isDragging
                  ? 'none'
                  : autoOrbit && !isFocusedPin
                    ? 'transform 90ms linear'
                    : 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}
            >
              {/* Soft 3D Elevated Plinth Frame */}
              <div
                className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/70 dark:border-white/15 bg-[#FBF5F7] dark:bg-[#24151C]"
                style={{
                  boxShadow: `${-rotY * 1.1}px ${18 + rotX * 0.9}px 36px -8px rgba(105, 16, 48, 0.28)`
                }}
              >
                <img
                  src={posterUrl}
                  alt={chapterTitle}
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />

                {/* Studio Dynamic Specular Light Sheen (tracks 3D tilt angle) */}
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-soft-light"
                  style={{
                    background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.14) 36%, transparent 68%)`
                  }}
                />
              </div>

              {/* Layer 2: Floating 3D Hotspots in Z-Space */}
              {hotspots.map((hs, idx) => {
                const isSelected = activeHotspotId === hs.id;
                return (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => handleHotspotClick(hs)}
                    style={{
                      left: `${hs.x}%`,
                      top: `${hs.y}%`,
                      transform: `translate(-50%, -50%) translateZ(${isSelected ? 48 : 28}px)`
                    }}
                    aria-pressed={isSelected}
                    className={`absolute z-20 min-h-[36px] px-3 py-1 rounded-full text-[13px] sm:text-sm font-heading font-bold border-2 shadow-xl transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F2B31B] ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white border-white scale-110 z-30'
                        : 'bg-white/95 dark:bg-neutral-900/95 text-[var(--color-primary)] border-[var(--color-primary)] hover:scale-105'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-mono font-extrabold ${
                        isSelected ? 'bg-[#F2B31B] text-neutral-950' : 'bg-[var(--color-primary)] text-white'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="hidden sm:inline">{hs.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Center Subtle Drag Hint */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-black/55 text-white text-xs font-heading font-semibold backdrop-blur-sm flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-[#F2B31B]" />
                {isFocusedPin
                  ? 'กำลังซูมดูจุดที่เลือก • กดรีเซ็ตเพื่อดูภาพเต็ม'
                  : 'ลากนิ้วหรือเมาส์เพื่อหมุนดู 3D • กดป้ายหมายเลขเพื่อซูมโฟกัส'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive 3D Angle Turntable Scrubber (Easy 1-thumb rotation on mobile!) */}
      {!show3D && (
        <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-heading font-bold text-[var(--text-primary)] shrink-0">
            <Focus className="w-4 h-4 text-[var(--color-primary)]" />
            <span>เลื่อนหมุนมุมมอง 3D:</span>
            <span className="font-mono text-[var(--color-primary)] w-12 text-right">
              {Math.round(rotY) > 0 ? `+${Math.round(rotY)}°` : `${Math.round(rotY)}°`}
            </span>
          </div>
          <input
            type="range"
            min={-26}
            max={26}
            step={1}
            value={Math.round(rotY)}
            aria-label="เลื่อนหมุนมุมมอง 3D ซ้าย-ขวา"
            onChange={e => {
              setAutoOrbit(false);
              setIsFocusedPin(false);
              setRotY(Number(e.target.value));
            }}
            className="flex-1 accent-[var(--color-primary)] cursor-pointer"
          />
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-[var(--text-muted)] shrink-0">
            <span className="font-mono">ซูม {zoom.toFixed(2)}×</span>
            <span>•</span>
            <span className="font-mono">{modelUrl}</span>
          </div>
        </div>
      )}

      {/* Polite fallback message only when a real .glb failed to load */}
      {glbError && (
        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-sm text-[var(--text-primary)]">
          <ImageIcon className="w-4 h-4 text-[var(--color-gold)] shrink-0 mt-0.5" />
          <span>
            ไม่สามารถโหลดไฟล์โมเดล 3D ได้ในขณะนี้ ระบบจึงสลับเป็นมุมมอง 3D สตูดิโอสำรองพร้อมป้ายกดซูมให้ใช้งานแทนครับ
          </span>
        </div>
      )}
    </div>
  );
}
