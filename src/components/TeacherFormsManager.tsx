'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  ExternalLink,
  Link2,
  Pencil,
  Trash2,
  Send,
  Clock,
  FileEdit,
  CheckCircle2,
  Plus,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import type { Assignment, Lesson, PublishStatus, QuizBankDoc, Topic } from '@/types/database';

interface TeacherFormsManagerProps {
  topics: Topic[];
  lessons: Lesson[];
  assignments: Assignment[];
  quizzes: QuizBankDoc[];
  onRefresh: () => Promise<void>;
}

export function TeacherFormsManager({
  topics,
  lessons,
  assignments,
  quizzes,
  onRefresh
}: TeacherFormsManagerProps) {
  const { showToast } = useToast();

  const unitOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...topics.map(t => t.title),
        ...lessons.map(l => l.unit),
        'บทที่ 1 : ระบบทางเทคโนโลยีที่ซับซ้อน (2 ชั่วโมง)',
        'บทที่ 2 : การเปลี่ยนแปลงของเทคโนโลยี (2 ชั่วโมง)',
        'บทที่ 3 : ผลกระทบของเทคโนโลยี (2 ชั่วโมง)',
        'บทที่ 4 : วัสดุและเครื่องมือพื้นฐาน (2 ชั่วโมง)',
        'บทที่ 5 : กลไก ไฟฟ้า และอิเล็กทรอนิกส์เบื้องต้น (4 ชั่วโมง)',
        'บทที่ 6 : กระบวนการออกแบบเชิงวิศวกรรม (6 ชั่วโมง)'
      ])
    ).filter(Boolean);
  }, [topics, lessons]);

  const formAssignments = useMemo(
    () =>
      assignments
        .filter(a => a.category === 'form')
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [assignments]
  );

  const quizCountByAsg = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of quizzes) {
      map.set(q.assignmentId, q.questions?.length || 0);
    }
    return map;
  }, [quizzes]);

  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [topicUnit, setTopicUnit] = useState(unitOptions[0] || '');
  const [formUrl, setFormUrl] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [dueDate, setDueDate] = useState('ตามกำหนด');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'google_form' | 'builtin'>('all');
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  function resetForm() {
    setEditId(null);
    setCode('');
    setTitle('');
    setFormUrl('');
    setMaxScore('10');
    setDueDate('ตามกำหนด');
    setDescription('');
    setScheduledAt('');
  }

  function startEdit(asg: Assignment) {
    setEditId(asg.id);
    setCode(asg.code || '');
    setTitle(asg.title || '');
    setTopicUnit(asg.topicUnit || unitOptions[0] || '');
    setFormUrl(asg.formExternalUrl || '');
    setMaxScore(String(asg.maxScore || 10));
    setDueDate(asg.dueDate || 'ตามกำหนด');
    setDescription(asg.description || '');
    setScheduledAt(asg.scheduledAt || '');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function handleSave(targetStatus: PublishStatus) {
    if (!title.trim()) {
      showToast('กรุณากรอกชื่อบททดสอบ (เช่น แบบทดสอบหลังเรียน บทที่ 1)', { kind: 'error' });
      return;
    }
    if (!editId && !formUrl.trim()) {
      showToast('กรุณาวางลิงก์ Google Forms สำหรับสอบหลังเรียน', { kind: 'error' });
      return;
    }
    if (formUrl.trim() && !/^https?:\/\//i.test(formUrl.trim())) {
      showToast('กรุณาวางลิงก์ที่ขึ้นต้นด้วย https://', { kind: 'error' });
      return;
    }
    if (targetStatus === 'scheduled' && !scheduledAt) {
      showToast('กรุณาเลือกวันและเวลาที่ต้องการตั้งเวลาเปิดข้อสอบ', { kind: 'error' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId || undefined,
          code: code.trim() || `POST-${String(formAssignments.length + 1).padStart(2, '0')}`,
          title: title.trim(),
          category: 'form',
          topicUnit: topicUnit || unitOptions[0],
          maxScore: Math.max(1, Number(maxScore) || 10),
          dueDate: dueDate.trim() || 'ตามกำหนด',
          description: description.trim(),
          formExternalUrl: formUrl.trim(),
          publishStatus: targetStatus,
          scheduledAt: targetStatus === 'scheduled' ? scheduledAt : undefined
        })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'บันทึกบททดสอบไม่สำเร็จ', { kind: 'error' });
        return;
      }

      showToast(
        editId
          ? 'อัปเดตลิงก์และข้อมูลบททดสอบเรียบร้อย'
          : targetStatus === 'draft'
            ? 'บันทึกบททดสอบเป็นฉบับร่างแล้ว'
            : targetStatus === 'scheduled'
              ? 'ตั้งเวลาเปิดบททดสอบเรียบร้อย'
              : 'เพิ่มบททดสอบ Google Form ให้นักเรียนเห็นทันทีแล้ว',
        { kind: 'success' }
      );
      resetForm();
      await onRefresh();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, action: 'publish' | 'draft') {
    const res = await fetch('/api/teacher/assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    const json = await res.json();
    if (json.ok) {
      showToast(action === 'publish' ? 'เปิดให้นักเรียนทำแบบทดสอบแล้ว' : 'ซ่อนเป็นฉบับร่างแล้ว', { kind: 'success' });
      await onRefresh();
    } else {
      showToast(json.message || 'อัปเดตสถานะไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/teacher/assignments?id=${encodeURIComponent(deleteTarget.id)}`, {
      method: 'DELETE'
    });
    const json = await res.json();
    if (json.ok) {
      showToast(`ลบบททดสอบ "${deleteTarget.title}" เรียบร้อย`, { kind: 'info' });
      if (editId === deleteTarget.id) resetForm();
      setDeleteTarget(null);
      await onRefresh();
    } else {
      showToast(json.message || 'ลบไม่สำเร็จ', { kind: 'error' });
    }
  }

  const visibleList = formAssignments.filter(asg => {
    const hasFormLink = Boolean(asg.formExternalUrl || asg.formEmbedUrl);
    if (filterMode === 'google_form') return hasFormLink;
    if (filterMode === 'builtin') return !hasFormLink;
    return true;
  });

  const googleFormCount = formAssignments.filter(a => Boolean(a.formExternalUrl || a.formEmbedUrl)).length;

  return (
    <div className="space-y-5">
      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ยืนยันการลบบททดสอบ"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-heading font-bold text-lg text-[var(--color-danger)]">ยืนยันการลบบททดสอบ</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              ต้องการลบ <strong>{deleteTarget.code}: {deleteTarget.title}</strong> ออกจากรายวิชาใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="btn-secondary-3d">
                ยกเลิก
              </button>
              <button type="button" onClick={() => void confirmDelete()} className="btn-danger-3d">
                <Trash2 className="w-4 h-4" /> ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Google Form Exam Card */}
      <form
        onSubmit={e => {
          e.preventDefault();
          void handleSave('published');
        }}
        className="tus-card p-5 sm:p-6 space-y-4 border-2 border-[var(--color-primary-border)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                {editId ? 'แก้ไขบททดสอบ / ลิงก์ Google Forms' : 'เพิ่มบททดสอบ Google Forms (สอบหลังเรียน)'}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                วางลิงก์ Google Forms ระบบจะฝังหน้าข้อสอบและปุ่มเปิดเต็มจอในแท็บ “บททดสอบ” ของนักเรียนให้อัตโนมัติ
              </p>
            </div>
          </div>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary-3d btn-compact-3d"
            >
              <X className="w-4 h-4" /> ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              รหัสชุดข้อสอบ
            </label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="เช่น POST-01"
              className="tus-input font-mono"
            />
          </div>
          <div className="sm:col-span-6">
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              ชื่อบททดสอบ *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="เช่น แบบทดสอบหลังเรียน บทที่ 1 : ระบบทางเทคโนโลยีที่ซับซ้อน"
              className="tus-input"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              คะแนนเต็ม
            </label>
            <input
              type="number"
              min={1}
              value={maxScore}
              onChange={e => setMaxScore(e.target.value)}
              className="tus-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
            ลิงก์ Google Forms (รองรับทั้ง docs.google.com/forms และ forms.gle) {editId ? '' : '*'}
          </label>
          <div className="relative">
            <input
              type="url"
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="https://docs.google.com/forms/d/e/.../viewform หรือ https://forms.gle/..."
              className="tus-input font-mono text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              บทเรียนที่เกี่ยวข้อง
            </label>
            <select value={topicUnit} onChange={e => setTopicUnit(e.target.value)} className="tus-input">
              {unitOptions.map(u => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              กำหนดทำข้อสอบ
            </label>
            <input
              type="text"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              placeholder="เช่น ภายในคาบเรียน / ศุกร์นี้"
              className="tus-input"
            />
          </div>
          <div>
            <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
              ตั้งเวลาเปิดอัตโนมัติ (ถ้าต้องการ)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="tus-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
            คำชี้แจงสำหรับนักเรียน
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="เช่น กรอกรหัสนักเรียนและชื่อ-สกุลให้ถูกต้อง ทำได้ 1 ครั้ง คะแนนจะอัปเดตในหน้าคะแนนของฉัน"
            className="tus-input"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave('draft')}
            className="btn-secondary-3d"
          >
            <FileEdit className="w-4 h-4" /> บันทึกฉบับร่าง
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave('scheduled')}
            className="btn-secondary-3d"
          >
            <Clock className="w-4 h-4" /> ตั้งเวลาเปิดสอบ
          </button>
          <button type="submit" disabled={saving} className="btn-primary-3d">
            {editId ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {saving ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'โพสต์บททดสอบทันที'}
          </button>
        </div>
      </form>

      {/* Filter & Existing Exams List */}
      <div className="tus-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
              รายการบททดสอบทั้งหมด ({formAssignments.length} ชุด)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              เชื่อม Google Forms แล้ว {googleFormCount} ชุด • แบบทดสอบในระบบ {formAssignments.length - googleFormCount} ชุด
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all' as const, label: `ทั้งหมด (${formAssignments.length})` },
              { id: 'google_form' as const, label: `Google Forms (${googleFormCount})` },
              { id: 'builtin' as const, label: `ในระบบ (${formAssignments.length - googleFormCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  filterMode === tab.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {visibleList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] text-sm">
            ยังไม่มีบททดสอบในหมวดนี้ — สามารถวางลิงก์ Google Forms ด้านบนเพื่อเพิ่มชุดข้อสอบหลังเรียนได้ทันที
          </div>
        ) : (
          <div className="space-y-3">
            {visibleList.map(asg => {
              const hasForm = Boolean(asg.formExternalUrl || asg.formEmbedUrl);
              const qCount = quizCountByAsg.get(asg.id) || 0;
              const status = asg.publishStatus || 'published';
              return (
                <div
                  key={asg.id}
                  className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        {asg.code}
                      </span>
                      {hasForm ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 font-heading font-bold">
                          <Link2 className="w-3.5 h-3.5" /> Google Forms
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-heading font-bold">
                          <FileSpreadsheet className="w-3.5 h-3.5" /> ในระบบ ({qCount} ข้อ)
                        </span>
                      )}
                      {status === 'published' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] font-heading font-bold">
                          เปิดสอบอยู่
                        </span>
                      ) : status === 'scheduled' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--color-gold-bg)] text-[var(--color-gold)] font-heading font-bold">
                          ตั้งเวลา: {(asg.scheduledAt || '').replace('T', ' ')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-strong)] font-heading font-bold">
                          ฉบับร่าง
                        </span>
                      )}
                      <span className="text-[var(--text-muted)]">เต็ม {asg.maxScore} คะแนน</span>
                    </div>

                    <div className="font-heading font-bold text-base text-[var(--text-primary)]">{asg.title}</div>
                    <div className="text-xs text-[var(--text-secondary)] truncate">
                      {asg.topicUnit} • กำหนด: {asg.dueDate}
                    </div>
                    {asg.formExternalUrl && (
                      <div className="text-xs font-mono text-[var(--color-primary)] truncate">
                        {asg.formExternalUrl}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {asg.formExternalUrl && (
                      <a
                        href={asg.formExternalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary-3d btn-compact-3d"
                      >
                        <ExternalLink className="w-4 h-4" /> เปิดฟอร์ม
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(asg)}
                      className="btn-secondary-3d btn-compact-3d"
                    >
                      <Pencil className="w-4 h-4" /> {hasForm ? 'แก้ไข' : 'ใส่ลิงก์ Form'}
                    </button>
                    {status !== 'published' ? (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(asg.id, 'publish')}
                        className="btn-primary-3d btn-compact-3d"
                      >
                        <Send className="w-3.5 h-3.5" /> เปิดสอบ
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleStatusChange(asg.id, 'draft')}
                        className="btn-secondary-3d btn-compact-3d"
                      >
                        <FileEdit className="w-3.5 h-3.5" /> ซ่อน
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(asg)}
                      className="btn-danger-3d btn-compact-3d !px-3"
                      aria-label={`ลบ ${asg.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
