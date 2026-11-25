'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Unlink,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import type { ClassRoom } from '@/types/database';

interface TeacherGradeSheetCardProps {
  classes: ClassRoom[];
  defaultSheetUrl: string;
  defaultSheetUpdatedAt?: string;
  selectedClassId: string;
  onRefresh: () => Promise<void>;
}

interface PreviewData {
  headers: string[];
  totalRows: number;
  previewRows: string[][];
}

export function TeacherGradeSheetCard({
  classes,
  defaultSheetUrl,
  defaultSheetUpdatedAt,
  selectedClassId,
  onRefresh
}: TeacherGradeSheetCardProps) {
  const { showToast } = useToast();
  const [scopeId, setScopeId] = useState<string>(selectedClassId || 'ALL');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setScopeId(selectedClassId || 'ALL');
  }, [selectedClassId]);

  useEffect(() => {
    if (scopeId === 'ALL') {
      setSheetUrl(defaultSheetUrl || '');
    } else {
      const cls = classes.find(c => c.id === scopeId);
      setSheetUrl(cls?.gradeSheetUrl || '');
    }
    setPreview(null);
    setErrorMsg('');
  }, [scopeId, defaultSheetUrl, classes]);

  const activeSavedUrl =
    scopeId === 'ALL'
      ? defaultSheetUrl
      : classes.find(c => c.id === scopeId)?.gradeSheetUrl || '';

  async function handleTest() {
    if (!sheetUrl.trim()) {
      showToast('กรุณาวางลิงก์ Google Sheets ก่อนทดสอบ', { kind: 'error' });
      return;
    }
    setTesting(true);
    setErrorMsg('');
    setPreview(null);
    try {
      const res = await fetch('/api/teacher/grade-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', classId: scopeId, sheetUrl: sheetUrl.trim() })
      });
      const json = await res.json();
      if (!json.ok) {
        setErrorMsg(json.message || 'ไม่สามารถดึงข้อมูลจากลิงก์นี้ได้');
        showToast(json.message || 'ทดสอบเชื่อมต่อไม่สำเร็จ', { kind: 'error' });
        return;
      }
      setPreview({
        headers: json.headers || [],
        totalRows: json.totalRows || 0,
        previewRows: json.previewRows || []
      });
      showToast(`ดึงข้อมูลสำเร็จ! พบ ${json.totalRows} แถว ${json.headers?.length || 0} คอลัมน์`, {
        kind: 'success'
      });
    } catch {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      showToast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ', { kind: 'error' });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(clear = false) {
    const nextUrl = clear ? '' : sheetUrl.trim();
    if (!clear && !nextUrl) {
      showToast('กรุณาวางลิงก์ Google Sheets จาก Google Drive', { kind: 'error' });
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/teacher/grade-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', classId: scopeId, sheetUrl: nextUrl })
      });
      const json = await res.json();
      if (!json.ok) {
        setErrorMsg(json.message || 'บันทึกไม่สำเร็จ');
        showToast(json.message || 'บันทึกไม่สำเร็จ', { kind: 'error' });
        return;
      }
      if (clear) {
        setSheetUrl('');
        setPreview(null);
        showToast('ยกเลิกการเชื่อม Google Sheets เรียบร้อย', { kind: 'info' });
      } else if (json.preview?.warning) {
        setErrorMsg(json.preview.warning);
        showToast('บันทึกลิงก์แล้ว แต่ยังดึงชีทไม่ได้ — ตรวจสอบสิทธิ์แชร์ไฟล์ใน Google Drive', { kind: 'info' });
      } else {
        showToast(
          `เชื่อมชีทสรุปคะแนนเรียบร้อย! ดึงได้ ${json.preview?.totalRows || 0} แถว — นักเรียนจะเห็นคะแนนตัวเองอัตโนมัติ`,
          { kind: 'success' }
        );
      }
      await onRefresh();
    } catch {
      showToast('บันทึกไม่สำเร็จ กรุณาลองใหม่', { kind: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const connectedRoomsCount =
    (defaultSheetUrl ? 1 : 0) + classes.filter(c => !c.archived && Boolean(c.gradeSheetUrl)).length;

  return (
    <section className="tus-card p-5 sm:p-6 space-y-4 border-2 border-[var(--color-primary-border)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
              เชื่อมชีทสรุปคะแนนจาก Google Drive (ดึงคะแนนให้นักเรียนอัตโนมัติ)
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              ครูวางลิงก์ Google Sheets สรุปคะแนนไว้ตรงนี้ ระบบจะดึงคะแนนจาก Drive และแสดงเฉพาะแถวของนักเรียนแต่ละคนในแท็บ “คะแนนของฉัน” อัตโนมัติ
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-xl text-xs font-heading font-bold inline-flex items-center gap-1.5 ${
            connectedRoomsCount > 0
              ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]'
              : 'bg-[var(--bg-surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {connectedRoomsCount > 0 ? `เชื่อมต่อแล้ว ${connectedRoomsCount} ชีท` : 'ยังไม่เชื่อมชีท Drive'}
        </span>
      </div>

      {/* Scope selector + URL input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4">
          <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
            เลือกขอบเขตห้องเรียน
          </label>
          <select
            value={scopeId}
            onChange={e => setScopeId(e.target.value)}
            className="tus-input"
          >
            <option value="ALL">
              ชีทรวมทุกห้องเรียน {defaultSheetUrl ? '(เชื่อมแล้ว ✓)' : ''}
            </option>
            {classes
              .filter(c => !c.archived)
              .map(c => (
                <option key={c.id} value={c.id}>
                  เฉพาะห้อง {c.name} {c.gradeSheetUrl ? '(เชื่อมแล้ว ✓)' : '(ใช้ชีทรวม)'}
                </option>
              ))}
          </select>
        </div>

        <div className="md:col-span-8">
          <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
            ลิงก์ Google Sheets สรุปคะแนนจาก Google Drive
          </label>
          <input
            type="url"
            value={sheetUrl}
            onChange={e => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/xxxxxxxxxxxxxxxx/edit#gid=0"
            className="tus-input font-mono text-sm"
          />
        </div>
      </div>

      {/* Privacy & Sharing Hint */}
      <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
        <div>
          <strong>วิธีตั้งค่าให้ดึงคะแนนได้ 100%:</strong> เปิดไฟล์ Google Sheets → กด <strong>แชร์ (Share)</strong> →
          เลือก <strong>ทุกคนที่มีลิงก์ (Anyone with the link) → ผู้มีสิทธิ์อ่าน (Viewer)</strong> แล้ววางลิงก์ด้านบน
          (ควรมีคอลัมน์ <strong>รหัสนักเรียน</strong> หรือ <strong>ชื่อ-นามสกุล</strong> เพื่อให้ระบบจับคู่ตรงตัว — นักเรียนจะมองเห็นเฉพาะคะแนนของตัวเองเท่านั้น)
          {defaultSheetUpdatedAt && scopeId === 'ALL' && (
            <span className="block text-[var(--text-muted)] mt-1">
              อัปเดตล่าสุด: {new Date(defaultSheetUpdatedAt).toLocaleString('th-TH')}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={testing || !sheetUrl.trim()}
          onClick={() => void handleTest()}
          className="btn-secondary-3d btn-compact-3d"
        >
          <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'กำลังดึงจาก Drive...' : 'ทดสอบดึงข้อมูล'}
        </button>

        <button
          type="button"
          disabled={saving || !sheetUrl.trim()}
          onClick={() => void handleSave(false)}
          className="btn-primary-3d btn-compact-3d"
        >
          <CheckCircle2 className="w-4 h-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกและเชื่อมชีท'}
        </button>

        {activeSavedUrl && (
          <>
            <a
              href={activeSavedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-3d btn-compact-3d"
            >
              <ExternalLink className="w-4 h-4" /> เปิดชีทใน Drive
            </a>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave(true)}
              className="btn-danger-3d btn-compact-3d"
            >
              <Unlink className="w-4 h-4" /> ยกเลิกการเชื่อม
            </button>
          </>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)] text-xs sm:text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Preview Table */}
      {preview && (
        <div className="rounded-2xl border border-[var(--color-success-border)] bg-[var(--bg-surface)] p-4 space-y-2.5">
          <div className="text-xs font-heading font-bold text-[var(--color-success)]">
            ตัวอย่างข้อมูลที่ดึงได้จาก Google Sheets (พบทั้งหมด {preview.totalRows} แถว • แสดง 5 แถวแรก)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="py-2 px-2.5 whitespace-nowrap font-heading font-bold">
                      {h || `คอลัมน์ ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {preview.previewRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {preview.headers.map((_, cIdx) => (
                      <td key={cIdx} className="py-2 px-2.5 whitespace-nowrap text-[var(--text-primary)]">
                        {row[cIdx] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
