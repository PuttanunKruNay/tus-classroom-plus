'use client';

import { useState, useMemo } from 'react';
import {
  MessageSquareWarning,
  Send,
  CheckCircle2,
  Clock,
  Mail,
  Trash2,
  Search
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import type { TeacherMessage } from '@/types/database';

interface TeacherIssueReportsProps {
  messages: TeacherMessage[];
  onRefresh: () => Promise<void>;
}

export function TeacherIssueReports({ messages, onRefresh }: TeacherIssueReportsProps) {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'all' | 'open' | 'replied' | 'puttanun' | 'apirom'>('all');
  const [query, setQuery] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const openCount = useMemo(() => messages.filter(m => m.status === 'open').length, [messages]);
  const puttanunCount = useMemo(() => messages.filter(m => m.teacherKey === 'puttanun').length, [messages]);
  const apiromCount = useMemo(() => messages.filter(m => m.teacherKey === 'apirom').length, [messages]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return messages.filter(m => {
      if (filter === 'open' && m.status !== 'open') return false;
      if (filter === 'replied' && m.status !== 'replied') return false;
      if (filter === 'puttanun' && m.teacherKey !== 'puttanun') return false;
      if (filter === 'apirom' && m.teacherKey !== 'apirom') return false;
      if (!q) return true;
      return `${m.studentId} ${m.studentName} ${m.className} ${m.subject} ${m.message}`
        .toLowerCase()
        .includes(q);
    });
  }, [messages, filter, query]);

  async function handleReply(item: TeacherMessage) {
    const text = (replyDrafts[item.id] ?? item.teacherReply ?? '').trim();
    if (!text) {
      showToast('กรุณาพิมพ์ข้อความตอบกลับนักเรียนก่อนส่ง', { kind: 'error' });
      return;
    }
    setBusyId(item.id);
    try {
      const res = await fetch('/api/teacher/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, reply: text })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'ส่งคำตอบไม่สำเร็จ', { kind: 'error' });
        return;
      }
      showToast(`ส่งคำตอบกลับไปยัง ${item.studentName} เรียบร้อยแล้ว`, { kind: 'success' });
      await onRefresh();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/teacher/messages?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.ok) {
        showToast('ลบรายการข้อความเรียบร้อย', { kind: 'info' });
        await onRefresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="tus-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary-border)] flex items-center justify-center shrink-0">
              <MessageSquareWarning className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                รายงานปัญหาและข้อความจากนักเรียน
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                ข้อความที่นักเรียนส่งจากปุ่มลอย “ติดต่อครูเนย์ / ครูขวัญ” จะแสดงที่นี่ทันที สามารถพิมพ์ตอบกลับให้นักเรียนเห็นในกล่องข้อความได้ทันที
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-heading font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-[var(--color-gold-bg)] text-[var(--color-gold)] border border-[var(--color-gold-border)]">
              รอตอบกลับ {openCount}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              ทั้งหมด {messages.length}
            </span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all' as const, label: `ทั้งหมด (${messages.length})` },
              { id: 'open' as const, label: `รอตอบกลับ (${openCount})` },
              { id: 'puttanun' as const, label: `ถึงครูเนย์ (${puttanunCount})` },
              { id: 'apirom' as const, label: `ถึงครูขวัญ (${apiromCount})` },
              { id: 'replied' as const, label: `ตอบแล้ว (${messages.length - openCount})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                  filter === tab.id
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อนักเรียน / หัวข้อ..."
              className="tus-input !pl-10 !min-h-[40px]"
            />
          </div>
        </div>
      </div>

      {/* Messages List */}
      {filtered.length === 0 ? (
        <div className="tus-card p-10 text-center space-y-2">
          <MessageSquareWarning className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
          <p className="font-heading font-bold text-base text-[var(--text-primary)]">
            ยังไม่มีรายงานปัญหาหรือข้อความจากนักเรียนในหมวดนี้
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            เมื่อนักเรียนส่งข้อความผ่านปุ่มลอย “ติดต่อครู” ข้อความจะเด้งขึ้นมาที่นี่ทันที
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const draft = replyDrafts[item.id] ?? item.teacherReply ?? '';
            return (
              <article key={item.id} className="tus-card p-5 space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.status === 'replied' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] font-heading font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ตอบแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[var(--color-gold-bg)] text-[var(--color-gold)] font-heading font-bold">
                          <Clock className="w-3.5 h-3.5" /> รอครูตอบกลับ
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-heading font-bold">
                        ถึง {item.teacherName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                        <Mail className="w-3.5 h-3.5" />
                        {item.emailSent ? 'แจ้งเตือนอีเมลแล้ว ✓' : item.teacherEmail}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                      {item.subject}
                    </h3>
                    <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      ผู้ส่ง: <strong className="text-[var(--text-primary)]">{item.studentName}</strong> • รหัส{' '}
                      <span className="font-mono font-semibold">{item.studentId}</span> • ห้อง{' '}
                      <strong>{item.className}</strong> • {new Date(item.createdAt).toLocaleString('th-TH')}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleDelete(item.id)}
                    className="btn-danger-3d btn-compact-3d !px-3"
                    title="ลบข้อความนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm sm:text-base whitespace-pre-wrap text-[var(--text-primary)]">
                  {item.message}
                </div>

                {item.teacherReply && (
                  <div className="p-3.5 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)] text-sm space-y-1">
                    <div className="text-xs font-heading font-bold text-[var(--color-success)]">
                      คำตอบล่าสุดโดย {item.repliedBy} {item.repliedAt ? `• ${item.repliedAt}` : ''}
                    </div>
                    <p className="whitespace-pre-wrap text-[var(--text-primary)]">{item.teacherReply}</p>
                  </div>
                )}

                {/* Inline Reply Box */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={e => setReplyDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder={`พิมพ์คำตอบกลับไปยัง ${item.studentName}...`}
                    className="tus-input flex-1"
                  />
                  <button
                    type="button"
                    disabled={busyId === item.id || !draft.trim()}
                    onClick={() => void handleReply(item)}
                    className="btn-primary-3d shrink-0 sm:self-end"
                  >
                    <Send className="w-4 h-4" />
                    {busyId === item.id ? 'กำลังส่ง...' : item.status === 'replied' ? 'อัปเดตคำตอบ' : 'ส่งคำตอบกลับ'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
