'use client';

import { useState, useMemo } from 'react';
import {
  Send,
  Clock,
  FileEdit,
  Trash2,
  FileText,
  ExternalLink,
  Plus,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  CalendarClock,
  Pencil,
  X,
  Box,
  Copy
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { InteractiveChapterHub } from '@/components/labs/InteractiveChapterHub';
import { CHAPTER_LAB_CONFIGS, MASTER_STYLE_PROMPT } from '@/lib/interactive-labs-data';
import { copyTextSafe } from '@/lib/utils';
import type { Assignment, Lesson, PublishStatus, Topic } from '@/types/database';

interface TeacherClassworkManagerProps {
  topics: Topic[];
  lessons: Lesson[];
  assignments: Assignment[];
  onOpenCreate: (type: 'lesson' | 'line' | 'form' | 'topic') => void;
  onRefresh: () => Promise<void>;
}

function StatusBadge({ status, scheduledAt }: { status?: PublishStatus; scheduledAt?: string }) {
  const s = status || 'published';
  if (s === 'draft') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-heading font-bold bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border border-[var(--border-strong)]">
        <FileEdit className="w-3.5 h-3.5" /> ฉบับร่าง
      </span>
    );
  }
  if (s === 'scheduled') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-heading font-bold bg-[var(--color-gold-bg)] text-[var(--color-gold)] border border-[var(--color-gold-border)]">
        <Clock className="w-3.5 h-3.5" /> ตั้งเวลา: {(scheduledAt || '').replace('T', ' ')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-heading font-bold bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]">
      <CheckCircle2 className="w-3.5 h-3.5" /> โพสต์แล้ว
    </span>
  );
}

export function TeacherClassworkManager({
  topics,
  lessons,
  assignments,
  onOpenCreate,
  onRefresh
}: TeacherClassworkManagerProps) {
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | PublishStatus>('all');
  const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());

  // Schedule Modal
  const [scheduleTarget, setScheduleTarget] = useState<{
    kind: 'lesson' | 'assignment';
    id: string;
    title: string;
    currentAt: string;
  } | null>(null);

  // Edit Lesson Modal
  const [editingLesson, setEditingLesson] = useState<{
    id: string;
    unit: string;
    chapter: string;
    hours: string;
    description: string;
    publishStatus: PublishStatus;
    scheduledAt: string;
    newSlideTitle: string;
    newSlideUrl: string;
    modelUrl: string;
    posterUrl: string;
  } | null>(null);

  // 3D Interactive Lab Preview Modal (for teachers to inspect & copy photoreal/.glb prompts)
  const [previewLabLesson, setPreviewLabLesson] = useState<Lesson | null>(null);

  // รวมชื่อหัวข้อใหญ่ (Units) ทั้งหมดโดยรักษาลำดับ
  const unitNames = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const t of topics) {
      if (!seen.has(t.title)) {
        seen.add(t.title);
        list.push(t.title);
      }
    }
    for (const l of lessons) {
      if (l.unit && !seen.has(l.unit)) {
        seen.add(l.unit);
        list.push(l.unit);
      }
    }
    for (const a of assignments) {
      if (a.topicUnit && !seen.has(a.topicUnit)) {
        seen.add(a.topicUnit);
        list.push(a.topicUnit);
      }
    }
    return list;
  }, [topics, lessons, assignments]);

  const counts = useMemo(() => {
    const allItems = [...lessons, ...assignments];
    return {
      all: allItems.length,
      published: allItems.filter(i => (i.publishStatus || 'published') === 'published').length,
      scheduled: allItems.filter(i => i.publishStatus === 'scheduled').length,
      draft: allItems.filter(i => i.publishStatus === 'draft').length
    };
  }, [lessons, assignments]);

  const matchFilter = (item: { publishStatus?: PublishStatus }) => {
    if (statusFilter === 'all') return true;
    return (item.publishStatus || 'published') === statusFilter;
  };

  function toggleUnit(unit: string) {
    setCollapsedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit);
      else next.add(unit);
      return next;
    });
  }

  async function handleStatusAction(
    kind: 'lesson' | 'assignment',
    id: string,
    action: 'publish' | 'draft' | 'schedule',
    scheduledAt?: string
  ) {
    const endpoint = kind === 'lesson' ? '/api/teacher/lessons' : '/api/teacher/assignments';
    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, scheduledAt })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'อัปเดตสถานะไม่สำเร็จ', { kind: 'error' });
      return;
    }
    showToast(
      action === 'publish'
        ? 'โพสต์ให้นักเรียนเห็นทันทีเรียบร้อย'
        : action === 'draft'
          ? 'ย้ายกลับเป็นฉบับร่างแล้ว (นักเรียนจะไม่เห็น)'
          : `ตั้งเวลาโพสต์เป็น ${(scheduledAt || '').replace('T', ' ')} เรียบร้อย`,
      { kind: 'success' }
    );
    setScheduleTarget(null);
    await onRefresh();
  }

  async function handleDelete(kind: 'lesson' | 'assignment', id: string) {
    const endpoint =
      kind === 'lesson'
        ? `/api/teacher/lessons?id=${encodeURIComponent(id)}`
        : `/api/teacher/assignments?id=${encodeURIComponent(id)}`;
    const res = await fetch(endpoint, { method: 'DELETE' });
    if ((await res.json()).ok) {
      showToast(`ลบ${kind === 'lesson' ? 'บทเรียน' : 'ชิ้นงาน'}เรียบร้อย`, { kind: 'info' });
      await onRefresh();
    }
  }

  async function handleSaveEditedLesson(targetStatus: PublishStatus) {
    if (!editingLesson) return;
    if (targetStatus === 'scheduled' && !editingLesson.scheduledAt) {
      showToast('กรุณาเลือกวันและเวลาที่ต้องการตั้งเวลาโพสต์', { kind: 'error' });
      return;
    }
    const res = await fetch('/api/teacher/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingLesson.id,
        unit: editingLesson.unit,
        chapter: editingLesson.chapter,
        hours: editingLesson.hours,
        description: editingLesson.description,
        publishStatus: targetStatus,
        scheduledAt: targetStatus === 'scheduled' ? editingLesson.scheduledAt : undefined,
        modelUrl: editingLesson.modelUrl.trim(),
        posterUrl: editingLesson.posterUrl.trim(),
        ...(editingLesson.newSlideUrl.trim()
          ? {
              slideTitle: editingLesson.newSlideTitle.trim() || editingLesson.chapter,
              slideUrl: editingLesson.newSlideUrl.trim(),
              appendSlide: true
            }
          : {})
      })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'บันทึกบทเรียนไม่สำเร็จ', { kind: 'error' });
      return;
    }
    setEditingLesson(null);
    showToast('บันทึกและจัดการบทเรียนเรียบร้อย', { kind: 'success' });
    await onRefresh();
  }

  return (
    <div className="space-y-5">
      {/* 3D Interactive Lab Preview & .glb Prompt Guide Modal */}
      {previewLabLesson && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewLabLesson(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5 animate-scale-pop"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3 sticky top-0 bg-[var(--bg-surface)] z-20">
              <div>
                <h3 className="font-heading font-bold text-lg text-[var(--color-primary)] flex items-center gap-2">
                  <Box className="w-5 h-5" />
                  พรีวิวสื่อ 3 มิติ & ห้องทดลอง ({previewLabLesson.chapter})
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  วางไฟล์ <code>.glb</code> (ขนาด &lt;10MB) ที่ <code>public/models/ch{CHAPTER_LAB_CONFIGS[previewLabLesson.id]?.chapter || 'X'}.glb</code> หรือใส่ลิงก์ในปุ่ม “แก้ไข” เพื่อแสดงด้วย &lt;model-viewer&gt; ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLabLesson(null)}
                className="p-2 rounded-xl hover:bg-[var(--bg-surface-muted)] cursor-pointer"
                aria-label="ปิดหน้าต่างพรีวิว"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* แถบคัดลอกพรอมต์สร้างภาพอ้างอิง & โมเดล 3D สำหรับ Meshy / Tripo / Gemini */}
            {CHAPTER_LAB_CONFIGS[previewLabLesson.id] && (
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading font-bold text-[var(--color-primary)]">
                    พรอมต์ภาพอ้างอิงภาษาอังกฤษ (สำหรับสร้างภาพ 4K → แปลงเป็น .glb ด้วย Meshy / Tripo / Luma)
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const fullPrompt = `${MASTER_STYLE_PROMPT}\n\n${CHAPTER_LAB_CONFIGS[previewLabLesson.id].imagePrompt}`;
                      await copyTextSafe(fullPrompt);
                      showToast('คัดลอกพรอมต์สไตล์กลาง + พรอมต์ประจำบทเรียบร้อย', { kind: 'success' });
                    }}
                    className="btn-secondary-3d btn-compact-3d"
                  >
                    <Copy className="w-4 h-4" /> คัดลอกพรอมต์ฉบับเต็ม
                  </button>
                </div>
                <p className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-surface)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                  {CHAPTER_LAB_CONFIGS[previewLabLesson.id].imagePrompt}
                </p>
              </div>
            )}

            <InteractiveChapterHub
              lessonId={previewLabLesson.id}
              customModelUrl={previewLabLesson.modelUrl}
              customPosterUrl={previewLabLesson.posterUrl}
              showTeacherNotes={true}
            />
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setScheduleTarget(null)}
        >
          <form
            onSubmit={e => {
              e.preventDefault();
              void handleStatusAction(scheduleTarget.kind, scheduleTarget.id, 'schedule', scheduleTarget.currentAt);
            }}
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[var(--color-primary)]" /> ตั้งเวลาโพสต์
              </h3>
              <button type="button" onClick={() => setScheduleTarget(null)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{scheduleTarget.title}</p>
            <div>
              <label className="block text-sm font-heading font-semibold mb-1.5">
                เลือกวันและเวลาที่จะแสดงให้นักเรียนเห็น
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleTarget.currentAt}
                onChange={e => setScheduleTarget({ ...scheduleTarget, currentAt: e.target.value })}
                className="tus-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setScheduleTarget(null)} className="btn-secondary-3d">
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary-3d">
                ยืนยันตั้งเวลา
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {editingLesson && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingLesson(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-pop"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading font-bold text-lg">จัดการและแก้ไขบทเรียน</h3>
              <button type="button" onClick={() => setEditingLesson(null)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-heading font-semibold mb-1">หัวข้อใหญ่ (บทที่ 1–6)</label>
                <select
                  value={editingLesson.unit}
                  onChange={e => setEditingLesson({ ...editingLesson, unit: e.target.value })}
                  className="tus-input"
                >
                  {unitNames.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={editingLesson.chapter}
                onChange={e => setEditingLesson({ ...editingLesson, chapter: e.target.value })}
                placeholder="ชื่อบทเรียน"
                className="tus-input"
              />
              <input
                type="text"
                value={editingLesson.hours}
                onChange={e => setEditingLesson({ ...editingLesson, hours: e.target.value })}
                placeholder="จำนวนชั่วโมง"
                className="tus-input"
              />
              <textarea
                rows={3}
                value={editingLesson.description}
                onChange={e => setEditingLesson({ ...editingLesson, description: e.target.value })}
                placeholder="คำอธิบายบทเรียน"
                className="tus-input"
              />

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2">
                <div className="text-xs font-heading font-bold text-[var(--text-secondary)]">
                  + แนบสไลด์เพิ่มเติมในบทนี้ (ถ้าต้องการ)
                </div>
                <input
                  type="text"
                  value={editingLesson.newSlideTitle}
                  onChange={e => setEditingLesson({ ...editingLesson, newSlideTitle: e.target.value })}
                  placeholder="ชื่อสไลด์เพิ่มเติม"
                  className="tus-input"
                />
                <input
                  type="text"
                  value={editingLesson.newSlideUrl}
                  onChange={e => setEditingLesson({ ...editingLesson, newSlideUrl: e.target.value })}
                  placeholder="ลิงก์ PDF / Google Drive / Canva"
                  className="tus-input"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2">
                <div className="text-xs font-heading font-bold text-[var(--text-secondary)]">
                  สื่อโมเดล 3 มิติ (&lt;model-viewer&gt; .glb & ภาพ Poster — ไม่บังคับ)
                </div>
                <input
                  type="text"
                  value={editingLesson.modelUrl}
                  onChange={e => setEditingLesson({ ...editingLesson, modelUrl: e.target.value })}
                  placeholder="พาธหรือลิงก์ไฟล์ .glb เช่น /models/ch1.glb (ขนาดไม่เกิน 10MB)"
                  className="tus-input font-mono text-sm"
                />
                <input
                  type="text"
                  value={editingLesson.posterUrl}
                  onChange={e => setEditingLesson({ ...editingLesson, posterUrl: e.target.value })}
                  placeholder="พาธหรือลิงก์ภาพนิ่ง Poster เช่น /models/posters/ch1.jpg"
                  className="tus-input font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  ตั้งเวลาโพสต์ (ใช้เมื่อกดปุ่ม “ตั้งเวลาโพสต์”)
                </label>
                <input
                  type="datetime-local"
                  value={editingLesson.scheduledAt}
                  onChange={e => setEditingLesson({ ...editingLesson, scheduledAt: e.target.value })}
                  className="tus-input"
                />
              </div>
            </div>

            {/* 3 ปุ่มจัดการ: โพสต์ทันที / ตั้งเวลา / บันทึกร่าง */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleSaveEditedLesson('published')}
                className="btn-primary-3d flex-1"
              >
                <Send className="w-4 h-4" /> โพสต์ทันที
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEditedLesson('scheduled')}
                className="btn-secondary-3d"
              >
                <Clock className="w-4 h-4" /> ตั้งเวลาโพสต์
              </button>
              <button
                type="button"
                onClick={() => void handleSaveEditedLesson('draft')}
                className="btn-secondary-3d"
              >
                <FileEdit className="w-4 h-4" /> บันทึกฉบับร่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Filter & Quick Create Bar */}
      <div className="tus-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all' as const, label: 'ทั้งหมด', count: counts.all },
            { id: 'published' as const, label: 'โพสต์แล้ว', count: counts.published },
            { id: 'scheduled' as const, label: 'ตั้งเวลาไว้', count: counts.scheduled },
            { id: 'draft' as const, label: 'ฉบับร่าง', count: counts.draft }
          ].map(f => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`min-h-[42px] px-3.5 py-1.5 rounded-xl text-sm font-heading font-bold border-2 inline-flex items-center gap-1.5 cursor-pointer transition ${
                  active
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono ${
                    active ? 'bg-white/25 text-white' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpenCreate('lesson')} className="btn-primary-3d btn-compact-3d">
            <Plus className="w-4 h-4" /> เพิ่มบทเรียน/สไลด์
          </button>
          <button type="button" onClick={() => onOpenCreate('line')} className="btn-secondary-3d btn-compact-3d">
            <Plus className="w-4 h-4" /> เพิ่มใบงาน
          </button>
          <button type="button" onClick={() => onOpenCreate('topic')} className="btn-secondary-3d btn-compact-3d">
            <Plus className="w-4 h-4" /> เพิ่มหัวข้อใหญ่
          </button>
        </div>
      </div>

      {/* แสดงบทเรียน สไลด์ PDF และงาน แยกตามหัวข้อใหญ่ (หน่วยการเรียนรู้) */}
      <div className="space-y-4">
        {unitNames.map(unit => {
          const unitLessons = lessons.filter(l => l.unit === unit && matchFilter(l));
          const unitAsgs = assignments.filter(a => a.topicUnit === unit && matchFilter(a));
          const isCollapsed = collapsedUnits.has(unit);

          if (statusFilter !== 'all' && unitLessons.length === 0 && unitAsgs.length === 0) {
            return null;
          }

          return (
            <section key={unit} className="tus-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleUnit(unit)}
                className="w-full px-5 py-4 bg-[var(--color-primary-soft)] border-b border-[var(--color-primary-border)] flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div>
                  <h2 className="font-heading font-bold text-base sm:text-lg text-[var(--color-primary)]">
                    {unit}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {unitLessons.length} บทเรียน ({unitLessons.reduce((s, l) => s + (l.slides?.length || 0), 0)} ไฟล์สไลด์) •{' '}
                    {unitAsgs.length} ชิ้นงาน/แบบทดสอบ
                  </p>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--color-primary)] shrink-0" />
                )}
              </button>

              {!isCollapsed && (
                <div className="p-4 sm:p-5 space-y-4">
                  {unitLessons.length === 0 && unitAsgs.length === 0 ? (
                    <div className="text-sm text-[var(--text-muted)] text-center py-4">
                      ยังไม่มีเนื้อหาในหัวข้อใหญ่นี้
                    </div>
                  ) : (
                    <>
                      {/* บทเรียนและสไลด์ในหัวข้อใหญ่นี้ */}
                      {unitLessons.map(lesson => {
                        const st = lesson.publishStatus || 'published';
                        return (
                          <article
                            key={lesson.id}
                            className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusBadge status={lesson.publishStatus} scheduledAt={lesson.scheduledAt} />
                                  <span className="text-xs font-semibold text-[var(--text-muted)]">
                                    {lesson.hours}
                                  </span>
                                </div>
                                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                                  {lesson.chapter}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)]">{lesson.description}</p>
                              </div>

                              {/* ปุ่มจัดการสถานะ: โพสต์เลย / ตั้งเวลา / เก็บเป็นร่าง / พรีวิว 3D / แก้ไข / ลบ */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                {CHAPTER_LAB_CONFIGS[lesson.id] && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewLabLesson(lesson)}
                                    className="btn-secondary-3d btn-compact-3d"
                                    title="พรีวิวสื่อ 3 มิติและกิจกรรมบทนี้"
                                  >
                                    <Box className="w-3.5 h-3.5" /> พรีวิว 3D
                                  </button>
                                )}
                                {st !== 'published' && (
                                  <button
                                    type="button"
                                    onClick={() => void handleStatusAction('lesson', lesson.id, 'publish')}
                                    className="btn-primary-3d btn-compact-3d"
                                  >
                                    <Send className="w-3.5 h-3.5" /> โพสต์เลย
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setScheduleTarget({
                                      kind: 'lesson',
                                      id: lesson.id,
                                      title: lesson.chapter,
                                      currentAt: lesson.scheduledAt || ''
                                    })
                                  }
                                  className="btn-secondary-3d btn-compact-3d"
                                >
                                  <Clock className="w-3.5 h-3.5" /> ตั้งเวลา
                                </button>
                                {st !== 'draft' && (
                                  <button
                                    type="button"
                                    onClick={() => void handleStatusAction('lesson', lesson.id, 'draft')}
                                    className="btn-secondary-3d btn-compact-3d"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" /> ร่าง
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingLesson({
                                      id: lesson.id,
                                      unit: lesson.unit,
                                      chapter: lesson.chapter,
                                      hours: lesson.hours,
                                      description: lesson.description,
                                      publishStatus: st,
                                      scheduledAt: lesson.scheduledAt || '',
                                      newSlideTitle: '',
                                      newSlideUrl: '',
                                      modelUrl: lesson.modelUrl || '',
                                      posterUrl: lesson.posterUrl || ''
                                    })
                                  }
                                  className="btn-secondary-3d btn-compact-3d !px-3"
                                  title="แก้ไขบทเรียน"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete('lesson', lesson.id)}
                                  className="btn-danger-3d btn-compact-3d !px-3"
                                  title="ลบบทเรียน"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* รายการไฟล์สไลด์ PDF ภายในบท */}
                            {lesson.slides && lesson.slides.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {lesson.slides.map(slide => (
                                  <a
                                    key={slide.id}
                                    href={slide.externalUrl || slide.embedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] hover:border-[var(--color-primary)] text-xs sm:text-sm font-heading font-semibold text-[var(--text-primary)] transition"
                                  >
                                    <FileText className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                                    <span>{slide.title}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </article>
                        );
                      })}

                      {/* ใบงานและแบบทดสอบในหัวข้อใหญ่นี้ */}
                      {unitAsgs.map(asg => {
                        const st = asg.publishStatus || 'published';
                        return (
                          <article
                            key={asg.id}
                            className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge status={asg.publishStatus} scheduledAt={asg.scheduledAt} />
                                <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                                  {asg.code}
                                </span>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  เต็ม {asg.maxScore} คะแนน • {asg.dueDate}
                                </span>
                              </div>
                              <div className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)]">
                                {asg.title}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              {st !== 'published' && (
                                <button
                                  type="button"
                                  onClick={() => void handleStatusAction('assignment', asg.id, 'publish')}
                                  className="btn-primary-3d btn-compact-3d"
                                >
                                  <Send className="w-3.5 h-3.5" /> โพสต์เลย
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setScheduleTarget({
                                    kind: 'assignment',
                                    id: asg.id,
                                    title: asg.title,
                                    currentAt: asg.scheduledAt || ''
                                  })
                                }
                                className="btn-secondary-3d btn-compact-3d"
                              >
                                <Clock className="w-3.5 h-3.5" /> ตั้งเวลา
                              </button>
                              {st !== 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => void handleStatusAction('assignment', asg.id, 'draft')}
                                  className="btn-secondary-3d btn-compact-3d"
                                >
                                  <FileEdit className="w-3.5 h-3.5" /> ร่าง
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleDelete('assignment', asg.id)}
                                className="btn-danger-3d btn-compact-3d !px-3"
                                title="ลบชิ้นงาน"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
