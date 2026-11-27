'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Cpu,
  Trophy,
  HelpCircle,
  BookOpen,
  ArrowLeft,
  Play,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  Flame,
  Sparkles,
  Wrench,
  SkipForward,
  Lock,
  Film,
  X
} from 'lucide-react';
import {
  BOARD_PINS_LOGICAL,
  CHARACTER_REGISTRY,
  POINTS_PER_LEVEL,
  TECHTALE_ACHIEVEMENTS,
  TECHTALE_DAILY_QUIZ_BANK,
  TECHTALE_LEVELS,
  TECHTALE_MISSIONS,
  TECHTALE_RANKS,
  formatBoardPinDisplay,
  formatBoardPinLabel,
  type TechTaleLevelId,
  type TechTaleMission,
  type TechTaleProgress
} from '@/lib/techtale-data';
import {
  RealisticResistor220,
  TechTaleDeviceVisual,
  VectorBoardArt
} from '@/components/techtale/TechTaleDevices';
import { TechTaleCodingGame } from '@/components/techtale/TechTaleCodingGame';
import { useToast } from '@/components/ToastProvider';

interface TechTaleCircuitLabProps {
  studentId: string;
  studentName: string;
  currentXp?: number;
  dailyXpUsed?: number;
  dailyXpCap?: number;
  onSyncSchoolXp?: (
    circuitPoints: number,
    label: string
  ) => Promise<{ ok?: boolean; awardedXp?: number; gameXp?: number; message?: string } | void>;
}

type HubSubView = 'missions' | 'quiz' | 'achievements';
type MissionStep = 'intro' | 'board' | 'wiring' | 'coding' | 'running' | 'outro';

interface Point {
  x: number;
  y: number;
}

const DEFAULT_PROGRESS: TechTaleProgress = {
  points: 0,
  completedKeys: [],
  unlockedBadges: [],
  quizStreak: 0,
  quizCorrectTotal: 0,
  lastQuizDay: null
};

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayKey(): string {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bezierPath(start: Point, end: Point): string {
  const dist = Math.hypot(end.x - start.x, end.y - start.y);
  const c1x = start.x;
  const c1y = start.y + dist * 0.28;
  const c2x = end.x;
  const c2y = end.y - dist * 0.28;
  return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
}

export function TechTaleCircuitLab({
  studentId,
  studentName,
  currentXp = 0,
  dailyXpUsed = 0,
  dailyXpCap = 150,
  onSyncSchoolXp
}: TechTaleCircuitLabProps) {
  const { showToast } = useToast();
  const storageKey = `tus_techtale_progress_${studentId || 'guest'}`;

  const [progress, setProgress] = useState<TechTaleProgress>(DEFAULT_PROGRESS);
  const [subView, setSubView] = useState<HubSubView>('missions');
  const [selectedLevel, setSelectedLevel] = useState<TechTaleLevelId>('primary');
  const [showTutorial, setShowTutorial] = useState(false);

  // Active Mission State
  const [activeMission, setActiveMission] = useState<TechTaleMission | null>(null);
  const [missionStep, setMissionStep] = useState<MissionStep>('intro');
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [boardType, setBoardType] = useState<'Arduino' | 'ESP32'>('Arduino');

  // Wiring Lab State (รองรับแตะเลือกได้ทั้ง 2 ทาง: พิน→ขั้ว และ ขั้ว→พิน รวมถึงลากสายบนมือถือ)
  const [connections, setConnections] = useState<Record<string, string>>({}); // terminalId -> boardPin
  const [enabledParts, setEnabledParts] = useState<string[]>([]);
  const [selectedBoardPin, setSelectedBoardPin] = useState<string | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<string | null>(null);
  const [draggingPin, setDraggingPin] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<Point | null>(null);
  const [hoveredTerminal, setHoveredTerminal] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showMentorTip, setShowMentorTip] = useState(true);
  const [hasExploded, setHasExploded] = useState(false);
  const [wiringError, setWiringError] = useState<string | null>(null);
  const [computerMinimized, setComputerMinimized] = useState(false);
  const [wiringXpSynced, setWiringXpSynced] = useState(false);

  const dragStartRef = useRef<{
    pin: string;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  // Canvas Geometry Refs for accurate SVG Bezier Wires
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const boardPinEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const terminalEls = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pinCoords, setPinCoords] = useState<Record<string, Point>>({});
  const [termCoords, setTermCoords] = useState<Record<string, Point>>({});

  // Daily Quiz State
  const [quizChoice, setQuizChoice] = useState<number | null>(null);

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TechTaleProgress>;
        setProgress({
          points: Number(parsed.points) || 0,
          completedKeys: Array.isArray(parsed.completedKeys) ? parsed.completedKeys : [],
          unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
          quizStreak: Number(parsed.quizStreak) || 0,
          quizCorrectTotal: Number(parsed.quizCorrectTotal) || 0,
          lastQuizDay: parsed.lastQuizDay || null
        });
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const commitProgress = useCallback(
    (updater: (prev: TechTaleProgress) => TechTaleProgress, toastMsg?: string, earnedPts?: number) => {
      setProgress(prev => {
        const next = updater({ ...prev });
        // Check newly unlocked achievements (mirrors GameStore.checkAchievements)
        let changed = true;
        const newBadges: string[] = [];
        while (changed) {
          changed = false;
          for (const ach of TECHTALE_ACHIEVEMENTS) {
            if (!next.unlockedBadges.includes(ach.id) && ach.check(next)) {
              next.unlockedBadges = [...next.unlockedBadges, ach.id];
              next.points += ach.bonus;
              newBadges.push(`${ach.emoji} ปลดล็อกเหรียญ "${ach.title}" (+${ach.bonus} แต้ม)`);
              changed = true;
            }
          }
        }
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        if (toastMsg) {
          showToast(earnedPts ? `${toastMsg} (+${earnedPts} แต้ม TechTale)` : toastMsg, { kind: 'success' });
        }
        for (const msg of newBadges) {
          showToast(msg, { kind: 'success' });
        }
        return next;
      });
    },
    [storageKey, showToast]
  );

  // Measure pin & terminal coordinates relative to canvasRef
  const measurePins = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const nextBoard: Record<string, Point> = {};
    const nextTerm: Record<string, Point> = {};

    for (const [pin, el] of Object.entries(boardPinEls.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      nextBoard[pin] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    }
    for (const [tid, el] of Object.entries(terminalEls.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      nextTerm[tid] = { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    }
    setPinCoords(nextBoard);
    setTermCoords(nextTerm);
  }, []);

  useLayoutEffect(() => {
    if (!activeMission || (missionStep !== 'wiring' && missionStep !== 'coding' && missionStep !== 'running')) return;
    measurePins();
    const ro = new ResizeObserver(() => measurePins());
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener('resize', measurePins);
    const t = window.setTimeout(measurePins, 120);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measurePins);
      window.clearTimeout(t);
    };
  }, [activeMission, missionStep, boardType, measurePins, computerMinimized]);

  // Derived Rank & Level
  const level = Math.floor(progress.points / POINTS_PER_LEVEL) + 1;
  const rankTitle = TECHTALE_RANKS[Math.min(level - 1, TECHTALE_RANKS.length - 1)];
  const levelPct = Math.round(((progress.points % POINTS_PER_LEVEL) / POINTS_PER_LEVEL) * 100);
  const pointsToNext = POINTS_PER_LEVEL - (progress.points % POINTS_PER_LEVEL);

  const levelMissions = useMemo(
    () => TECHTALE_MISSIONS.filter(m => m.level === selectedLevel),
    [selectedLevel]
  );

  // Today's Daily Quiz
  const todayStr = todayKey();
  const hasPlayedQuizToday = progress.lastQuizDay === todayStr;
  const dailyQuizIndex = useMemo(() => {
    const dayNum = Math.floor(Date.now() / 86400000);
    return dayNum % TECHTALE_DAILY_QUIZ_BANK.length;
  }, []);
  const todayQuiz = TECHTALE_DAILY_QUIZ_BANK[dailyQuizIndex];

  function startMission(mission: TechTaleMission) {
    setActiveMission(mission);
    setMissionStep('intro');
    setDialogueIdx(0);
    setConnections({});
    setEnabledParts([]);
    setSelectedBoardPin(null);
    setSelectedTerminal(null);
    setDraggingPin(null);
    setDragPos(null);
    setHoveredTerminal(null);
    setShowHint(false);
    setShowMentorTip(true);
    setHasExploded(false);
    setWiringError(null);
    setComputerMinimized(false);
    setWiringXpSynced(false);
    dragStartRef.current = null;
    boardPinEls.current = {};
    terminalEls.current = {};
  }

  function exitMission() {
    setActiveMission(null);
    setMissionStep('intro');
    setSelectedBoardPin(null);
    setSelectedTerminal(null);
    dragStartRef.current = null;
  }

  function connectWire(boardPin: string, terminalId: string) {
    setWiringError(null);
    setConnections(prev => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v !== boardPin) next[k] = v;
      }
      next[terminalId] = boardPin;
      return next;
    });
    setSelectedBoardPin(null);
    setSelectedTerminal(null);
  }

  function findNearestTerminal(p: Point): string | null {
    let best: string | null = null;
    let bestDist = 68;
    for (const [tid, pos] of Object.entries(termCoords)) {
      const d = Math.hypot(pos.x - p.x, pos.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = tid;
      }
    }
    return best;
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start || !canvasRef.current) return;
    if (!start.moved && Math.hypot(e.clientX - start.startX, e.clientY - start.startY) > 10) {
      start.moved = true;
      setDraggingPin(start.pin);
    }
    if (!start.moved) return;
    const base = canvasRef.current.getBoundingClientRect();
    const pos = { x: e.clientX - base.left, y: e.clientY - base.top };
    setDragPos(pos);
    setHoveredTerminal(findNearestTerminal(pos));
  }

  function handleCanvasPointerUp() {
    const start = dragStartRef.current;
    dragStartRef.current = null;

    if (start) {
      if (start.moved) {
        if (hoveredTerminal) {
          connectWire(start.pin, hoveredTerminal);
        }
      } else {
        // แตะครั้งเดียวแบบไม่ลาก (Tap-to-Wire) ไม่ชนกับ onClick อีกต่อไป!
        if (selectedTerminal) {
          connectWire(start.pin, selectedTerminal);
        } else {
          setSelectedBoardPin(prev => (prev === start.pin ? null : start.pin));
        }
      }
    }

    setDraggingPin(null);
    setDragPos(null);
    setHoveredTerminal(null);
  }

  function togglePart(partId: string) {
    setWiringError(null);
    setEnabledParts(prev => (prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]));
  }

  function verifyWiring() {
    if (!activeMission) return;
    setHasExploded(false);

    const unconnected = activeMission.terminals.filter(t => !connections[t.id]);
    if (unconnected.length > 0) {
      setWiringError(`⚠️ ยังต่อสายไม่ครบ! เหลือขั้ว: ${unconnected.map(t => t.label).join(', ')}`);
      return;
    }

    const wrong = activeMission.terminals.filter(t => connections[t.id] !== t.expectedPin);
    if (wrong.length > 0) {
      const detail = wrong
        .map(
          t =>
            `${t.label} ต้องต่อ ${formatBoardPinDisplay(t.expectedPin, boardType)} (ตอนนี้ ${formatBoardPinDisplay(
              connections[t.id],
              boardType
            )})`
        )
        .join(' • ');
      setWiringError(`❌ สายผิด ${wrong.length} เส้น — ${detail}`);
      return;
    }

    const missing = activeMission.parts.filter(
      p => activeMission.requiredPartIds.includes(p.id) && !enabledParts.includes(p.id)
    );
    if (missing.length > 0) {
      const m = missing[0];
      if (m.isDangerous) {
        setHasExploded(true);
        setWiringError(m.missingMessage);
        window.setTimeout(() => {
          setHasExploded(false);
          setWiringError("ลองใหม่! เลือกชิ้นส่วนที่ขาดในแถว 'ชิ้นส่วน' ก่อนตรวจสอบ");
        }, 2500);
      } else {
        setWiringError(`🔧 ${m.missingMessage}`);
      }
      return;
    }

    const extra = activeMission.parts.find(
      p => !activeMission.requiredPartIds.includes(p.id) && enabledParts.includes(p.id)
    );
    if (extra) {
      setWiringError(`🤔 ${extra.name}: ${extra.extraMessage}`);
      return;
    }

    // Success! Move to Coding Minigame + ซิงก์ XP ขั้นต่อสายเข้าบัญชีทันที
    setWiringError(null);
    setShowHint(false);
    setShowMentorTip(false);
    setComputerMinimized(false);
    setSelectedBoardPin(null);
    setSelectedTerminal(null);
    setMissionStep('coding');
    showToast('ต่อวงจรสำเร็จ! เปิดคอมพิวเตอร์ TechOS เพื่อเขียนโค้ดกันเลย', { kind: 'success' });

    if (!wiringXpSynced && onSyncSchoolXp) {
      setWiringXpSynced(true);
      void onSyncSchoolXp(40, `ต่อวงจรสำเร็จ: ${activeMission.title}`);
    }
  }

  async function handleFinishMission() {
    if (!activeMission) return;
    const isReplay = progress.completedKeys.includes(activeMission.key);
    const pts = isReplay ? 20 : 100;

    commitProgress(
      prev => ({
        ...prev,
        points: prev.points + pts,
        completedKeys: isReplay ? prev.completedKeys : [...prev.completedKeys, activeMission.key]
      }),
      isReplay ? 'เล่นซ้ำฝึกฝนต่อเนื่อง!' : `ผ่านภารกิจ "${activeMission.title}" สำเร็จ!`,
      pts
    );

    // ซิงก์คะแนนต่อวงจรรวมเข้า XP หลักของโรงเรียนเพื่อแสดงในอันดับ Top 5 ทันที!
    if (onSyncSchoolXp) {
      await onSyncSchoolXp(isReplay ? 40 : 100, `ผ่านภารกิจต่อวงจร: ${activeMission.title}`);
    }
    exitMission();
  }

  async function handleAnswerDailyQuiz(idx: number) {
    if (quizChoice !== null || hasPlayedQuizToday) return;
    setQuizChoice(idx);
    const ok = idx === todayQuiz.answer;
    const newStreak = progress.lastQuizDay === yesterdayKey() ? progress.quizStreak + 1 : 1;
    const bonus = ok ? 30 + Math.min(newStreak - 1, 5) * 10 : 5;

    commitProgress(
      prev => ({
        ...prev,
        points: prev.points + bonus,
        quizStreak: newStreak,
        quizCorrectTotal: ok ? prev.quizCorrectTotal + 1 : prev.quizCorrectTotal,
        lastQuizDay: todayStr
      }),
      ok ? `ตอบ Daily Quiz ถูก! 🔥 ${newStreak} วันติด` : 'ได้แต้มความพยายาม สู้ต่อนะ!',
      bonus
    );

    if (ok && onSyncSchoolXp) {
      await onSyncSchoolXp(60, 'TechTale Daily Quiz');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVE MISSION VIEW (Intro -> Board -> Wiring -> Coding -> Running -> Outro)
  // ═══════════════════════════════════════════════════════════════
  if (activeMission) {
    // STEP 0 & STEP 5: STORY CUTSCENE (Intro / Outro)
    if (missionStep === 'intro' || missionStep === 'outro') {
      const lines = missionStep === 'intro' ? activeMission.dialogues : activeMission.endingDialogues;
      const line = lines[Math.min(dialogueIdx, lines.length - 1)];
      const char = CHARACTER_REGISTRY[line?.characterId || 'mentor'] || CHARACTER_REGISTRY.mentor;
      const isLast = dialogueIdx >= lines.length - 1;

      const handleNextDialogue = () => {
        if (!isLast) {
          setDialogueIdx(i => i + 1);
        } else if (missionStep === 'intro') {
          setMissionStep('board');
        } else {
          void handleFinishMission();
        }
      };

      return (
        <div className="tus-card overflow-hidden relative min-h-[480px] flex flex-col justify-between p-5 sm:p-7 animate-scale-pop">
          {line?.sceneImage && (
            <img
              src={line.sceneImage}
              alt="ฉากภารกิจ"
              className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-25 pointer-events-none"
            />
          )}

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={missionStep === 'outro' ? () => void handleFinishMission() : exitMission}
              className="btn-secondary-3d btn-compact-3d"
            >
              <ArrowLeft className="w-4 h-4" /> ออก
            </button>
            <div className="flex items-center gap-1.5">
              {lines.map((_, i) => (
                <span
                  key={i}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: i === dialogueIdx ? 24 : 8,
                    backgroundColor: i <= dialogueIdx ? char.roleColor : 'var(--border-strong)'
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => (missionStep === 'intro' ? setMissionStep('board') : void handleFinishMission())}
              className="btn-secondary-3d btn-compact-3d"
            >
              ข้าม <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Dialogue Card */}
          <div className="relative z-10 max-w-2xl w-full mx-auto my-8 space-y-4">
            <div className="flex flex-col items-center">
              <div
                className="w-24 h-24 rounded-full bg-[var(--bg-surface)] border-4 flex items-center justify-center text-5xl shadow-lg -mb-10 z-10"
                style={{ borderColor: char.roleColor }}
              >
                {char.emoji}
              </div>
              <div
                className="w-full rounded-3xl bg-[var(--bg-surface)] border-[3px] p-6 pt-14 shadow-xl space-y-2"
                style={{ borderColor: char.roleColor }}
              >
                <div className="font-heading font-extrabold text-xl" style={{ color: char.roleColor }}>
                  {char.name}
                </div>
                <p className="text-base sm:text-lg font-medium text-[var(--text-primary)] leading-relaxed">
                  {line?.text}
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="relative z-10 flex justify-center">
            <button type="button" onClick={handleNextDialogue} className="btn-primary-3d w-full sm:w-auto min-w-[240px]">
              <Play className="w-5 h-5" />
              {!isLast
                ? 'อ่านข้อความถัดไป'
                : missionStep === 'intro'
                  ? 'เลือกบอร์ดและเริ่มต่อวงจร!'
                  : 'รับรางวัลและกลับหน้าภารกิจ!'}
            </button>
          </div>
        </div>
      );
    }

    // STEP 1: BOARD SELECTION (Arduino UNO vs ESP32)
    if (missionStep === 'board') {
      return (
        <div className="tus-card p-5 sm:p-7 space-y-6 animate-fade-up">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setDialogueIdx(0);
                setMissionStep('intro');
              }}
              className="btn-secondary-3d btn-compact-3d"
            >
              <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
            </button>
            <span className="text-xs font-heading font-bold px-3 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              {activeMission.title}
            </span>
          </div>

          <div className="text-center space-y-1">
            <h2 className="font-heading font-extrabold text-2xl text-[var(--text-primary)]">
              เลือกบอร์ดไมโครคอนโทรลเลอร์สำหรับภารกิจนี้
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              เลือกใช้ได้ทั้ง <strong>Arduino UNO (5V)</strong> หรือ <strong>ESP32 (3.3V Wi-Fi)</strong> — ชื่อพินบนบอร์ดจะปรับตามบอร์ดที่เลือกอัตโนมัติ!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {([
              { id: 'Arduino' as const, title: 'Arduino UNO', desc: 'แรงดันลอจิก 5V • พินมาตรฐาน 13, 12, 11, A0, 5V, GND' },
              { id: 'ESP32' as const, title: 'ESP32', desc: 'แรงดันลอจิก 3.3V • พิน D13, D12, D11, A0, 3V3, GND' }
            ]).map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBoardType(b.id);
                  setMissionStep('wiring');
                }}
                className="tus-card p-5 text-center space-y-4 border-2 hover:border-[var(--color-primary)] hover:-translate-y-1 transition cursor-pointer"
              >
                <VectorBoardArt boardType={b.id} />
                <div>
                  <div className="font-heading font-extrabold text-lg text-[var(--text-primary)]">{b.title}</div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">{b.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    // STEP 2 / 3 / 4: INTERACTIVE WIRING LAB + CODING MINIGAME + LIVE SIMULATION
    const row1Pins = BOARD_PINS_LOGICAL.slice(0, 7);
    const row2Pins = BOARD_PINS_LOGICAL.slice(7);
    const highlightedPins = new Set<string>([
      ...Object.values(connections),
      ...(selectedBoardPin ? [selectedBoardPin] : []),
      ...(draggingPin ? [draggingPin] : []),
      ...(showHint && missionStep === 'wiring' ? activeMission.terminals.map(t => t.expectedPin) : [])
    ]);
    const isRunning = missionStep === 'running';

    return (
      <div className="space-y-4 animate-fade-up">
        {/* Lab Header */}
        <div className="tus-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={exitMission} className="btn-secondary-3d btn-compact-3d">
              <ArrowLeft className="w-4 h-4" /> ออก
            </button>
            <div>
              <div className="font-heading font-extrabold text-base sm:text-lg text-[var(--text-primary)]">
                {missionStep === 'wiring'
                  ? 'ภารกิจขั้นที่ 1 : ต่อสายวงจรและเลือกชิ้นส่วน'
                  : missionStep === 'coding'
                    ? 'ภารกิจขั้นที่ 2 : เขียนโค้ดควบคุมบอร์ด'
                    : 'สำเร็จแล้ว! อุปกรณ์ทำงานสมจริง 🎉'}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">
                {activeMission.title} • {activeMission.targetComponentTitle} • {boardType === 'Arduino' ? 'Arduino UNO' : 'ESP32'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBoardType(b => (b === 'Arduino' ? 'ESP32' : 'Arduino'))}
              disabled={missionStep !== 'wiring'}
              className="btn-secondary-3d btn-compact-3d disabled:opacity-50"
            >
              สลับเป็น {boardType === 'Arduino' ? 'ESP32' : 'Arduino UNO'}
            </button>
          </div>
        </div>

        {/* Coding Overlay (when Step === 'coding') */}
        {missionStep === 'coding' && (
          <TechTaleCodingGame
            task={activeMission.codingTask}
            lessonTitle={activeMission.title}
            isMinimized={computerMinimized}
            onToggleMinimize={() => setComputerMinimized(v => !v)}
            onComplete={() => {
              setMissionStep('running');
              setComputerMinimized(true);
              showToast(`🎉 ${activeMission.successMessage}`, { kind: 'success' });
            }}
          />
        )}

        {/* Interactive Wiring Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          className={`tus-card relative p-3.5 sm:p-6 overflow-hidden select-none ${
            draggingPin ? 'touch-none' : 'touch-pan-y'
          }`}
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(184,25,79,0.12) 1px, transparent 0)',
            backgroundSize: '22px 22px'
          }}
        >
          {/* SVG Wires Layer (Hint Dashed Wires + Connected Wires + Live Dragging Wire) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
            {/* Hint dashed lines */}
            {showHint &&
              missionStep === 'wiring' &&
              activeMission.terminals.map(t => {
                const s = pinCoords[t.expectedPin];
                const e = termCoords[t.id];
                if (!s || !e) return null;
                return (
                  <path
                    key={`hint-${t.id}`}
                    d={bezierPath(s, e)}
                    fill="none"
                    stroke={t.id === 'GND' ? '#6B7280' : t.color}
                    strokeWidth={5}
                    strokeDasharray="10 8"
                    strokeLinecap="round"
                    opacity={0.55}
                  />
                );
              })}

            {/* Connected solid wires */}
            {activeMission.terminals.map(t => {
              const bp = connections[t.id];
              if (!bp) return null;
              const s = pinCoords[bp];
              const e = termCoords[t.id];
              if (!s || !e) return null;
              return (
                <g key={`wire-${t.id}`}>
                  <path
                    d={bezierPath(s, e)}
                    fill="none"
                    stroke="rgba(0,0,0,0.28)"
                    strokeWidth={9}
                    strokeLinecap="round"
                    transform="translate(2, 3)"
                  />
                  <path
                    d={bezierPath(s, e)}
                    fill="none"
                    stroke={t.id === 'GND' ? '#374151' : t.color}
                    strokeWidth={7}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Live dragging wire */}
            {draggingPin && dragPos && pinCoords[draggingPin] && (
              <path
                d={bezierPath(
                  pinCoords[draggingPin],
                  hoveredTerminal && termCoords[hoveredTerminal] ? termCoords[hoveredTerminal] : dragPos
                )}
                fill="none"
                stroke={hoveredTerminal ? '#22C55E' : '#F97316'}
                strokeWidth={7}
                strokeDasharray="10 6"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Inline 220Ω Resistor Floating Midpoint Badge */}
          {activeMission.parts.map(p => {
            if (!enabledParts.includes(p.id) || !p.inlineTerminal) return null;
            const bp = connections[p.inlineTerminal];
            if (!bp) return null;
            const s = pinCoords[bp];
            const e = termCoords[p.inlineTerminal];
            if (!s || !e) return null;
            return (
              <div
                key={`inline-${p.id}`}
                style={{ left: (s.x + e.x) / 2, top: (s.y + e.y) / 2 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none px-2 py-1 rounded-xl bg-white/95 dark:bg-neutral-900/95 border-2 border-amber-500 shadow-md flex flex-col items-center gap-0.5"
              >
                <span className="text-[10px] font-mono font-black text-amber-600">220 Ω</span>
                <RealisticResistor220 />
              </div>
            );
          })}

          {/* แถบสถานะแนะนำการแตะต่อสายบนมือถือ (เห็นชัดระหว่างพินกับอุปกรณ์) */}
          {missionStep === 'wiring' && (
            <div className="relative z-30 mb-3 text-center">
              {selectedBoardPin ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-2 border-amber-500 text-xs sm:text-sm font-heading font-bold shadow-sm">
                  <span>⚡ กำลังเลือกพิน {formatBoardPinDisplay(selectedBoardPin, boardType)} — แตะขั้วอุปกรณ์ด้านล่างเพื่อต่อสาย!</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBoardPin(null)}
                    className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-xs cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : selectedTerminal ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-500 text-xs sm:text-sm font-heading font-bold shadow-sm">
                  <span>🔌 กำลังเลือกขั้ว {activeMission.terminals.find(t => t.id === selectedTerminal)?.label} — แตะพินบนบอร์ดเพื่อต่อสาย!</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTerminal(null)}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-xs cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <div className="inline-block px-3 py-1 rounded-full bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-[11px] sm:text-xs font-heading font-semibold text-[var(--text-secondary)]">
                  แตะพินบนบอร์ด แล้วแตะขั้วอุปกรณ์ (สลับลำดับได้) หรือกดค้างลากสายเชื่อมได้เลย
                </div>
              )}
            </div>
          )}

          {/* Board + Target Device Layout */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 items-center py-1">
            {/* LEFT: Microcontroller Board + 14 Large Mobile-Friendly Interactive Pins */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-full max-w-[420px] space-y-2.5 p-3 sm:p-3.5 rounded-2xl border-2 border-neutral-900 bg-[#006980] dark:bg-neutral-800 shadow-md">
                <div className="flex items-center justify-between text-xs font-heading font-bold text-white/95 px-1">
                  <span>พินบอร์ด {boardType === 'Arduino' ? 'Arduino UNO' : 'ESP32'}</span>
                  <span className="text-[11px] text-amber-200">แตะเลือกง่ายๆ</span>
                </div>
                {/* มือถือแสดงแถวละ 4 ปุ่มใหญ่ (54px) กดไม่พลาด • จอกว้างแสดงแถวละ 7 พินเหมือนบอร์ดจริง */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-1.5">
                  {[...row1Pins, ...row2Pins].map(pin => {
                    const active = highlightedPins.has(pin);
                    const picked = selectedBoardPin === pin || draggingPin === pin;
                    const readyFromTerminal = Boolean(selectedTerminal && missionStep === 'wiring');
                    return (
                      <button
                        key={pin}
                        ref={el => {
                          boardPinEls.current[pin] = el;
                        }}
                        type="button"
                        disabled={missionStep !== 'wiring'}
                        onKeyDown={e => {
                          if (missionStep !== 'wiring') return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (selectedTerminal) {
                              connectWire(pin, selectedTerminal);
                            } else {
                              setSelectedBoardPin(prev => (prev === pin ? null : pin));
                            }
                          }
                        }}
                        onPointerDown={e => {
                          if (missionStep !== 'wiring') return;
                          e.preventDefault();
                          setWiringError(null);
                          dragStartRef.current = {
                            pin,
                            startX: e.clientX,
                            startY: e.clientY,
                            moved: false
                          };
                          if (canvasRef.current) {
                            const base = canvasRef.current.getBoundingClientRect();
                            setDragPos({ x: e.clientX - base.left, y: e.clientY - base.top });
                          }
                        }}
                        className={`min-h-[54px] sm:min-h-[50px] py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer touch-none transition active:scale-95 ${
                          picked
                            ? 'bg-yellow-400/35 ring-2 ring-yellow-300 scale-105 shadow-md'
                            : readyFromTerminal
                              ? 'bg-emerald-400/20 ring-1 ring-emerald-300/80 hover:bg-emerald-400/30'
                              : active
                                ? 'bg-white/15 ring-1 ring-yellow-300/70'
                                : 'bg-black/20 hover:bg-white/15'
                        }`}
                      >
                        <span className={`text-xs sm:text-[11px] font-mono font-black leading-none ${active ? 'text-yellow-300' : 'text-white'}`}>
                          {formatBoardPinLabel(pin, boardType)}
                        </span>
                        <span
                          className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 border-white flex items-center justify-center ${
                            picked
                              ? 'bg-yellow-300 shadow-[0_0_10px_#fde047]'
                              : active
                                ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                                : 'bg-neutral-900'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* ซ่อนภาพบอร์ดขนาดใหญ่เฉพาะตอนต่อสายบนมือถือ เพื่อให้พินกับขั้วอุปกรณ์อยู่ใกล้กันในจอเดียว */}
              <div className="hidden lg:flex justify-center">
                <VectorBoardArt boardType={boardType} />
              </div>
            </div>

            {/* RIGHT: Target Device + Big Touch-Friendly Terminals */}
            <div className="flex flex-col items-center gap-4">
              {/* Floating non-inline enabled parts */}
              {enabledParts.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {activeMission.parts
                    .filter(p => enabledParts.includes(p.id) && !(p.inlineTerminal && connections[p.inlineTerminal]))
                    .map(p => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1 rounded-full text-xs font-heading font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-500"
                      >
                        {p.icon} {p.name}
                      </span>
                    ))}
                </div>
              )}

              {/* Device Terminals (วางไว้ด้านบนของตัวอุปกรณ์บนมือถือ เพื่อให้เห็นและแตะได้ง่ายทันทีใกล้พินบอร์ด) */}
              <div className="w-full max-w-[420px] flex flex-wrap justify-center gap-3 px-3.5 py-3.5 rounded-2xl bg-white dark:bg-neutral-900 border-[3px] border-neutral-900 shadow-md">
                {activeMission.terminals.map(t => {
                  const connectedPin = connections[t.id];
                  const isConnected = Boolean(connectedPin);
                  const isHovered = hoveredTerminal === t.id;
                  const isPickedTerm = selectedTerminal === t.id;
                  const readyToTap = Boolean(selectedBoardPin && missionStep === 'wiring');

                  return (
                    <div key={t.id} className="relative">
                      <button
                        ref={el => {
                          terminalEls.current[t.id] = el;
                        }}
                        type="button"
                        disabled={missionStep !== 'wiring'}
                        onClick={() => {
                          if (missionStep !== 'wiring') return;
                          setWiringError(null);
                          if (selectedBoardPin) {
                            connectWire(selectedBoardPin, t.id);
                          } else {
                            setSelectedTerminal(prev => (prev === t.id ? null : t.id));
                          }
                        }}
                        className={`min-h-[68px] min-w-[92px] flex flex-col items-center justify-center gap-1 px-3.5 py-2 rounded-2xl border-2 cursor-pointer transition active:scale-95 ${
                          isPickedTerm
                            ? 'border-emerald-600 bg-emerald-100 dark:bg-emerald-950/70 ring-2 ring-emerald-400 scale-105'
                            : isHovered || readyToTap
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400 scale-[1.03]'
                              : isConnected
                                ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
                                : 'border-[var(--border-strong)] bg-[var(--bg-surface-muted)] hover:border-[var(--color-primary)]'
                        }`}
                      >
                        <span
                          className="w-8 h-8 rounded-full border-[2.5px] border-black flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: t.color }}
                        >
                          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-yellow-300' : 'bg-white'}`} />
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-black text-[var(--text-primary)] leading-tight">
                          {t.label}
                        </span>
                        <span
                          className={`text-[10px] font-heading font-bold leading-none ${
                            isConnected ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {isConnected ? `→ ${formatBoardPinLabel(connectedPin, boardType)}` : 'แตะต่อสาย'}
                        </span>
                      </button>

                      {/* ปุ่มกากบาทเล็กๆ สำหรับถอดสายเฉพาะเส้นนี้ได้ใน 1 แตะ */}
                      {isConnected && missionStep === 'wiring' && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setConnections(prev => {
                              const next = { ...prev };
                              delete next[t.id];
                              return next;
                            });
                          }}
                          aria-label={`ถอดสายขั้ว ${t.label}`}
                          title="ถอดสายเส้นนี้"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow border-2 border-white cursor-pointer hover:bg-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Device Display Enclosure */}
              <div
                className={`min-w-[164px] min-h-[126px] sm:min-h-[150px] px-5 py-4 sm:py-5 rounded-3xl border-[4px] flex flex-col items-center justify-center shadow-lg transition-all ${
                  hasExploded
                    ? 'bg-neutral-800 border-red-600'
                    : isRunning
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
                      : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-900'
                }`}
              >
                <TechTaleDeviceVisual
                  type={activeMission.componentType}
                  moduleColor={activeMission.moduleColor}
                  isRunning={isRunning}
                  hasExploded={hasExploded}
                />
                <div className="mt-2.5 text-xs font-mono font-extrabold text-[var(--text-secondary)]">
                  {activeMission.targetComponentTitle}
                </div>
              </div>
            </div>
          </div>

          {/* พี่นีโอแนะนำวิธีต่อสาย */}
          {missionStep === 'wiring' && showMentorTip && (
            <div className="relative z-30 mt-4 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-500/50 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 text-sm">
                <span className="text-2xl shrink-0">👨‍💻</span>
                <div>
                  <span className="font-heading font-bold text-blue-700 dark:text-blue-300">พี่นีโอแนะนำ: </span>
                  <span>
                    ต่อสายให้ตรงขั้ว:{' '}
                    <strong>
                      {activeMission.terminals
                        .map(t => `${t.label} → ${formatBoardPinLabel(t.expectedPin, boardType)}`)
                        .join(' • ')}
                    </strong>
                    {activeMission.requiredPartIds.length > 0 &&
                      ' แล้วเลือกชิ้นส่วนที่จำเป็นด้านล่างให้ครบ (ระวังตัวหลอกด้วยนะ!)'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowMentorTip(false)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Wiring Controls OR Running Victory Bar */}
        {missionStep === 'wiring' && (
          <div
            className={`tus-card p-4 sm:p-5 space-y-4 transition-colors ${
              hasExploded ? '!bg-red-600 !text-white !border-red-900' : ''
            }`}
          >
            {/* Wire Status Chips */}
            <div className="flex flex-wrap gap-2">
              {activeMission.terminals.map(t => {
                const connected = connections[t.id];
                return (
                  <span
                    key={t.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold border ${
                      connected
                        ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]'
                        : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t.label}: {connected ? formatBoardPinDisplay(connected, boardType) : 'ยังไม่ต่อ'}
                  </span>
                );
              })}
            </div>

            {/* Parts Selector Row */}
            {activeMission.parts.length > 0 && (
              <div className="space-y-1.5">
                <div className={`text-xs font-heading font-bold flex items-center gap-1.5 ${hasExploded ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                  <Wrench className="w-3.5 h-3.5" /> ชิ้นส่วนเสริม (แตะเพื่อใส่ / เอาออก — ระวังชิ้นส่วนหลอก!)
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeMission.parts.map(p => {
                    const on = enabledParts.includes(p.id);
                    const hinted = showHint && activeMission.requiredPartIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePart(p.id)}
                        className={`min-h-[42px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition inline-flex items-center gap-1.5 ${
                          on
                            ? 'bg-emerald-500/20 border-emerald-600 text-[var(--text-primary)]'
                            : hinted
                              ? 'bg-amber-500/15 border-amber-500 text-[var(--text-primary)]'
                              : 'bg-[var(--bg-surface-muted)] border-[var(--border-strong)] text-[var(--text-primary)]'
                        }`}
                      >
                        <span>{on ? '☑' : '☐'}</span>
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {wiringError && (
              <div
                className={`p-3 rounded-xl text-sm font-heading font-bold ${
                  hasExploded
                    ? 'bg-black/25 text-white'
                    : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]'
                }`}
              >
                {wiringError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setConnections({});
                  setSelectedBoardPin(null);
                  setWiringError(null);
                }}
                className="btn-secondary-3d"
              >
                <RotateCcw className="w-4 h-4" /> ล้างสายทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setShowHint(v => !v)}
                className="btn-secondary-3d"
              >
                <Lightbulb className="w-4 h-4" /> {showHint ? 'ซ่อนคำใบ้' : 'แสดงคำใบ้สายไฟ'}
              </button>
              <button type="button" onClick={verifyWiring} className="btn-primary-3d">
                <CheckCircle2 className="w-5 h-5" /> ตรวจสอบวงจร
              </button>
            </div>
          </div>
        )}

        {missionStep === 'running' && (
          <div className="tus-card p-6 border-2 border-[var(--color-success)] bg-[var(--color-success-bg)] text-center space-y-4 animate-scale-pop">
            <div className="font-heading font-extrabold text-xl text-[var(--color-success)]">
              🎉 {activeMission.successMessage}
            </div>
            <button
              type="button"
              onClick={() => {
                setDialogueIdx(0);
                setMissionStep('outro');
              }}
              className="btn-primary-3d w-full sm:w-auto"
            >
              <Film className="w-5 h-5" /> ดูคัตซีนตอนจบและรับรางวัล (+XP)
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN TECHTALE HUB (Missions / Daily Quiz / Achievements)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Tutorial Modal */}
      {showTutorial && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowTutorial(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-xl w-full p-6 space-y-4 animate-scale-pop"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading font-bold text-lg text-[var(--color-primary)]">
                วิธีเล่น TechTale — ผจญภัยโลกอิเล็กทรอนิกส์
              </h3>
              <button type="button" onClick={() => setShowTutorial(false)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ol className="space-y-2.5 text-sm sm:text-base text-[var(--text-primary)]">
              <li className="p-3 rounded-xl bg-[var(--bg-surface-muted)]">
                <strong>1. เลือกระดับและอ่านภารกิจ:</strong> เลือกระดับ ประถม / มัธยมต้น / มัธยมปลาย แล้วเลือกด่านที่อยากผจญภัย
              </li>
              <li className="p-3 rounded-xl bg-[var(--bg-surface-muted)]">
                <strong>2. ต่อสายวงจร Arduino / ESP32:</strong> ลากสาย (หรือแตะพินบนบอร์ดแล้วแตะขั้วอุปกรณ์) พร้อมเลือกชิ้นส่วนที่จำเป็น (ระวังตัวหลอกและอย่าลืม Resistor ไม่งั้นตู้ม!)
              </li>
              <li className="p-3 rounded-xl bg-[var(--bg-surface-muted)]">
                <strong>3. เขียนโค้ดบนคอมพิวเตอร์ TechOS:</strong> เติมคำสั่ง Arduino C++ ลงช่องว่าง พร้อมคำอธิบายคำสั่งทุกตัว
              </li>
              <li className="p-3 rounded-xl bg-[var(--bg-surface-muted)]">
                <strong>4. ดูผลลัพธ์ + รับแต้มและ XP:</strong> เมื่อผ่านด่านจะได้ทั้งแต้ม TechTale เหรียญรางวัล และคะแนน XP เข้าอันดับ Top 5 ของโรงเรียนด้วย!
              </li>
            </ol>
            <button type="button" onClick={() => setShowTutorial(false)} className="btn-primary-3d w-full">
              เริ่มผจญภัยกันเลย!
            </button>
          </div>
        </div>
      )}

      {/* Profile & Level Header Card */}
      <section className="tus-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold px-3 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Cpu className="w-4 h-4" /> TechTale Circuit Lab • Arduino UNO & ESP32
            </div>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--text-primary)]">
              ผจญภัยต่อวงจรและเขียนโค้ด (12 ภารกิจ)
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              ผู้เล่น: <strong>{studentName}</strong> • Lv.{level} ({rankTitle}) • ผ่านแล้ว{' '}
              <strong>{progress.completedKeys.length}/{TECHTALE_MISSIONS.length}</strong> ด่าน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-2 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-center">
              <div className="text-[11px] font-heading font-bold text-[var(--color-primary)]">XP รวม (Top 5)</div>
              <div className="font-mono font-extrabold text-lg text-[var(--color-primary)]">🏆 {currentXp} XP</div>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-center">
              <div className="text-[11px] font-heading font-bold text-[var(--color-gold)]">แต้ม TechTale</div>
              <div className="font-mono font-extrabold text-lg text-[var(--color-gold)]">⭐ {progress.points}</div>
            </div>
            <button type="button" onClick={() => setShowTutorial(true)} className="btn-secondary-3d btn-compact-3d">
              <HelpCircle className="w-4 h-4" /> วิธีเล่น
            </button>
          </div>
        </div>

        <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-muted)] px-3.5 py-2 rounded-xl border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <span>
            ต่อวงจรสำเร็จรับ <strong>+10 XP</strong> • ผ่านด่านรับเพิ่ม <strong>+25 XP</strong> • Daily Quiz รับ <strong>+15 XP</strong> (รวมเข้าคะแนน XP ของโรงเรียนทันที!)
          </span>
          <span className="font-heading font-bold text-[var(--color-primary)]">
            โควตา XP วันนี้ {dailyXpUsed}/{dailyXpCap}
          </span>
        </div>

        {/* Progress to Next Level */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-heading font-bold text-[var(--text-secondary)]">
            <span>ความคืบหน้าเลเวล {level} → {level + 1}</span>
            <span>อีก {pointsToNext} แต้มจะเลเวลอัป</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--bg-surface-muted)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
              style={{ width: `${levelPct}%` }}
            />
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { id: 'missions' as const, label: 'ภารกิจต่อวงจร (12)', icon: BookOpen },
            {
              id: 'quiz' as const,
              label: hasPlayedQuizToday ? 'Daily Quiz ✓' : `Daily Quiz 🔥${progress.quizStreak}`,
              icon: Sparkles
            },
            {
              id: 'achievements' as const,
              label: `เหรียญ (${progress.unlockedBadges.length}/${TECHTALE_ACHIEVEMENTS.length})`,
              icon: Trophy
            }
          ].map(tab => {
            const Icon = tab.icon;
            const active = subView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 inline-flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  active
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* VIEW 1: MISSIONS */}
      {subView === 'missions' && (
        <div className="space-y-5 animate-fade-up">
          {/* 3 Level Tabs */}
          <div className="grid grid-cols-3 gap-3">
            {TECHTALE_LEVELS.map(lv => {
              const selected = selectedLevel === lv.id;
              const lvMissions = TECHTALE_MISSIONS.filter(m => m.level === lv.id);
              const done = lvMissions.filter(m => progress.completedKeys.includes(m.key)).length;
              return (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => setSelectedLevel(lv.id)}
                  className={`p-3.5 rounded-2xl border-2 text-center cursor-pointer transition ${
                    selected ? 'text-white shadow-md scale-[1.02]' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                  style={
                    selected
                      ? { backgroundColor: lv.color, borderColor: lv.color }
                      : undefined
                  }
                >
                  <div className="font-heading font-extrabold text-sm sm:text-base">{lv.title}</div>
                  <div className={`text-xs font-bold mt-0.5 ${selected ? 'text-white/90' : 'text-[var(--text-muted)]'}`}>
                    ผ่าน {done}/{lvMissions.length} ด่าน
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-sm font-heading font-semibold text-[var(--text-secondary)]">
            {TECHTALE_LEVELS.find(l => l.id === selectedLevel)?.subtitle}
          </p>

          {/* 4 Mission Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {levelMissions.map((mission, idx) => {
              const isDone = progress.completedKeys.includes(mission.key);
              return (
                <article
                  key={mission.key}
                  className="tus-card overflow-hidden flex flex-col justify-between border-2 hover:border-[var(--color-primary)] transition"
                >
                  {/* Card Visual Cover */}
                  <div
                    className="relative h-36 flex items-center justify-center overflow-hidden border-b border-[var(--border-subtle)]"
                    style={{
                      background: `linear-gradient(135deg, ${mission.moduleColor}33, ${mission.moduleColor}11)`
                    }}
                  >
                    {mission.cardImage ? (
                      <img
                        src={mission.cardImage}
                        alt={mission.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="scale-95">
                        <TechTaleDeviceVisual
                          type={mission.componentType}
                          moduleColor={mission.moduleColor}
                          isRunning={isDone}
                          hasExploded={false}
                        />
                      </div>
                    )}
                    <span
                      className="absolute top-3 left-3 w-8 h-8 rounded-full text-white font-mono font-black text-sm flex items-center justify-center border-2 border-black shadow"
                      style={{ backgroundColor: mission.moduleColor }}
                    >
                      {idx + 1}
                    </span>
                    {isDone && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-heading font-bold shadow">
                        ✓ ผ่านแล้ว
                      </span>
                    )}
                  </div>

                  {/* Card Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <span
                        className="inline-block text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${mission.moduleColor}20`,
                          color: mission.moduleColor
                        }}
                      >
                        {mission.targetComponentTitle} • {mission.terminals.length} ขั้วต่อ
                      </span>
                      <h3 className="font-heading font-extrabold text-base sm:text-lg text-[var(--text-primary)]">
                        {mission.title}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {mission.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startMission(mission)}
                      className={isDone ? 'btn-secondary-3d w-full' : 'btn-primary-3d w-full'}
                    >
                      {isDone ? (
                        <>
                          <RotateCcw className="w-4 h-4" /> เล่นอีกครั้ง (+20 แต้ม)
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> เริ่มภารกิจ (+100 แต้ม & XP)
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY QUIZ */}
      {subView === 'quiz' && (
        <section className="tus-card p-5 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-up">
          <div className="p-4 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500 shrink-0" />
            <div>
              <div className="font-heading font-extrabold text-base">
                สถิติตอบคำถามต่อเนื่อง {progress.quizStreak} วัน
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                ตอบถูกได้ 30 แต้ม + โบนัสวันติดกันสูงสุด +50 พร้อม XP เข้าอันดับโรงเรียน!
              </p>
            </div>
          </div>

          {hasPlayedQuizToday && quizChoice === null ? (
            <div className="p-8 text-center space-y-2 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">
              <CheckCircle2 className="w-12 h-12 text-[var(--color-success)] mx-auto" />
              <h3 className="font-heading font-extrabold text-xl text-[var(--color-success)]">
                วันนี้ทำ Daily Quiz แล้ว!
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                กลับมาพรุ่งนี้เพื่อรับคำถามใหม่และรักษาสถิติต่อเนื่อง 🔥
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-xs font-heading font-bold">
                  คำถามอิเล็กทรอนิกส์ประจำวัน
                </span>
                <h3 className="font-heading font-extrabold text-xl text-[var(--text-primary)]">
                  {todayQuiz.question}
                </h3>
              </div>

              <div className="space-y-2.5">
                {todayQuiz.choices.map((ch, idx) => {
                  const answered = quizChoice !== null;
                  const isCorrect = idx === todayQuiz.answer;
                  const isPicked = idx === quizChoice;
                  return (
                    <button
                      key={ch}
                      type="button"
                      disabled={answered}
                      onClick={() => void handleAnswerDailyQuiz(idx)}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-2xl border-2 text-left font-heading font-bold text-sm sm:text-base flex items-center gap-3 cursor-pointer transition ${
                        answered
                          ? isCorrect
                            ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success)]'
                            : isPicked
                              ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
                              : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] opacity-60'
                          : 'bg-[var(--bg-surface)] border-[var(--border-strong)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-mono font-black flex items-center justify-center shrink-0">
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span>{ch}</span>
                    </button>
                  );
                })}
              </div>

              {quizChoice !== null && (
                <div
                  className={`p-4 rounded-2xl border-2 text-center space-y-1 animate-scale-pop ${
                    quizChoice === todayQuiz.answer
                      ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]'
                      : 'bg-[var(--color-gold-bg)] border-[var(--color-gold-border)]'
                  }`}
                >
                  <div className="font-heading font-extrabold text-lg">
                    {quizChoice === todayQuiz.answer ? '🎉 ถูกต้อง!' : '😅 ยังไม่ถูกนะ'}
                  </div>
                  <p className="text-sm">{todayQuiz.explain}</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* VIEW 3: ACHIEVEMENTS */}
      {subView === 'achievements' && (
        <section className="space-y-3 animate-fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TECHTALE_ACHIEVEMENTS.map(ach => {
              const unlocked = progress.unlockedBadges.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`tus-card p-4 flex items-center justify-between gap-3 border-2 ${
                    unlocked ? 'border-[var(--color-gold)]' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                        unlocked ? 'bg-[var(--color-gold-bg)]' : 'bg-[var(--bg-surface-muted)] grayscale'
                      }`}
                    >
                      {ach.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="font-heading font-bold text-base truncate">{ach.title}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{ach.detail}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    {unlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] ml-auto" />
                    ) : (
                      <Lock className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                    )}
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--color-gold-bg)] text-[var(--color-gold)]">
                      +{ach.bonus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
