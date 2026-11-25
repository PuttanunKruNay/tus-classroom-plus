'use client';

import { Trophy, Gamepad2, RotateCcw } from 'lucide-react';

export interface Top5Item {
  rank: number;
  studentId: string;
  displayName: string;
  className: string;
  gameXp: number;
  gameBestScore?: number;
  isMe?: boolean;
}

interface Top5LeaderboardProps {
  items: Top5Item[];
  loading?: boolean;
  onPlayClick?: () => void;
  onResetClick?: () => void;
  resetLabel?: string;
}

export function Top5Leaderboard({
  items,
  loading,
  onPlayClick,
  onResetClick,
  resetLabel = 'รีเซ็ตอันดับ XP'
}: Top5LeaderboardProps) {
  const validItems = items.filter(item => (item.gameXp || 0) > 0).slice(0, 5);

  return (
    <section className="tus-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-[var(--color-gold)] flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
              อันดับ XP สูงสุด Top 5 (รวมทุกห้อง)
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              สะสมคะแนนจากเกม BLOCK MASTER PUZZLE
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onResetClick && (
            <button type="button" onClick={onResetClick} className="btn-danger-3d btn-compact-3d">
              <RotateCcw className="w-4 h-4" />
              {resetLabel}
            </button>
          )}
          {onPlayClick && (
            <button type="button" onClick={onPlayClick} className="btn-secondary-3d btn-compact-3d">
              <Gamepad2 className="w-4 h-4" />
              ไปเล่นเก็บ XP
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 skeleton" />
          ))}
        </div>
      ) : validItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)] p-6 text-center space-y-3">
          <p className="font-heading font-bold text-base text-[var(--text-primary)]">
            ยังไม่มีผู้สะสม XP — มาเป็นคนแรกกันเลย!
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            เข้าเล่นเกม BLOCK MASTER PUZZLE เพื่อขึ้นแท่นอันดับ 1 ของโรงเรียน
          </p>
          {onPlayClick && (
            <button type="button" onClick={onPlayClick} className="btn-primary-3d">
              <Gamepad2 className="w-5 h-5" /> เริ่มเล่นเป็นคนแรก
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {validItems.map(item => {
            const isFirst = item.rank === 1;
            return (
              <div
                key={item.studentId}
                className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-2 transition ${
                  isFirst
                    ? 'bg-[var(--color-gold-bg)] border-[var(--color-gold-border)]'
                    : item.isMe
                      ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-heading font-extrabold text-sm px-2.5 py-0.5 rounded-lg ${
                      isFirst
                        ? 'bg-[var(--color-gold-border)] text-white'
                        : 'bg-[var(--bg-surface)] text-[var(--color-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {isFirst ? 'อันดับ 1' : `อันดับ ${item.rank}`}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">{item.className}</span>
                </div>

                {/* แสดงชื่อเต็มหลายบรรทัดได้ ห้ามตัดด้วย ... */}
                <div className="font-heading font-bold text-base text-[var(--text-primary)] leading-snug break-words">
                  {item.displayName}
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span
                    className={`font-heading font-extrabold text-sm ${
                      isFirst ? 'text-[var(--color-gold)]' : 'text-[var(--color-primary)]'
                    }`}
                  >
                    {item.gameXp} XP
                  </span>
                  {item.isMe && (
                    <span className="text-xs font-bold text-[var(--color-primary)]">(ฉัน)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
