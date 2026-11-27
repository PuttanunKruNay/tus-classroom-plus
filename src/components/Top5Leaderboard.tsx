'use client';

import { Trophy, Gamepad2, RotateCcw, Crown } from 'lucide-react';

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
  const topXp = validItems[0]?.gameXp || 1;

  return (
    <section className="tus-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-[var(--color-gold)] flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-lg text-[var(--text-primary)] leading-snug">
              อันดับ XP สูงสุด Top 5 (รวมทุกห้อง)
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              สะสมคะแนนรวมจากเกม Blocky Blast 8×8 และเกมต่อวงจร TechTale
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 skeleton" />
          ))}
        </div>
      ) : validItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)] p-6 text-center space-y-3">
          <p className="font-heading font-bold text-base text-[var(--text-primary)]">
            ยังไม่มีผู้สะสม XP — มาเป็นคนแรกกันเลย!
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            เข้าเล่นเกม Blocky Blast 8×8 หรือเกมต่อวงจร TechTale เพื่อขึ้นแท่นอันดับ 1 ของโรงเรียน
          </p>
          {onPlayClick && (
            <button type="button" onClick={onPlayClick} className="btn-primary-3d">
              <Gamepad2 className="w-5 h-5" /> เริ่มเล่นเป็นคนแรก
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {validItems.map(item => {
            const isFirst = item.rank === 1;
            const barPct = Math.max(12, Math.min(100, Math.round((item.gameXp / topXp) * 100)));
            return (
              <div
                key={item.studentId}
                className={`rounded-2xl px-3.5 sm:px-4 py-3 border-2 transition ${
                  isFirst
                    ? 'bg-[var(--color-gold-bg)] border-[var(--color-gold-border)]'
                    : item.isMe
                      ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]'
                      : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* ซ้าย: ป้ายอันดับ 1 บรรทัดชัดเจน + ชื่อ-สกุล + ห้อง */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl font-heading font-extrabold text-sm sm:text-base flex items-center justify-center shrink-0 whitespace-nowrap ${
                        isFirst
                          ? 'bg-[var(--color-gold-border)] text-white shadow-sm'
                          : 'bg-[var(--bg-surface)] text-[var(--color-primary)] border border-[var(--border-strong)]'
                      }`}
                      aria-label={`อันดับ ${item.rank}`}
                    >
                      {isFirst ? <Crown className="w-5 h-5" /> : `#${item.rank}`}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)] leading-snug">
                          {item.displayName}
                        </span>
                        <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] whitespace-nowrap shrink-0">
                          {item.className}
                        </span>
                        {item.isMe && (
                          <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-lg bg-[var(--color-primary)] text-white whitespace-nowrap shrink-0">
                            ฉัน
                          </span>
                        )}
                      </div>

                      {/* แถบเทียบคะแนนแบบบางเรียบร้อย */}
                      <div className="mt-1.5 h-1.5 w-full max-w-md rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFirst ? 'bg-[var(--color-gold-border)]' : 'bg-[var(--color-primary)]'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ขวา: คะแนน XP เรียงตรงแนวเดียวกันทุกแถว */}
                  <div className="text-right shrink-0 pl-2">
                    <div
                      className={`font-heading font-extrabold text-base sm:text-lg tabular-nums whitespace-nowrap ${
                        isFirst ? 'text-[var(--color-gold)]' : 'text-[var(--color-primary)]'
                      }`}
                    >
                      {item.gameXp.toLocaleString()} XP
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-heading whitespace-nowrap">
                      อันดับ {item.rank}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
