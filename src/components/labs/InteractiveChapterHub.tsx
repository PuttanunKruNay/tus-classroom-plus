'use client';

import { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle2,
  Lightbulb,
  BookOpenCheck,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  AlertCircle,
  Film,
  Box,
  Download
} from 'lucide-react';
import { CHAPTER_LAB_CONFIGS, type ChapterLabConfig } from '@/lib/interactive-labs-data';
import { ModelViewerStage } from '@/components/ModelViewerStage';
import { Chapter1Lab } from '@/components/labs/Chapter1Lab';
import { Chapter2Lab } from '@/components/labs/Chapter2Lab';
import { Chapter3Lab } from '@/components/labs/Chapter3Lab';
import { Chapter4Lab } from '@/components/labs/Chapter4Lab';
import { Chapter5Lab } from '@/components/labs/Chapter5Lab';
import { Chapter6Lab } from '@/components/labs/Chapter6Lab';

interface InteractiveChapterHubProps {
  lessonId: string;
  customModelUrl?: string;
  customPosterUrl?: string;
  showTeacherNotes?: boolean;
}

export function InteractiveChapterHub({
  lessonId,
  customModelUrl,
  customPosterUrl,
  showTeacherNotes = false
}: InteractiveChapterHubProps) {
  const baseConfig: ChapterLabConfig | undefined = CHAPTER_LAB_CONFIGS[lessonId];

  const [stageMode, setStageMode] = useState<'video' | '3d'>('video');
  const [videoIdx, setVideoIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [quizPicks, setQuizPicks] = useState<Record<number, number>>({});

  // Reset interactive state whenever switching chapters
  useEffect(() => {
    setStepIdx(0);
    setVideoIdx(0);
    setStageMode(baseConfig?.videos?.length ? 'video' : '3d');
    setActiveHotspotId(baseConfig?.hotspots[0]?.id || null);
    setQuizPicks({});
  }, [lessonId, baseConfig]);

  if (!baseConfig) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-center text-sm text-[var(--text-secondary)]">
        ยังไม่มีชุดห้องทดลอง 3 มิติสำหรับบทเรียนนี้ (รองรับบทที่ 1–6 อัตโนมัติ)
      </div>
    );
  }

  const config: ChapterLabConfig = {
    ...baseConfig,
    model: customModelUrl?.trim() || baseConfig.model,
    poster: customPosterUrl?.trim() || baseConfig.poster
  };

  const totalSteps = config.steps.length;
  const activeStep = config.steps[stepIdx % totalSteps];
  const progressPct = Math.round(((stepIdx + 1) / totalSteps) * 100);

  function handleNextStep() {
    setStepIdx(prev => (prev + 1) % totalSteps);
  }

  return (
    <div className="space-y-6">
      {/* ฝังข้อมูล JSON ของบทเรียนเพื่อให้ครูตรวจและนำไปแก้ไข/ต่อยอดได้ง่าย */}
      <script
        type="application/json"
        data-tus-chapter-config={config.lessonId}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            chapter: config.chapter,
            title: config.title,
            model: config.model,
            poster: config.poster,
            hotspots: config.hotspots.map(({ id, position, normal, label, text }) => ({
              id,
              position,
              normal,
              label,
              text
            })),
            steps: config.steps,
            quiz: config.quiz
          })
        }}
      />

      {/* ข้อควรตรวจสอบสำหรับครู (แสดงเฉพาะโหมดครู) */}
      {showTeacherNotes && config.teacherNote && (
        <div className="p-4 rounded-2xl bg-[var(--color-gold-bg)] border-2 border-[var(--color-gold-border)] text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-[var(--color-gold)] shrink-0 mt-0.5" />
          <div>
            <div className="font-heading font-bold text-[var(--color-gold)]">หมายเหตุสำหรับครูผู้สอนก่อนเผยแพร่</div>
            <p className="text-[var(--text-primary)] mt-0.5">{config.teacherNote}</p>
          </div>
        </div>
      )}

      {/* 1. หัวบท + สลับมุมมอง คลิปแอนิเมชัน 3D (Google Flow) vs ภาพ 3D สตูดิโอหมุนดู */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="inline-block text-xs font-heading font-bold px-3 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {config.unitLabel} • สื่อแอนิเมชัน 3 มิติ & กิจกรรม สสวท.
          </span>
          <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">{config.title}</h3>
        </div>

        {config.videos && config.videos.length > 0 && (
          <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setStageMode('video')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-heading font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                stageMode === 'video'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Film className="w-4 h-4" /> คลิป 3D ({config.videos.length} ตอน)
            </button>
            <button
              type="button"
              onClick={() => setStageMode('3d')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs sm:text-sm font-heading font-bold inline-flex items-center gap-1.5 cursor-pointer transition ${
                stageMode === '3d'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <Box className="w-4 h-4" /> ภาพ 3D หมุนดู
            </button>
          </div>
        )}
      </div>

      {/* 2. เวทีแสดงผลหลัก: คลิปแอนิเมชัน 3D 16:9 (Google Flow) หรือ ภาพ 3D สตูดิโอ / <model-viewer> */}
      {stageMode === 'video' && config.videos && config.videos.length > 0 ? (() => {
        const activeVideo = config.videos[videoIdx % config.videos.length];
        return (
          <div className="space-y-3">
            {/* แถบเลือกตอนของคลิปในบทนี้ */}
            <div className="flex flex-wrap gap-2">
              {config.videos.map((clip, idx) => {
                const isSel = idx === videoIdx % config.videos.length;
                return (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => setVideoIdx(idx)}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition text-left ${
                      isSel
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {clip.title}
                  </button>
                );
              })}
            </div>

            {/* โรงภาพยนตร์ 16:9 HD */}
            <div className="rounded-3xl overflow-hidden border-2 border-[var(--color-primary-border)] bg-neutral-950 shadow-xl">
              <video
                key={activeVideo.src}
                src={activeVideo.src}
                poster={config.poster}
                controls
                playsInline
                preload="metadata"
                className="w-full aspect-video block bg-black"
              />
            </div>

            {/* แถบคำอธิบายคลิป + ปุ่มก่อนหน้า/ถัดไป/ดาวน์โหลด */}
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="font-heading font-bold text-sm sm:text-base text-[var(--color-primary)]">
                  ตอนที่ {(videoIdx % config.videos.length) + 1}/{config.videos.length} : {activeVideo.title}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{activeVideo.caption}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setVideoIdx(i => (i - 1 + config.videos.length) % config.videos.length)
                  }
                  className="btn-secondary-3d btn-compact-3d !px-3"
                  aria-label="คลิปก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVideoIdx(i => (i + 1) % config.videos.length)}
                  className="btn-secondary-3d btn-compact-3d !px-3"
                  aria-label="คลิปถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <a
                  href={activeVideo.src}
                  download
                  className="btn-secondary-3d btn-compact-3d"
                  title="ดาวน์โหลดคลิป MP4"
                >
                  <Download className="w-4 h-4" /> MP4
                </a>
              </div>
            </div>
          </div>
        );
      })() : (
        <ModelViewerStage
          chapterTitle={config.title}
          modelUrl={config.model}
          posterUrl={config.poster}
          hotspots={config.hotspots}
          activeHotspotId={activeHotspotId}
          onSelectHotspot={setActiveHotspotId}
          activeAnimationName={activeStep?.animation}
        />
      )}

      {/* 3. ปุ่มหลักสีเต็ม 1 ปุ่มเดียว + แผงขั้นตอนพร้อมแถบความคืบหน้า */}
      <div className="p-5 rounded-2xl bg-[var(--bg-surface-muted)] border-2 border-[var(--border-subtle)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={handleNextStep} className="btn-primary-3d w-full sm:w-auto">
            <Play className="w-5 h-5" />
            {config.primaryButtonLabel}
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-[var(--color-primary)]">
              {stepIdx + 1} / {totalSteps}
            </span>
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStepIdx(0)}
                className="btn-secondary-3d btn-compact-3d"
                title="เริ่มขั้นแรกใหม่"
              >
                <RotateCcw className="w-4 h-4" /> เริ่มใหม่
              </button>
            )}
          </div>
        </div>

        {/* แถบความคืบหน้า */}
        <div className="w-full h-3 rounded-full bg-[var(--border-subtle)] overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* รายละเอียดขั้นปัจจุบัน */}
        {activeStep && (
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] space-y-1">
            <div className="text-xs font-heading font-bold text-[var(--color-primary)]">
              {activeStep.badge || `ขั้นที่ ${stepIdx + 1}`}
            </div>
            <div className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)]">
              {activeStep.title}
            </div>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">{activeStep.text}</p>
          </div>
        )}
      </div>

      {/* 4. การ์ดสรุปแนวคิดกดได้ (เชื่อมกับ Hotspot บนโมเดล 3D / ภาพ) */}
      <section className="space-y-3">
        <h4 className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)] flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-[var(--color-primary)]" />
          จุดสำรวจสำคัญ (กดการ์ดหรือป้ายบนภาพเพื่อดูคำอธิบาย)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {config.hotspots.map((hs, idx) => {
            const active = activeHotspotId === hs.id;
            return (
              <button
                key={hs.id}
                type="button"
                onClick={() => setActiveHotspotId(hs.id)}
                className={`p-4 rounded-2xl text-left border-2 cursor-pointer transition space-y-1.5 ${
                  active
                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-sm'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-mono font-extrabold flex items-center justify-center shrink-0 ${
                      active ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-surface-muted)] text-[var(--color-primary)]'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)]">
                    {hs.label}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{hs.text}</p>
              </button>
            );
          })}
        </div>

        {/* สรุปเนื้อหาตรงตามหนังสือ สสวท. */}
        <details className="rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] p-4">
          <summary className="font-heading font-bold text-sm sm:text-base text-[var(--color-primary)] cursor-pointer select-none">
            สรุปแก่นความรู้ตามหนังสือเรียน สสวท. ({config.ipstSummary.length} ประเด็น)
          </summary>
          <ul className="mt-3 space-y-2 text-sm sm:text-base text-[var(--text-primary)] leading-relaxed">
            {config.ipstSummary.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--color-primary)] font-bold">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* 5. ห้องทดลอง & กิจกรรมประจำบท (เฉพาะของบทที่ 1–6) */}
      <div>
        {config.chapter === 1 && <Chapter1Lab currentStepIdx={stepIdx} onSelectStep={setStepIdx} />}
        {config.chapter === 2 && <Chapter2Lab currentStepIdx={stepIdx} onSelectStep={setStepIdx} />}
        {config.chapter === 3 && <Chapter3Lab currentStepIdx={stepIdx} onSelectStep={setStepIdx} />}
        {config.chapter === 4 && <Chapter4Lab currentStepIdx={stepIdx} onSelectStep={setStepIdx} />}
        {config.chapter === 5 && <Chapter5Lab currentStepIdx={stepIdx} onSelectStep={setStepIdx} />}
        {config.chapter === 6 && <Chapter6Lab currentStepIdx={stepIdx} onSelectStep={setStepIdx} />}
      </div>

      {/* 6. “ลองคิดดู” 3 ข้อ (ตอบผิดให้บอกใบ้ ไม่เฉลยตรงๆ!) */}
      <section className="rounded-2xl border-2 border-[var(--color-primary-border)] bg-[var(--bg-surface)] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-heading font-bold text-lg text-[var(--color-primary)] flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#F2B31B]" />
            ลองคิดดู 3 ข้อ (ตอบผิดระบบจะบอกใบ้ให้คิดต่อเอง)
          </h4>
          {Object.keys(quizPicks).length > 0 && (
            <button
              type="button"
              onClick={() => setQuizPicks({})}
              className="btn-secondary-3d btn-compact-3d"
            >
              <RotateCcw className="w-4 h-4" /> ทำใหม่
            </button>
          )}
        </div>

        <div className="space-y-4">
          {config.quiz.map((item, qIdx) => {
            const pick = quizPicks[qIdx];
            const isAnswered = pick !== undefined;
            const isCorrect = isAnswered && pick === item.answer;

            return (
              <div
                key={qIdx}
                className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5"
              >
                <div className="font-heading font-bold text-base text-[var(--text-primary)]">{item.q}</div>
                <div className="space-y-2">
                  {item.options.map((opt, optIdx) => {
                    const selected = pick === optIdx;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQuizPicks(prev => ({ ...prev, [qIdx]: optIdx }))}
                        className={`w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl text-sm sm:text-base font-medium border-2 cursor-pointer transition ${
                          selected
                            ? optIdx === item.answer
                              ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success)] font-bold'
                              : 'bg-[var(--color-gold-bg)] border-[var(--color-gold)] text-[var(--text-primary)] font-bold'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {isAnswered && (
                  isCorrect ? (
                    <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-sm font-heading font-bold text-[var(--color-success)] flex items-center gap-2 animate-scale-pop">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      ถูกต้องครับ! เก่งมาก ลองไปข้อถัดไปได้เลย
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-sm text-[var(--text-primary)] flex items-start gap-2 animate-scale-pop">
                      <Lightbulb className="w-5 h-5 text-[#D99B00] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-[#946400] dark:text-[#F2B31B]">คำใบ้:</strong> {item.hint}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
