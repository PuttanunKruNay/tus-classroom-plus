'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Trash2,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Copy,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import type { Assignment, ClassRoom, PublicStudent, SubmissionRecord } from '@/types/database';

const QUICK_COMMENTS = ['ดีมาก', 'ชัดเจน ครบถ้วน', 'แก้ไขแล้วส่งใหม่', 'กรุณาถ่ายภาพให้ชัดขึ้น'];

interface TeacherLineGradingProps {
  submissions: SubmissionRecord[];
  students: PublicStudent[];
  classes: ClassRoom[];
  assignments: Assignment[];
  initialClassId?: string;
  onRefresh: () => Promise<void>;
}

export function TeacherLineGrading({
  submissions,
  students,
  classes,
  assignments,
  initialClassId = 'ALL',
  onRefresh
}: TeacherLineGradingProps) {
  const { showToast } = useToast();

  const [subTab, setSubTab] = useState<'pending' | 'duplicate' | 'graded'>('pending');
  const [classFilter, setClassFilter] = useState(initialClassId);
  const [asgFilter, setAsgFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, { score: string; comment: string }>>({});
  const [busyId, setBusyId] = useState('');

  // Zoomable Lightbox state
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const [zoom, setZoom] = useState(1);

  const studentMap = useMemo(() => new Map(students.map(s => [s.studentId, s])), [students]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);
  const lineAsgs = useMemo(() => assignments.filter(a => a.category === 'line'), [assignments]);
  const asgMap = useMemo(() => new Map(lineAsgs.map(a => [a.id, a])), [lineAsgs]);

  // กรองเฉพาะงาน LINE ที่ยังไม่ถูกลบ
  const allLineSubs = useMemo(
    () =>
      submissions
        .filter(s => !s.deletedAt && asgMap.has(s.assignmentId))
        .sort((a, b) => (b.submittedAt || b.updatedAt).localeCompare(a.submittedAt || a.updatedAt)),
    [submissions, asgMap]
  );

  // ตรวจจับส่งซ้ำอัตโนมัติ (นักเรียนคนเดียวกัน + งานเดียวกัน > 1 รายการ)
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, SubmissionRecord[]>();
    for (const sub of allLineSubs) {
      const key = `${sub.studentId}__${sub.assignmentId}`;
      const list = map.get(key) || [];
      list.push(sub);
      map.set(key, list);
    }
    const dupSet = new Set<string>();
    const groupMap = new Map<string, SubmissionRecord[]>();
    for (const [key, list] of map.entries()) {
      if (list.length > 1) {
        groupMap.set(key, list);
        list.forEach(item => dupSet.add(item.id));
      }
    }
    return { dupSet, groupMap };
  }, [allLineSubs]);

  const counts = useMemo(() => {
    const pending = allLineSubs.filter(s => s.status === 'pending_review').length;
    const duplicate = duplicateGroups.dupSet.size;
    const graded = allLineSubs.filter(s => s.status === 'graded').length;
    return { pending, duplicate, graded };
  }, [allLineSubs, duplicateGroups]);

  const filteredSubs = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allLineSubs.filter(sub => {
      if (subTab === 'pending' && sub.status !== 'pending_review') return false;
      if (subTab === 'graded' && sub.status !== 'graded') return false;
      if (subTab === 'duplicate' && !duplicateGroups.dupSet.has(sub.id)) return false;

      const st = studentMap.get(sub.studentId);
      if (classFilter !== 'ALL' && st?.classId !== classFilter) return false;
      if (asgFilter !== 'ALL' && sub.assignmentId !== asgFilter) return false;

      if (q) {
        const hay = `${sub.studentId} ${st?.firstName || ''} ${st?.lastName || ''} ${sub.lineName || ''} ${sub.note || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allLineSubs, subTab, duplicateGroups, studentMap, classFilter, asgFilter, searchText]);

  function getDraft(sub: SubmissionRecord) {
    const asg = asgMap.get(sub.assignmentId);
    const maxScore = asg?.maxScore || 10;
    return (
      drafts[sub.id] || {
        score: typeof sub.score === 'number' ? String(sub.score) : String(maxScore),
        comment: sub.teacherComment || ''
      }
    );
  }

  function updateDraft(sub: SubmissionRecord, patch: Partial<{ score: string; comment: string }>) {
    const cur = getDraft(sub);
    const asg = asgMap.get(sub.assignmentId);
    const maxScore = asg?.maxScore || 10;
    let nextScore = patch.score !== undefined ? patch.score : cur.score;

    // กันกรอกเกินคะแนนเต็มอัตโนมัติ
    if (patch.score !== undefined && patch.score !== '') {
      const n = Number(patch.score);
      if (!Number.isNaN(n)) {
        if (n > maxScore) {
          nextScore = String(maxScore);
          showToast(`คะแนนเต็มของงานนี้คือ ${maxScore} คะแนน`, { kind: 'info' });
        } else if (n < 0) {
          nextScore = '0';
        }
      }
    }

    setDrafts(prev => ({
      ...prev,
      [sub.id]: {
        score: nextScore,
        comment: patch.comment !== undefined ? patch.comment : cur.comment
      }
    }));
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    if (filteredSubs.every(s => selectedIds.has(s.id)) && filteredSubs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubs.map(s => s.id)));
    }
  }

  async function handleApproveOne(sub: SubmissionRecord) {
    const draft = getDraft(sub);
    const asg = asgMap.get(sub.assignmentId);
    const maxScore = asg?.maxScore || 10;
    const numericScore = Math.max(0, Math.min(maxScore, Number(draft.score || maxScore)));

    setBusyId(sub.id);
    try {
      const res = await fetch('/api/teacher/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: sub.id,
          studentId: sub.studentId,
          assignmentId: sub.assignmentId,
          score: numericScore,
          teacherComment: draft.comment
        })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'อนุมัติไม่สำเร็จ', { kind: 'error' });
        return;
      }

      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(sub.id);
        return next;
      });
      await onRefresh();

      showToast(`อนุมัติคะแนน ${numericScore}/${maxScore} เรียบร้อย`, {
        kind: 'success',
        undoLabel: 'เลิกทำ',
        onUndo: async () => {
          await fetch('/api/teacher/grade', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'undo_approve', id: sub.id })
          });
          await onRefresh();
          showToast('ยกเลิกการอนุมัติเรียบร้อยแล้ว', { kind: 'info' });
        }
      });
    } finally {
      setBusyId('');
    }
  }

  async function handleBulkApprove() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBusyId('BULK');
    try {
      const items = ids
        .map(id => allLineSubs.find(s => s.id === id))
        .filter((s): s is SubmissionRecord => Boolean(s))
        .map(sub => {
          const d = getDraft(sub);
          return {
            submissionId: sub.id,
            score: Number(d.score),
            teacherComment: d.comment || 'ดีมาก'
          };
        });

      const res = await fetch('/api/teacher/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_approve', items })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'อนุมัติแบบกลุ่มไม่สำเร็จ', { kind: 'error' });
        return;
      }
      setSelectedIds(new Set());
      await onRefresh();

      const approvedIds: string[] = json.approvedIds || ids;
      showToast(`อนุมัติพร้อมกัน ${approvedIds.length} รายการเรียบร้อย`, {
        kind: 'success',
        undoLabel: 'เลิกทำทั้งหมด',
        onUndo: async () => {
          await fetch('/api/teacher/grade', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'undo_approve', ids: approvedIds })
          });
          await onRefresh();
          showToast('ยกเลิกการอนุมัติแบบกลุ่มแล้ว', { kind: 'info' });
        }
      });
    } finally {
      setBusyId('');
    }
  }

  async function handleDeleteIds(targetIds: string[], label: string) {
    if (!targetIds.length) return;
    setBusyId(targetIds[0]);
    try {
      const res = await fetch(`/api/teacher/grade?ids=${encodeURIComponent(targetIds.join(','))}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'ลบรายการไม่สำเร็จ', { kind: 'error' });
        return;
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        targetIds.forEach(id => next.delete(id));
        return next;
      });
      await onRefresh();

      const deletedIds: string[] = json.deletedIds || targetIds;
      showToast(label, {
        kind: 'info',
        undoLabel: 'เลิกทำ',
        onUndo: async () => {
          await fetch('/api/teacher/grade', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'undo_delete', ids: deletedIds })
          });
          await onRefresh();
          showToast('กู้คืนรายการที่ลบเรียบร้อยแล้ว', { kind: 'success' });
        }
      });
    } finally {
      setBusyId('');
    }
  }

  // ลบอันเก่าทั้งหมดในกลุ่มส่งซ้ำ (เก็บเฉพาะอันล่าสุดไว้ 1 รายการ)
  async function handleDeleteOldDuplicates(groupKey: string) {
    const list = duplicateGroups.groupMap.get(groupKey) || [];
    if (list.length <= 1) return;
    const oldIds = list.slice(1).map(s => s.id);
    await handleDeleteIds(oldIds, `ลบรายการส่งซ้ำอันเก่า ${oldIds.length} รายการ (เก็บอันล่าสุดไว้แล้ว)`);
  }

  return (
    <div className="space-y-5">
      {/* Zoomable Lightbox Modal */}
      {lightbox && (
        <div
          role="dialog"
          aria-label="ขยายภาพหลักฐานการส่งงาน"
          className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => {
            setLightbox(null);
            setZoom(1);
          }}
        >
          <div
            className="flex items-center gap-2 mb-3 bg-black/70 px-4 py-2 rounded-2xl border border-white/20 text-white"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-sm font-heading font-semibold mr-2">{lightbox.title}</span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
              aria-label="ซูมออก"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
              aria-label="ซูมเข้า"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
              aria-label="รีเซ็ตขนาด"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setLightbox(null);
                setZoom(1);
              }}
              className="p-2 rounded-xl bg-[#DC2626] hover:bg-red-700 cursor-pointer ml-1"
              aria-label="ปิดภาพขยาย"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div
            className="max-w-full max-h-[82vh] overflow-auto rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.title}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}
              className="max-h-[80vh] rounded-2xl transition-transform duration-150"
            />
          </div>
        </div>
      )}

      {/* แถบแท็บ รอตรวจ / ส่งซ้ำ / ตรวจแล้ว */}
      <div className="tus-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'pending' as const, label: 'รอตรวจ', count: counts.pending },
              { id: 'duplicate' as const, label: 'ส่งซ้ำ', count: counts.duplicate },
              { id: 'graded' as const, label: 'ตรวจแล้ว', count: counts.graded }
            ].map(tab => {
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSubTab(tab.id);
                    setSelectedIds(new Set());
                  }}
                  className={`min-h-[44px] px-4 py-2 rounded-xl font-heading font-bold text-sm border-2 inline-flex items-center gap-2 cursor-pointer transition ${
                    active
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold ${
                      active ? 'bg-white/25 text-white' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* เลือกหลายรายการ + อนุมัติพร้อมกัน */}
          {filteredSubs.length > 0 && subTab !== 'graded' && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleSelectAllVisible} className="btn-secondary-3d btn-compact-3d">
                {filteredSubs.every(s => selectedIds.has(s.id)) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                เลือกทั้งหมด ({filteredSubs.length})
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  disabled={busyId === 'BULK'}
                  onClick={handleBulkApprove}
                  className="btn-primary-3d btn-compact-3d"
                >
                  <Layers className="w-4 h-4" />
                  อนุมัติที่เลือก ({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>

        {/* ตัวกรองตามห้อง / งาน / ค้นหาชื่อ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="ค้นหาชื่อนักเรียน รหัส หรือชื่อ LINE..."
              className="tus-input !pl-10"
            />
          </div>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="tus-input"
            aria-label="กรองตามห้องเรียน"
          >
            <option value="ALL">ทุกห้องเรียน</option>
            {classes.filter(c => !c.archived).map(c => (
              <option key={c.id} value={c.id}>
                ห้อง {c.name}
              </option>
            ))}
          </select>
          <select
            value={asgFilter}
            onChange={e => setAsgFilter(e.target.value)}
            className="tus-input"
            aria-label="กรองตามใบงาน"
          >
            <option value="ALL">ทุกใบงาน LINE</option>
            {lineAsgs.map(a => (
              <option key={a.id} value={a.id}>
                {a.code}: {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* แถบสรุปและปุ่มลบอันเก่าในคลิกเดียว เมื่ออยู่แท็บส่งซ้ำ */}
      {subTab === 'duplicate' && duplicateGroups.groupMap.size > 0 && (
        <div className="tus-card p-4 bg-[var(--color-primary-soft)] border-[var(--color-primary-border)] space-y-2.5">
          <div className="font-heading font-bold text-sm text-[var(--color-primary)] flex items-center gap-2">
            <Copy className="w-4 h-4" />
            พบนักเรียนส่งซ้ำ {duplicateGroups.groupMap.size} กลุ่ม (กดลบอันเก่าเพื่อเก็บเฉพาะครั้งล่าสุดในคลิกเดียว)
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(duplicateGroups.groupMap.entries()).map(([groupKey, list]) => {
              const st = studentMap.get(list[0].studentId);
              const asg = asgMap.get(list[0].assignmentId);
              return (
                <button
                  key={groupKey}
                  type="button"
                  onClick={() => handleDeleteOldDuplicates(groupKey)}
                  className="btn-danger-3d btn-compact-3d"
                >
                  <Trash2 className="w-4 h-4" />
                  ลบอันเก่าของ {st ? `${st.firstName} ${st.lastName}` : list[0].studentId} ({asg?.code}) — {list.length - 1} ชิ้น
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* รายการส่งงาน LINE */}
      {filteredSubs.length === 0 ? (
        <div className="tus-card p-10 text-center space-y-2">
          <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
            {subTab === 'pending'
              ? 'ไม่มีงานรอตรวจในขณะนี้ เยี่ยมมากครับ!'
              : subTab === 'duplicate'
                ? 'ไม่พบรายการส่งซ้ำในระบบ'
                : 'ยังไม่มีรายการที่ตรวจแล้วในตัวกรองนี้'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            ลองเปลี่ยนตัวกรองห้องเรียน ใบงาน หรือสลับไปยังแท็บอื่นด้านบน
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredSubs.map(sub => {
            const st = studentMap.get(sub.studentId);
            const cls = st ? classMap.get(st.classId) : null;
            const asg = asgMap.get(sub.assignmentId);
            const maxScore = asg?.maxScore || 10;
            const isDup = duplicateGroups.dupSet.has(sub.id);
            const groupKey = `${sub.studentId}__${sub.assignmentId}`;
            const isChecked = selectedIds.has(sub.id);
            const draft = getDraft(sub);
            const studentFullName = st ? `${st.prefix}${st.firstName} ${st.lastName}` : sub.studentId;

            return (
              <article
                key={sub.id}
                className={`tus-card p-5 space-y-4 border-2 ${
                  isChecked ? 'border-[var(--color-primary)]' : 'border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {subTab !== 'graded' && (
                      <button
                        type="button"
                        onClick={() => toggleSelect(sub.id)}
                        className="mt-1 text-[var(--color-primary)] cursor-pointer shrink-0"
                        aria-label={`เลือกรายการของ ${studentFullName}`}
                      >
                        {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                          {studentFullName}
                        </h3>
                        {cls && (
                          <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]">
                            {cls.name}
                          </span>
                        )}
                        {isDup && (
                          <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                            ส่งซ้ำ
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {asg?.code}: {asg?.title}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        LINE: <strong>{sub.lineName || '-'}</strong> • ส่งเมื่อ {sub.submittedAt || sub.updatedAt}
                      </p>
                    </div>
                  </div>

                  {/* ปุ่มลบ (ถังขยะ) พร้อม Undo 5 วินาที */}
                  <button
                    type="button"
                    disabled={busyId === sub.id}
                    onClick={() => handleDeleteIds([sub.id], `ลบรายการของ ${studentFullName} แล้ว`)}
                    className="btn-danger-3d btn-compact-3d !px-3 shrink-0"
                    title="ลบรายการนี้ (เลิกทำได้ใน 5 วินาที)"
                    aria-label="ลบรายการนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {sub.note && (
                  <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] text-sm text-[var(--text-primary)]">
                    หมายเหตุนักเรียน: {sub.note}
                  </div>
                )}

                {/* รูปหลักฐาน คลิกดู Lightbox ซูมได้ */}
                {sub.proofImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setLightbox({ src: sub.proofImage!, title: `${studentFullName} — ${asg?.code}` });
                    }}
                    className="w-full relative group rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface-muted)] cursor-zoom-in block"
                  >
                    <img
                      src={sub.proofImage}
                      alt={`หลักฐานการส่งงานของ ${studentFullName}`}
                      className="w-full h-48 object-contain"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-heading font-bold text-sm gap-1.5">
                      <ZoomIn className="w-5 h-5" /> คลิกขยายและซูมภาพ
                    </div>
                  </button>
                )}

                {/* ช่องคะแนนแสดงคะแนนเต็ม + ปุ่มคอมเมนต์สำเร็จรูป */}
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        step="0.5"
                        value={draft.score}
                        onChange={e => updateDraft(sub, { score: e.target.value })}
                        aria-label="คะแนนที่ได้"
                        className="tus-input !text-center font-heading font-bold"
                      />
                      <span className="font-heading font-bold text-sm text-[var(--text-secondary)] shrink-0">
                        / {maxScore}
                      </span>
                    </div>
                    <div className="col-span-7 sm:col-span-8">
                      <input
                        type="text"
                        value={draft.comment}
                        onChange={e => updateDraft(sub, { comment: e.target.value })}
                        placeholder="ความเห็นถึงนักเรียน..."
                        className="tus-input"
                      />
                    </div>
                  </div>

                  {/* ปุ่มคอมเมนต์สำเร็จรูป */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COMMENTS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateDraft(sub, { comment: preset })}
                        className="px-3 py-1 rounded-xl text-xs font-heading font-semibold bg-[var(--bg-surface-muted)] hover:bg-[var(--color-primary-soft)] text-[var(--text-secondary)] hover:text-[var(--color-primary)] border border-[var(--border-subtle)] cursor-pointer transition"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ปุ่มอนุมัติ + ปุ่มลบอันเก่าถ้าส่งซ้ำ */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busyId === sub.id}
                    onClick={() => handleApproveOne(sub)}
                    className="flex-1 btn-primary-3d"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {sub.status === 'graded'
                      ? `อัปเดตคะแนน (${draft.score}/${maxScore})`
                      : `อนุมัติ (${draft.score}/${maxScore})`}
                  </button>

                  {isDup && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOldDuplicates(groupKey)}
                      className="btn-secondary-3d"
                      title="ลบอันเก่าทั้งหมดของนักเรียนคนนี้ในงานนี้"
                    >
                      ลบอันเก่า
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
