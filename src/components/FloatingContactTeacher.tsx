'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  X,
  Send,
  CheckCircle2,
  Clock,
  Inbox,
  ExternalLink,
  MessageCircleHeart
} from 'lucide-react';
import { TEACHER_CONTACTS, type TeacherContactInfo } from '@/lib/teacher-contacts';
import { useToast } from '@/components/ToastProvider';
import type { TeacherMessage } from '@/types/database';

interface FloatingContactTeacherProps {
  studentId: string;
  studentName: string;
  classNameLabel: string;
}

export function FloatingContactTeacher({
  studentId,
  studentName,
  classNameLabel
}: FloatingContactTeacherProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'compose' | 'inbox'>('compose');
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherContactInfo>(TEACHER_CONTACTS[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<TeacherMessage[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoadingInbox(true);
    try {
      const res = await fetch('/api/student/contact-teacher', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok && Array.isArray(json.messages)) {
        setHistory(json.messages);
      }
    } catch {
      // silent
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (open) {
      void loadMessages();
    }
  }, [open, loadMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('กรุณากรอกหัวข้อและข้อความที่ต้องการแจ้งครู', { kind: 'error' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/student/contact-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherKey: selectedTeacher.key,
          subject: subject.trim(),
          message: message.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast(json.message || 'ส่งข้อความไม่สำเร็จ', { kind: 'error' });
        return;
      }

      showToast(
        json.emailSent
          ? `ส่งข้อความถึง${selectedTeacher.shortName} และแจ้งเตือนอีเมลเรียบร้อยแล้ว!`
          : `ส่งข้อความเข้าระบบ${selectedTeacher.shortName}เรียบร้อยแล้ว! ครูจะเห็นข้อความทันที`,
        { kind: 'success' }
      );
      setSubject('');
      setMessage('');
      setMode('inbox');
      await loadMessages();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setSending(false);
    }
  }

  const repliedCount = history.filter(m => m.status === 'replied').length;

  const mailtoHref = `mailto:${encodeURIComponent(selectedTeacher.email)}?subject=${encodeURIComponent(
    `[TUS Classroom] ${subject || 'สอบถาม/แจ้งปัญหาจากนักเรียน'} (${studentName} ${studentId})`
  )}&body=${encodeURIComponent(
    `ผู้ส่ง: ${studentName} (รหัส ${studentId} • ห้อง ${classNameLabel})\n\n${message}`
  )}`;

  return (
    <div className="fixed bottom-[calc(4.8rem+env(safe-area-inset-bottom))] left-3 md:left-auto md:bottom-24 md:right-4 z-50">
      {open && (
        <div
          role="dialog"
          aria-label="ติดต่อคุณครูผู้สอน"
          className="fixed inset-x-3 bottom-[calc(8.6rem+env(safe-area-inset-bottom))] md:static md:mb-3 md:w-[400px] h-[min(68dvh,540px)] tus-card overflow-hidden flex flex-col shadow-2xl border-2 border-[var(--color-primary-border)] animate-scale-pop"
        >
          {/* Header */}
          <div className="bg-[var(--color-primary)] text-white px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={selectedTeacher.avatarUrl}
                alt={selectedTeacher.shortName}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/80 bg-white shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-base leading-tight truncate">
                  ติดต่อคุณครูผู้สอน
                </h3>
                <p className="text-xs text-white/90 truncate">
                  ส่งข้อความขึ้นระบบครู + แจ้งเตือนอีเมลครู
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer shrink-0"
              aria-label="ปิดหน้าต่างติดต่อครู"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="p-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setMode('compose')}
              className={`min-h-[38px] rounded-xl text-xs font-heading font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                mode === 'compose'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> เขียนข้อความ / แจ้งปัญหา
            </button>
            <button
              type="button"
              onClick={() => setMode('inbox')}
              className={`min-h-[38px] rounded-xl text-xs font-heading font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                mode === 'inbox'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" /> กล่องข้อความ ({history.length})
              {repliedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--color-success)] text-white text-[10px]">
                  {repliedCount}
                </span>
              )}
            </button>
          </div>

          {mode === 'compose' ? (
            <form onSubmit={handleSend} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 bg-[var(--bg-surface-muted)]">
              {/* Step 1: เลือกคุณครู */}
              <div className="space-y-1.5">
                <label className="block text-xs font-heading font-bold text-[var(--text-secondary)]">
                  เลือกคุณครูที่ต้องการติดต่อ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEACHER_CONTACTS.map((t, idx) => {
                    const active = selectedTeacher.key === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setSelectedTeacher(t)}
                        className={`p-2.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center gap-2 ${
                          active
                            ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <img
                          src={t.avatarUrl}
                          alt={t.shortName}
                          className="w-10 h-10 rounded-full object-cover border border-[var(--border-strong)] bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-heading font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                            {idx + 1}. ติดต่อ{t.shortName}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">{t.email}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Subject Chips */}
              <div className="flex flex-wrap gap-1.5">
                {['แจ้งปัญหาส่งงานไม่ได้', 'สอบถามเนื้อหาบทเรียน', 'สอบถามคะแนน', 'ลืม/ขอความช่วยเหลือ'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSubject(tag)}
                    className="px-2.5 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] font-heading font-semibold text-[var(--color-primary)] hover:border-[var(--color-primary)] cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  หัวข้อเรื่อง *
                </label>
                <input
                  type="text"
                  required
                  maxLength={140}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="เช่น ส่งงานใบงานที่ 2 ไม่ได้ครับ"
                  className="tus-input !min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  รายละเอียดข้อความถึง{selectedTeacher.shortName} *
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={1500}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={`พิมพ์ข้อความถึง${selectedTeacher.shortName} เหมือนส่งอีเมล...`}
                  className="tus-input"
                />
              </div>

              <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-xl px-3 py-2 border border-[var(--border-subtle)]">
                ปลายทาง: <strong className="text-[var(--text-primary)]">{selectedTeacher.fullName}</strong>
                <div className="font-mono truncate">{selectedTeacher.email}</div>
              </div>

              <div className="flex flex-col gap-2">
                <button type="submit" disabled={sending} className="w-full btn-primary-3d">
                  <Send className="w-4 h-4" />
                  {sending ? 'กำลังส่งข้อความ...' : `ส่งข้อความถึง${selectedTeacher.shortName}`}
                </button>
                <a
                  href={mailtoHref}
                  className="w-full btn-secondary-3d btn-compact-3d text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> เปิดส่งผ่านแอปอีเมลบนเครื่อง (mailto)
                </a>
              </div>
            </form>
          ) : (
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 bg-[var(--bg-surface-muted)]">
              {loadingInbox ? (
                <div className="space-y-2.5">
                  <div className="h-24 skeleton" />
                  <div className="h-24 skeleton" />
                </div>
              ) : history.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
                  <MessageCircleHeart className="w-8 h-8 text-[var(--color-primary)] mx-auto" />
                  <p className="font-heading font-bold text-sm text-[var(--text-primary)]">
                    ยังไม่มีข้อความที่ส่งหาครู
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    หากติดปัญหาการใช้งานหรือต้องการถามครู กดแท็บ “เขียนข้อความ” ได้เลยครับ
                  </p>
                </div>
              ) : (
                history.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-heading font-bold text-[var(--color-primary)]">
                        ถึง {item.teacherName}
                      </span>
                      {item.status === 'replied' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> ครูตอบแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-gold-bg)] text-[var(--color-gold)] font-bold">
                          <Clock className="w-3 h-3" /> รอครูตอบ
                        </span>
                      )}
                    </div>
                    <div className="font-heading font-bold text-sm text-[var(--text-primary)]">
                      {item.subject}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                      {item.message}
                    </p>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      ส่งเมื่อ {new Date(item.createdAt).toLocaleString('th-TH')}
                    </div>

                    {item.teacherReply && (
                      <div className="p-3 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-[var(--color-success)] space-y-1">
                        <div className="text-[11px] font-heading font-bold">
                          คำตอบจาก {item.repliedBy || item.teacherName} {item.repliedAt ? `• ${item.repliedAt}` : ''}
                        </div>
                        <p className="text-xs whitespace-pre-wrap text-[var(--text-primary)]">
                          {item.teacherReply}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ปุ่มรูปลอยติดต่อครู (กะทัดรัดบนมือถือไม่บังเกม) */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-xl border-2 border-[var(--color-primary)] border-b-4 border-b-[var(--color-primary-shadow)] active:translate-y-1 transition flex items-center justify-center cursor-pointer overflow-visible group"
        aria-label={open ? 'ปิดหน้าต่างติดต่อครู' : 'ติดต่อคุณครูผู้สอน'}
        title="ติดต่อครูเนย์ / ครูขวัญ"
      >
        {open ? (
          <div className="w-full h-full rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center">
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        ) : (
          <>
            <img
              src="/assets/teacher_portrait.jpg"
              alt="ติดต่อครู"
              className="w-full h-full rounded-full object-cover"
            />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-heading font-bold whitespace-nowrap shadow">
              ติดต่อครู
            </span>
            {repliedCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[var(--color-success)] text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-white">
                {repliedCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
