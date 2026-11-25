'use client';

import { useState, useMemo } from 'react';
import { Trophy, RotateCcw, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Top5Leaderboard, type Top5Item } from '@/components/Top5Leaderboard';
import { useToast } from '@/components/ToastProvider';
import type { ClassRoom, PublicStudent } from '@/types/database';

interface TeacherXpManagerProps {
  students: PublicStudent[];
  classes: ClassRoom[];
  top5Items: Top5Item[];
  initialClassId?: string;
  onRefresh: () => Promise<void>;
}

interface ConfirmResetState {
  mode: 'single' | 'class' | 'all';
  studentId?: string;
  classId?: string;
  label: string;
}

export function TeacherXpManager({
  students,
  classes,
  top5Items,
  initialClassId = 'ALL',
  onRefresh
}: TeacherXpManagerProps) {
  const { showToast } = useToast();
  const [classFilter, setClassFilter] = useState(initialClassId);
  const [query, setQuery] = useState('');
  const [resetting, setResetting] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmResetState | null>(null);

  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  const rankedStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter(s => classFilter === 'ALL' || s.classId === classFilter)
      .filter(s => {
        if (!q) return true;
        const full = `${s.studentId} ${s.prefix}${s.firstName} ${s.lastName}`.toLowerCase();
        return full.includes(q);
      })
      .sort((a, b) => (b.gameXp || 0) - (a.gameXp || 0) || a.number - b.number);
  }, [students, classFilter, query]);

  const totalXpInView = rankedStudents.reduce((sum, s) => sum + (s.gameXp || 0), 0);

  async function executeReset() {
    if (!confirmState) return;
    setResetting(true);
    try {
      const res = await fetch('/api/teacher/xp-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: confirmState.mode,
          studentId: confirmState.studentId,
          classId: confirmState.classId
        })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'รีเซ็ตคะแนน XP ไม่สำเร็จ', { kind: 'error' });
        return;
      }
      showToast(json.message || 'รีเซ็ตคะแนน XP เรียบร้อยแล้ว', { kind: 'success' });
      setConfirmState(null);
      await onRefresh();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* In-app Confirmation Modal (Zero window.confirm) */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ยืนยันการรีเซ็ตคะแนน XP"
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !resetting && setConfirmState(null)}
        >
          <div
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop border-2 border-[var(--color-danger)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-[var(--color-danger)]">
                  ยืนยันลบ/รีเซ็ตคะแนน XP
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  ต้องการรีเซ็ตคะแนน XP และอันดับเกมของ <strong>{confirmState.label}</strong> เป็น <strong>0</strong> ใช่หรือไม่?
                  (คะแนนเก็บ/ข้อสอบของนักเรียนจะไม่ถูกลบ)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmState(null)}
                className="btn-secondary-3d"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => void executeReset()}
                className="btn-danger-3d"
              >
                <RotateCcw className="w-4 h-4" />
                {resetting ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ตเป็น 0'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Leaderboard พร้อมปุ่มรีเซ็ตอันดับ XP บนการ์ดโดยตรง */}
      <Top5Leaderboard
        items={top5Items}
        onResetClick={() =>
          setConfirmState({
            mode: 'all',
            label: `นักเรียนทุกคนทุกห้องเรียน (${students.length} คน)`
          })
        }
        resetLabel="รีเซ็ตอันดับ XP ทั้งหมด"
      />

      {/* Full XP Management & Reset Panel */}
      <section className="tus-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-gold-bg)] text-[var(--color-gold)] border border-[var(--color-gold-border)] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                จัดการและรีเซ็ตอันดับคะแนน XP
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                ลบหรือรีเซ็ตคะแนน XP รายบุคคล เฉพาะห้อง หรือล้างอันดับใหม่ทั้งหมดได้ทันที (บันทึกใน Audit Log)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {classFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() =>
                  setConfirmState({
                    mode: 'class',
                    classId: classFilter,
                    label: `นักเรียนทั้งหมดในห้อง ${classMap.get(classFilter)?.name || classFilter}`
                  })
                }
                className="btn-danger-3d btn-compact-3d"
              >
                <RotateCcw className="w-4 h-4" /> รีเซ็ตห้อง {classMap.get(classFilter)?.name}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setConfirmState({
                  mode: 'all',
                  label: `นักเรียนทุกคนทุกห้องเรียน (${students.length} คน)`
                })
              }
              className="btn-danger-3d btn-compact-3d"
            >
              <Trash2 className="w-4 h-4" /> รีเซ็ต XP ทั้งหมดทุกห้อง
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4">
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="tus-input"
              aria-label="กรองตามห้องเรียน"
            >
              <option value="ALL">ทุกห้องเรียน ({students.length} คน)</option>
              {classes
                .filter(c => !c.archived)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    ห้อง {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..."
              className="tus-input !pl-10"
            />
          </div>
          <div className="sm:col-span-3 text-right text-xs text-[var(--text-secondary)] font-heading font-semibold">
            รวม XP ที่แสดง: <span className="text-[var(--color-gold)] font-bold">{totalXpInView.toLocaleString()} XP</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <th className="py-2.5 px-2.5 text-center w-14">อันดับ</th>
                <th className="py-2.5 px-2.5">ห้อง</th>
                <th className="py-2.5 px-2.5">รหัส</th>
                <th className="py-2.5 px-2.5">ชื่อ-สกุล</th>
                <th className="py-2.5 px-2.5 text-right">คะแนน XP</th>
                <th className="py-2.5 px-2.5 text-right hidden sm:table-cell">สถิติสูงสุด</th>
                <th className="py-2.5 px-2.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rankedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    ไม่พบรายชื่อนักเรียนที่ค้นหา
                  </td>
                </tr>
              ) : (
                rankedStudents.map((st, idx) => (
                  <tr key={st.studentId}>
                    <td className="py-2.5 px-2.5 text-center font-heading font-extrabold text-[var(--text-secondary)]">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-2.5 font-bold text-[var(--color-primary)] whitespace-nowrap">
                      {classMap.get(st.classId)?.name || '-'}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-xs sm:text-sm">{st.studentId}</td>
                    <td className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                      {st.prefix}
                      {st.firstName} {st.lastName}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-heading font-extrabold text-[var(--color-gold)]">
                      {(st.gameXp || 0).toLocaleString()} XP
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-xs text-[var(--text-secondary)] hidden sm:table-cell">
                      {(st.gameBestScore || 0).toLocaleString()} ({st.gamePlays || 0} ครั้ง)
                    </td>
                    <td className="py-2.5 px-2.5 text-right">
                      <button
                        type="button"
                        disabled={(st.gameXp || 0) === 0 && (st.gameBestScore || 0) === 0}
                        onClick={() =>
                          setConfirmState({
                            mode: 'single',
                            studentId: st.studentId,
                            label: `${st.prefix}${st.firstName} ${st.lastName} (${st.studentId})`
                          })
                        }
                        className="btn-danger-3d btn-compact-3d disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ต 0
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
