'use client';

import { useMemo, useState } from 'react';
import { Play, RotateCcw, Sparkles, Info, Power, Minimize2, Maximize2 } from 'lucide-react';
import { CODE_GLOSSARY, type CodingTask, type GlossaryEntry } from '@/lib/techtale-data';

interface TechTaleCodingGameProps {
  task: CodingTask;
  lessonTitle: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onComplete: () => void;
}

const KEYWORDS = new Set(['void', 'int', 'const', 'unsigned', 'long', 'bool', 'for', 'if', 'else']);
const FUNCS = new Set(['setup', 'loop', 'setFanSpeed', 'Serial']);
const BUILTINS = new Set([
  'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead',
  'delay', 'tone', 'millis', 'begin', 'println'
]);
const CONSTS = new Set(['OUTPUT', 'INPUT', 'INPUT_PULLUP', 'HIGH', 'LOW', 'true', 'false']);

function renderHighlightedText(text: string) {
  if (text.trim().startsWith('//')) {
    return <span className="text-neutral-400 italic">{text}</span>;
  }
  const tokens = text.split(/([A-Za-z0-9_]+)/);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (KEYWORDS.has(tok)) return <span key={i} className="text-pink-400">{tok}</span>;
    if (FUNCS.has(tok)) return <span key={i} className="text-cyan-300">{tok}</span>;
    if (BUILTINS.has(tok)) return <span key={i} className="text-emerald-400">{tok}</span>;
    if (CONSTS.has(tok)) return <span key={i} className="text-yellow-300">{tok}</span>;
    if (/^\d+$/.test(tok)) return <span key={i} className="text-orange-400">{tok}</span>;
    return <span key={i} className="text-neutral-100">{tok}</span>;
  });
}

export function TechTaleCodingGame({
  task,
  lessonTitle,
  isMinimized,
  onToggleMinimize,
  onComplete
}: TechTaleCodingGameProps) {
  const [poweredOn, setPoweredOn] = useState(false);
  const [booting, setBooting] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [selectedBlank, setSelectedBlank] = useState<number>(0);
  const [wrongBlanks, setWrongBlanks] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [execState, setExecState] = useState<'idle' | 'compiling' | 'uploading' | 'success'>('idle');

  const blankIds = useMemo(
    () => task.codeTemplate.filter(b => b.kind === 'blank').map(b => (b as { kind: 'blank'; id: number }).id),
    [task.codeTemplate]
  );

  // Split template into display lines
  const codeLines = useMemo(() => {
    const lines: Array<Array<{ kind: 'text'; value: string } | { kind: 'blank'; id: number }>> = [[]];
    for (const block of task.codeTemplate) {
      if (block.kind === 'text') {
        const parts = block.value.split('\n');
        parts.forEach((p, idx) => {
          if (idx > 0) lines.push([]);
          if (p) lines[lines.length - 1].push({ kind: 'text', value: p });
        });
      } else {
        lines[lines.length - 1].push(block);
      }
    }
    return lines;
  }, [task.codeTemplate]);

  const getGlossary = (word: string): GlossaryEntry | undefined =>
    task.glossary?.[word] || CODE_GLOSSARY[word];

  function handlePowerOn() {
    setBooting(true);
    setTimeout(() => {
      setBooting(false);
      setPoweredOn(true);
    }, 700);
  }

  function handleChooseOption(opt: string) {
    if (execState !== 'idle') return;
    const nextAnswers = { ...userAnswers, [selectedBlank]: opt };
    setUserAnswers(nextAnswers);
    setWrongBlanks(prev => {
      const next = new Set(prev);
      next.delete(selectedBlank);
      return next;
    });
    setFeedback(null);
    const nextEmpty = blankIds.find(id => !nextAnswers[id]);
    if (nextEmpty !== undefined) setSelectedBlank(nextEmpty);
  }

  function handleRunCode() {
    const missing = blankIds.filter(id => !userAnswers[id]);
    if (missing.length > 0) {
      setSelectedBlank(missing[0]);
      setFeedback(`ยังเติมไม่ครบ! เหลืออีก ${missing.length} ช่อง`);
      return;
    }

    const wrong = new Set(
      blankIds.filter(id => id < task.correctAnswers.length && userAnswers[id] !== task.correctAnswers[id])
    );

    setFeedback(null);
    setWrongBlanks(new Set());
    setExecState('compiling');

    setTimeout(() => setExecState('uploading'), 550);
    setTimeout(() => {
      if (wrong.size === 0) {
        setExecState('success');
        setTimeout(() => onComplete(), 800);
      } else {
        setExecState('idle');
        setWrongBlanks(wrong);
        const firstWrong = blankIds.find(id => wrong.has(id));
        if (firstWrong !== undefined) setSelectedBlank(firstWrong);
        setFeedback(`มี ${wrong.size} ช่องที่ยังไม่ถูก (กรอบสีแดง) ลองอ่านคำอธิบายคำสั่งแล้วเลือกใหม่นะครับ`);
      }
    }, 1150);
  }

  const activeWord = userAnswers[selectedBlank];
  const activeGlossary = activeWord ? getGlossary(activeWord) : undefined;

  if (isMinimized) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-100 to-indigo-100 dark:from-pink-950/60 dark:to-indigo-950/60 border-2 border-[var(--color-primary)]">
        <div className="flex items-center gap-2 font-heading font-bold text-sm text-[var(--color-primary)]">
          <span>🐱</span>
          <span>TechOS v2.0 — {execState === 'success' ? 'อัปโหลดโค้ดสำเร็จแล้ว!' : 'ย่อหน้าจอเขียนโค้ดอยู่'}</span>
        </div>
        <button type="button" onClick={onToggleMinimize} className="btn-secondary-3d btn-compact-3d">
          <Maximize2 className="w-4 h-4" /> ขยายหน้าจอโค้ด
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-scale-pop">
      {/* พี่นีโอแนะนำก่อนเขียนโค้ด */}
      {poweredOn && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500/40 flex items-start gap-3">
          <span className="text-3xl shrink-0">👨‍💻</span>
          <div className="text-sm">
            <div className="font-heading font-bold text-blue-600 dark:text-blue-300">พี่นีโอ (ผู้เชี่ยวชาญ) ✨</div>
            <p className="text-[var(--text-primary)]">
              ถึงเวลาเขียนโปรแกรมให้บอร์ดแล้ว! แตะช่อง <strong>?</strong> ในโค้ด แล้วเลือกคำสั่งด้านล่าง — เติมครบแล้วกด <strong>รันโค้ด (RUN CODE)</strong> ได้เลย
            </p>
          </div>
        </div>
      )}

      {/* จอคอมพิวเตอร์ TechOS v2.0 */}
      <div className="rounded-3xl p-3 sm:p-4 bg-gradient-to-br from-pink-100 via-rose-50 to-indigo-100 dark:from-[#381B29] dark:via-[#261621] dark:to-[#1C1E33] border-[3px] border-neutral-900 shadow-xl space-y-3">
        {/* Top Bezel */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-neutral-900 border-2 border-neutral-900 text-xs font-heading font-bold text-[#B8194F]">
              🐱💖 TechOS v2.0
            </span>
            <span className="text-xs font-heading font-semibold text-[var(--text-secondary)] hidden sm:inline">
              {lessonTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold ${poweredOn ? 'text-emerald-600' : 'text-red-500'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${poweredOn ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {poweredOn ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-1.5 rounded-full bg-amber-500 text-white border-2 border-neutral-900 cursor-pointer"
              title="ย่อหน้าจอเพื่อดูวงจร"
              aria-label="ย่อหน้าจอเขียนโค้ด"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inner Dark Screen */}
        <div className="rounded-2xl bg-[#101322] border-[3px] border-neutral-900 p-4 sm:p-5 text-white min-h-[300px] flex flex-col justify-center">
          {!poweredOn && !booting ? (
            <div className="py-10 text-center space-y-4">
              <button
                type="button"
                onClick={handlePowerOn}
                className="mx-auto flex flex-col items-center gap-3 cursor-pointer group"
              >
                <span className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:scale-105 transition">
                  <Power className="w-12 h-12 text-pink-400" />
                </span>
                <span className="btn-primary-3d">
                  ✨ กดตรงนี้เพื่อเปิดคอมพิวเตอร์ TechOS ✨
                </span>
              </button>
            </div>
          ) : booting ? (
            <div className="py-12 text-center space-y-3">
              <div className="text-4xl animate-bounce">🐱⚡</div>
              <div className="font-heading font-bold text-lg text-pink-300">กำลังเปิดระบบ TechOS...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* โจทย์เขียนโค้ด */}
              <div className="px-4 py-2.5 rounded-xl bg-white/10 border border-yellow-400/50 text-yellow-200 text-sm sm:text-base font-heading font-bold">
                🎯 {task.instruction}
              </div>

              {/* Code Editor */}
              <div className="relative rounded-xl bg-[#0a0c16] border-2 border-pink-500/40 p-3.5 overflow-x-auto font-mono text-sm leading-7">
                {execState === 'success' && (
                  <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-lg bg-emerald-500 text-white font-heading font-bold text-xs animate-scale-pop">
                    ✨ 🎉 อัปโหลดสำเร็จ!
                  </div>
                )}
                {codeLines.map((tokens, lineIdx) => (
                  <div key={lineIdx} className="flex items-center whitespace-pre min-h-[28px]">
                    <span className="w-7 text-right pr-3 text-pink-400/50 select-none shrink-0 text-xs">
                      {String(lineIdx + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center flex-wrap">
                      {tokens.map((tok, tIdx) =>
                        tok.kind === 'text' ? (
                          <span key={tIdx}>{renderHighlightedText(tok.value)}</span>
                        ) : (
                          <button
                            key={tIdx}
                            type="button"
                            disabled={execState !== 'idle'}
                            onClick={() => setSelectedBlank(tok.id)}
                            className={`mx-1 my-0.5 min-h-[38px] min-w-[54px] px-3 py-1 rounded-lg font-mono font-bold text-sm sm:text-base border-2 cursor-pointer transition ${
                              wrongBlanks.has(tok.id)
                                ? 'bg-red-500/25 border-red-500 text-red-300'
                                : selectedBlank === tok.id
                                  ? 'bg-pink-500/35 border-pink-400 text-white scale-105 ring-2 ring-pink-300/60'
                                  : userAnswers[tok.id]
                                    ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-300'
                                    : 'bg-white/10 border-dashed border-pink-300/70 text-pink-300'
                            }`}
                          >
                            {userAnswers[tok.id] || ' ? '}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* การ์ดอธิบายคำสั่ง (Live Glossary) */}
              {activeGlossary ? (
                <div
                  className="p-3 rounded-xl bg-white/10 border-2 flex items-start gap-2.5 text-sm"
                  style={{ borderColor: activeGlossary.color }}
                >
                  <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: activeGlossary.color }} />
                  <div>
                    <div className="font-heading font-bold" style={{ color: activeGlossary.color }}>
                      {activeGlossary.title}
                    </div>
                    <div className="text-neutral-200 text-xs sm:text-sm">{activeGlossary.desc}</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                  แตะช่อง <strong>?</strong> ในโค้ด แล้วเลือกคำสั่งด้านล่าง ระบบจะอธิบายความหมายให้ทันที!
                </div>
              )}

              {/* แถบเลือกคำสั่ง */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-heading font-bold text-pink-300">
                  <span>
                    🎀 เลือกคำสั่งลงในช่องที่ {(blankIds.indexOf(selectedBlank) >= 0 ? blankIds.indexOf(selectedBlank) : 0) + 1}:
                  </span>
                  {Object.keys(userAnswers).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserAnswers({});
                        setWrongBlanks(new Set());
                        setFeedback(null);
                        setSelectedBlank(blankIds[0] ?? 0);
                      }}
                      className="text-neutral-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> ล้างคำตอบ
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {task.options.map(opt => {
                    const isCurrent = userAnswers[selectedBlank] === opt;
                    const gl = getGlossary(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={execState !== 'idle'}
                        onClick={() => handleChooseOption(opt)}
                        className={`min-h-[48px] px-4 py-2.5 rounded-xl font-mono font-black text-sm sm:text-base border-2 border-black cursor-pointer transition inline-flex items-center gap-2 ${
                          isCurrent
                            ? 'bg-yellow-300 text-neutral-950 scale-105 shadow-md'
                            : 'bg-white text-neutral-950 hover:bg-pink-100'
                        }`}
                      >
                        <span>{opt}</span>
                        {gl && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: gl.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {feedback && (
                <div className="px-3.5 py-2.5 rounded-xl bg-red-600/90 border border-white/50 text-white text-sm font-heading font-bold">
                  😿 {feedback}
                </div>
              )}

              {/* ปุ่มรันโค้ด */}
              <button
                type="button"
                disabled={execState !== 'idle'}
                onClick={handleRunCode}
                className="w-full min-h-[50px] rounded-2xl font-heading font-extrabold text-base text-white border-2 border-white/80 cursor-pointer transition flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-emerald-600 to-green-500 hover:brightness-110 disabled:opacity-75"
              >
                <Play className="w-5 h-5" />
                {execState === 'compiling'
                  ? '⚡ Compiling...'
                  : execState === 'uploading'
                    ? '📡 Uploading to board...'
                    : execState === 'success'
                      ? '🎉 โค้ดทำงานแล้ว!'
                      : '🚀 รันโค้ด (RUN CODE)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
