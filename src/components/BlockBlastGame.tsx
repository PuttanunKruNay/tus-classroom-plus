'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Home,
  Trophy,
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  CalendarCheck,
  Award,
  HelpCircle,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

const DAILY_TARGET_SCORE = 100;

interface PieceShape {
  id: string;
  cells: [number, number][]; // [row, col]
  color: string;
  bevel: string;
}

interface TriviaQuestion {
  id: string;
  topic: string;
  q: string;
  options: string[];
}

// โทนสี 3D Beveled Jewel Blocks เฉพาะของ BLOCK MASTER PUZZLE (ชมพูเข้ม / โรส / ม่วงอ่อน / ทอง)
const BLOCK_STYLES = [
  { color: 'bg-[#B8194F] border-[#7A0D32]', bevel: 'shadow-[inset_0_3px_0_rgba(255,255,255,0.42),inset_0_-3px_0_rgba(0,0,0,0.28)]' },
  { color: 'bg-[#E05282] border-[#A31B4B]', bevel: 'shadow-[inset_0_3px_0_rgba(255,255,255,0.45),inset_0_-3px_0_rgba(0,0,0,0.25)]' },
  { color: 'bg-[#9333EA] border-[#6B21A8]', bevel: 'shadow-[inset_0_3px_0_rgba(255,255,255,0.42),inset_0_-3px_0_rgba(0,0,0,0.28)]' },
  { color: 'bg-[#D97706] border-[#92400E]', bevel: 'shadow-[inset_0_3px_0_rgba(255,255,255,0.48),inset_0_-3px_0_rgba(0,0,0,0.25)]' },
  { color: 'bg-[#A855F7] border-[#7E22CE]', bevel: 'shadow-[inset_0_3px_0_rgba(255,255,255,0.42),inset_0_-3px_0_rgba(0,0,0,0.25)]' },
  { color: 'bg-[#DB2777] border-[#9D174D]', bevel: 'shadow-[inset_0_3px_0_rgba(255,255,255,0.44),inset_0_-3px_0_rgba(0,0,0,0.26)]' }
];

// รูปทรงครบ 20 แบบสไตล์ Block Blast (1x1 ถึง 1x5, 2x2, L3, L4, T4, Z4, 3x3)
const SHAPES: [number, number][][] = [
  [[0, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]
];

const BADGE_INFO: Record<string, { label: string; desc: string }> = {
  first_game: { label: 'ก้าวแรก', desc: 'เล่นจบ 1 รอบ' },
  line_sweeper: { label: 'นักเคลียร์แถว', desc: 'เคลียร์อย่างน้อย 5 แนวในรอบเดียว' },
  combo_master: { label: 'จ้าวคอมโบ', desc: 'ทำคอมโบต่อเนื่อง 3 ครั้งขึ้นไป' },
  daily_hero: { label: 'พิชิตภารกิจรายวัน', desc: 'ผ่านโหมด Daily Challenge' },
  xp_500: { label: 'ตำนาน 500 XP', desc: 'สะสม XP รวมถึง 500' }
};

function createEmptyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function createDailyGrid(size: number): (string | null)[][] {
  const g = createEmptyGrid(size);
  const seedStr = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 9973;
  const blocks = size === 8 ? 10 : 14;
  for (let k = 0; k < blocks; k++) {
    seed = (seed * 48271) % 2147483647;
    const r = seed % size;
    seed = (seed * 48271) % 2147483647;
    const c = seed % size;
    if (g[r][c] === null) {
      const style = BLOCK_STYLES[k % BLOCK_STYLES.length];
      g[r][c] = `${style.color} ${style.bevel}`;
    }
  }
  return g;
}

function randomTray(): (PieceShape | null)[] {
  return Array.from({ length: 3 }, (_, idx) => {
    const cells = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const style = BLOCK_STYLES[Math.floor(Math.random() * BLOCK_STYLES.length)];
    return {
      id: `${Date.now()}-${idx}-${Math.random()}`,
      cells,
      color: style.color,
      bevel: style.bevel
    };
  });
}

function canPlace(grid: (string | null)[][], piece: PieceShape, row: number, col: number): boolean {
  const size = grid.length;
  return piece.cells.every(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    return r >= 0 && r < size && c >= 0 && c < size && grid[r][c] === null;
  });
}

function pieceCanFitAnywhere(grid: (string | null)[][], piece: PieceShape): boolean {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (canPlace(grid, piece, r, c)) return true;
    }
  }
  return false;
}

function hasAnyValidMove(grid: (string | null)[][], tray: (PieceShape | null)[]): boolean {
  for (const piece of tray) {
    if (!piece) continue;
    if (pieceCanFitAnywhere(grid, piece)) return true;
  }
  return false;
}

function playSound(type: 'place' | 'clear' | 'combo' | 'bonus' | 'gameover', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'place') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'clear') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.07);
      osc.frequency.setValueAtTime(783.99, now + 0.14);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'combo' || type === 'bonus') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(783.99, now + 0.08);
      osc.frequency.setValueAtTime(1046.5, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.35);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch {
    // ignore audio errors
  }
}

export interface GameTelemetry {
  piecesPlaced: number;
  linesCleared: number;
  maxCombo: number;
  mode: 'classic' | 'daily';
  dailyCompleted: boolean;
}

interface BlockBlastGameProps {
  currentXp: number;
  bestScore: number;
  dailyXpUsed: number;
  dailyXpCap: number;
  dailyChallengeDone: boolean;
  badges: string[];
  onSaveGame: (telemetry: GameTelemetry) => Promise<{
    ok: boolean;
    verifiedScore?: number;
    awardedXp?: number;
    message?: string;
  }>;
  onRefreshDashboard?: () => Promise<void>;
  onGoHome: () => void;
}

export function BlockBlastGame({
  currentXp,
  bestScore,
  dailyXpUsed,
  dailyXpCap,
  dailyChallengeDone,
  badges,
  onSaveGame,
  onRefreshDashboard,
  onGoHome
}: BlockBlastGameProps) {
  const { showToast } = useToast();

  // รองรับสลับ 8×8 (สไตล์ Y8 Block Blast) และ 10×10 (Block Master)
  const [gridSize, setGridSize] = useState<8 | 10>(8);
  const [mode, setMode] = useState<'classic' | 'daily'>('classic');
  const [grid, setGrid] = useState<(string | null)[][]>(() => createEmptyGrid(8));
  const [tray, setTray] = useState<(PieceShape | null)[]>(randomTray);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());
  const [callout, setCallout] = useState<string>('');

  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusQuizScore, setBonusQuizScore] = useState(0);
  const [score, setScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [saving, setSaving] = useState(false);

  // ปุ่มด้านข้าง: ตอบคำถามรายวิชาเพื่อเพิ่มคะแนน & XP + สะสมสิทธิ์ล้าง 1 แถว
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<TriviaQuestion | null>(null);
  const [seenQuestionIds, setSeenQuestionIds] = useState<string[]>([]);
  const [quizFeedback, setQuizFeedback] = useState<{
    selected: number;
    correct: boolean;
    correctIndex: number;
    explanation: string;
    bonusScore: number;
    awardedXp: number;
  } | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [rowClearCharges, setRowClearCharges] = useState(0);

  // Pointer Drag-and-Drop State (เมาส์ + ปากกา + นิ้วบนมือถือยกเหนือนิ้ว 56px)
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<{
    idx: number;
    piece: PieceShape;
    x: number;
    y: number;
    isTouch: boolean;
  } | null>(null);

  const activePiece = dragging ? dragging.piece : selectedIdx !== null ? tray[selectedIdx] : null;
  const activeIdx = dragging ? dragging.idx : selectedIdx;

  const triggerCallout = useCallback((text: string) => {
    setCallout(text);
    setTimeout(() => {
      setCallout(prev => (prev === text ? '' : prev));
    }, 1150);
  }, []);

  const resetBoard = useCallback((nextMode: 'classic' | 'daily', nextSize: 8 | 10) => {
    setMode(nextMode);
    setGridSize(nextSize);
    setGrid(nextMode === 'daily' ? createDailyGrid(nextSize) : createEmptyGrid(nextSize));
    setTray(randomTray());
    setSelectedIdx(0);
    setHoverCell(null);
    setClearingCells(new Set());
    setCallout('');
    setPiecesPlaced(0);
    setLinesCleared(0);
    setCombo(0);
    setMaxCombo(0);
    setBonusQuizScore(0);
    setScore(0);
    setGameOver(false);
  }, []);

  const submitTelemetry = useCallback(
    async (stats: GameTelemetry) => {
      if (stats.piecesPlaced === 0 && stats.linesCleared === 0) return;
      setSaving(true);
      try {
        const res = await onSaveGame(stats);
        if (res.ok) {
          showToast(
            `บันทึกคะแนนเกมแล้ว! คะแนนตรวจสอบ ${res.verifiedScore} • รับ +${res.awardedXp} XP`,
            { kind: 'success' }
          );
        } else {
          showToast(res.message || 'ไม่สามารถบันทึกคะแนนได้', { kind: 'error' });
        }
      } finally {
        setSaving(false);
      }
    },
    [onSaveGame, showToast]
  );

  const placeAt = useCallback(
    (row: number, col: number, pieceIndex: number) => {
      if (gameOver) return;
      const piece = tray[pieceIndex];
      if (!piece || !canPlace(grid, piece, row, col)) return;

      const size = grid.length;
      const nextGrid = grid.map(r => [...r]);
      const cellClass = `${piece.color} ${piece.bevel}`;
      for (const [dr, dc] of piece.cells) {
        nextGrid[row + dr][col + dc] = cellClass;
      }

      const fullRows: number[] = [];
      const fullCols: number[] = [];
      for (let r = 0; r < size; r++) {
        if (nextGrid[r].every(cell => cell !== null)) fullRows.push(r);
      }
      for (let c = 0; c < size; c++) {
        if (nextGrid.every(r => r[c] !== null)) fullCols.push(c);
      }

      const clearedKeys = new Set<string>();
      for (const r of fullRows) {
        for (let c = 0; c < size; c++) {
          clearedKeys.add(`${r},${c}`);
          nextGrid[r][c] = null;
        }
      }
      for (const c of fullCols) {
        for (let r = 0; r < size; r++) {
          clearedKeys.add(`${r},${c}`);
          nextGrid[r][c] = null;
        }
      }

      const clearedNow = fullRows.length + fullCols.length;
      const nextPiecesPlaced = piecesPlaced + 1;
      const nextLinesCleared = linesCleared + clearedNow;
      const nextCombo = clearedNow > 0 ? combo + 1 : 0;
      const nextMaxCombo = Math.max(maxCombo, nextCombo);

      // สูตรคะแนนหลัก (10 คะแนน/แนว + โบนัสวาง + คอมโบ) + โบนัสตอบคำถามรายวิชา
      const baseScore =
        nextLinesCleared * 10 + nextPiecesPlaced * 2 + (nextMaxCombo > 1 ? (nextMaxCombo - 1) * 15 : 0);
      const nextScore = baseScore + bonusQuizScore;

      if (clearedNow > 0) {
        setClearingCells(clearedKeys);
        setTimeout(() => setClearingCells(new Set()), 280);
        playSound(nextCombo > 1 || clearedNow >= 2 ? 'combo' : 'clear', soundOn);
        const msg =
          clearedNow >= 3
            ? `UNBELIEVABLE! +${clearedNow * 10}`
            : nextCombo >= 3
              ? `COMBO x${nextCombo} 🔥`
              : clearedNow === 2
                ? `GREAT! +${clearedNow * 10}`
                : nextCombo === 2
                  ? 'COMBO x2!'
                  : `GOOD! +${clearedNow * 10}`;
        triggerCallout(msg);
      } else {
        playSound('place', soundOn);
      }

      const nextTray = tray.map((p, i) => (i === pieceIndex ? null : p));
      const finalTray = nextTray.every(p => p === null) ? randomTray() : nextTray;

      setGrid(nextGrid);
      setTray(finalTray);
      setPiecesPlaced(nextPiecesPlaced);
      setLinesCleared(nextLinesCleared);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      setScore(nextScore);

      const firstAvail = finalTray.findIndex(p => p !== null);
      setSelectedIdx(firstAvail >= 0 ? firstAvail : null);

      const isDailyWin = mode === 'daily' && nextScore >= DAILY_TARGET_SCORE;
      if (!hasAnyValidMove(nextGrid, finalTray)) {
        setGameOver(true);
        playSound('gameover', soundOn);
        void submitTelemetry({
          piecesPlaced: nextPiecesPlaced,
          linesCleared: nextLinesCleared,
          maxCombo: nextMaxCombo,
          mode,
          dailyCompleted: isDailyWin
        });
      }
    },
    [bonusQuizScore, combo, gameOver, grid, linesCleared, maxCombo, mode, piecesPlaced, soundOn, submitTelemetry, tray, triggerCallout]
  );

  // ใช้สิทธิ์ตัวช่วย "ล้างแถวที่แน่นที่สุด 1 แถว" จากการตอบคำถามรายวิชาถูกครบ 2 ข้อ
  function handleUseRowClearPowerup() {
    if (rowClearCharges <= 0 || gameOver) return;
    let densestRow = -1;
    let maxFilled = 0;
    grid.forEach((rowArr, r) => {
      const filled = rowArr.filter(Boolean).length;
      if (filled > maxFilled) {
        maxFilled = filled;
        densestRow = r;
      }
    });
    if (densestRow === -1) {
      showToast('กระดานยังว่างอยู่ ยังไม่ต้องใช้ตัวช่วยครับ', { kind: 'info' });
      return;
    }

    const size = grid.length;
    const clearedKeys = new Set<string>();
    const nextGrid = grid.map(r => [...r]);
    for (let c = 0; c < size; c++) {
      clearedKeys.add(`${densestRow},${c}`);
      nextGrid[densestRow][c] = null;
    }
    setClearingCells(clearedKeys);
    setTimeout(() => setClearingCells(new Set()), 280);
    setGrid(nextGrid);
    setRowClearCharges(c => c - 1);
    playSound('bonus', soundOn);
    triggerCallout('POWER BLAST! ล้าง 1 แถว');
    showToast('ใช้ตัวช่วยล้างแถวที่แน่นที่สุดเรียบร้อย!', { kind: 'success' });
  }

  // โหลดคำถามรายวิชาการออกแบบและเทคโนโลยีจากเซิร์ฟเวอร์ (ไม่ส่งเฉลยมาที่เบราว์เซอร์)
  async function loadCourseQuestion() {
    setQuizOpen(true);
    setQuizLoading(true);
    setQuizFeedback(null);
    try {
      const exclude = seenQuestionIds.slice(-8).join(',');
      const res = await fetch(`/api/student/game-quiz?exclude=${encodeURIComponent(exclude)}`);
      const json = await res.json();
      if (json.ok && json.question) {
        setActiveQuestion(json.question);
        setSeenQuestionIds(prev => [...prev.slice(-10), json.question.id]);
      } else {
        showToast('ไม่สามารถโหลดคำถามรายวิชาได้', { kind: 'error' });
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์คำถามได้', { kind: 'error' });
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleAnswerCourseQuiz(selectedIndex: number) {
    if (!activeQuestion || quizFeedback || quizLoading) return;
    setQuizLoading(true);
    try {
      const res = await fetch('/api/student/game-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: activeQuestion.id, selectedIndex })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'ตรวจคำตอบไม่สำเร็จ', { kind: 'error' });
        return;
      }

      setQuizFeedback({
        selected: selectedIndex,
        correct: json.correct,
        correctIndex: json.correctIndex,
        explanation: json.explanation,
        bonusScore: json.bonusScore,
        awardedXp: json.awardedXp
      });

      if (json.correct) {
        playSound('bonus', soundOn);
        const nextBonus = bonusQuizScore + json.bonusScore;
        setBonusQuizScore(nextBonus);
        setScore(prev => prev + json.bonusScore);
        const nextCorrect = quizCorrectCount + 1;
        setQuizCorrectCount(nextCorrect);
        if (nextCorrect % 2 === 0) {
          setRowClearCharges(c => c + 1);
          showToast(`ตอบถูก! +${json.bonusScore} คะแนน, +${json.awardedXp} XP และรับตัวช่วย "ล้าง 1 แถว" ฟรี!`, {
            kind: 'success'
          });
        } else {
          showToast(`ตอบถูกต้อง! รับโบนัส +${json.bonusScore} คะแนน และ +${json.awardedXp} XP`, {
            kind: 'success'
          });
        }
        triggerCallout(`+${json.bonusScore} BONUS QUIZ!`);
        await onRefreshDashboard?.();
      } else {
        showToast('ยังไม่ถูกครับ อ่านคำอธิบายแล้วลองข้อต่อไปได้เลย!', { kind: 'info' });
      }
    } finally {
      setQuizLoading(false);
    }
  }

  const getCellFromPoint = useCallback((clientX: number, clientY: number, piece: PieceShape): [number, number] | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    const size = grid.length;
    const maxR = Math.max(...piece.cells.map(c => c[0]));
    const maxC = Math.max(...piece.cells.map(c => c[1]));
    const cellW = rect.width / size;
    const cellH = rect.height / size;
    const rawCol = Math.floor((clientX - rect.left) / cellW - maxC / 2);
    const rawRow = Math.floor((clientY - rect.top) / cellH - maxR / 2);
    return [rawRow, rawCol];
  }, [grid.length]);

  useEffect(() => {
    if (!dragging) return;
    const touchOffsetY = dragging.isTouch ? -56 : 0;
    function onMove(e: PointerEvent) {
      setDragging(prev => (prev ? { ...prev, x: e.clientX, y: e.clientY + touchOffsetY } : null));
      if (dragging) {
        const cell = getCellFromPoint(e.clientX, e.clientY + touchOffsetY, dragging.piece);
        setHoverCell(cell);
      }
    }
    function onUp(e: PointerEvent) {
      if (dragging) {
        const cell = getCellFromPoint(e.clientX, e.clientY + touchOffsetY, dragging.piece);
        if (cell && canPlace(grid, dragging.piece, cell[0], cell[1])) {
          placeAt(cell[0], cell[1], dragging.idx);
        }
      }
      setDragging(null);
      setHoverCell(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, getCellFromPoint, grid, placeAt]);

  // คำนวณ Placement Preview + Pre-Clear Blast Preview (ไฮไลต์ทั้งแถว/คอลัมน์ที่จะระเบิดก่อนปล่อยวาง!)
  const { previewSet, previewValid, willClearSet } = useMemo(() => {
    const pSet = new Set<string>();
    const wcSet = new Set<string>();
    if (!activePiece || !hoverCell || gameOver) {
      return { previewSet: pSet, previewValid: false, willClearSet: wcSet };
    }
    const valid = canPlace(grid, activePiece, hoverCell[0], hoverCell[1]);
    for (const [dr, dc] of activePiece.cells) {
      pSet.add(`${hoverCell[0] + dr},${hoverCell[1] + dc}`);
    }
    if (valid) {
      const size = grid.length;
      const sim = grid.map(r => [...r]);
      for (const [dr, dc] of activePiece.cells) {
        sim[hoverCell[0] + dr][hoverCell[1] + dc] = 'PREVIEW';
      }
      for (let r = 0; r < size; r++) {
        if (sim[r].every(cell => cell !== null)) {
          for (let c = 0; c < size; c++) wcSet.add(`${r},${c}`);
        }
      }
      for (let c = 0; c < size; c++) {
        if (sim.every(r => r[c] !== null)) {
          for (let r = 0; r < size; r++) wcSet.add(`${r},${c}`);
        }
      }
    }
    return { previewSet: pSet, previewValid: valid, willClearSet: wcSet };
  }, [activePiece, hoverCell, gameOver, grid]);

  const dailyGoalReached = mode === 'daily' && score >= DAILY_TARGET_SCORE;

  return (
    <div className="space-y-6 select-none">
      {/* Header & Controls */}
      <div className="tus-card p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-[var(--color-primary)]">
            BLOCK MASTER PUZZLE ({gridSize}×{gridSize})
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            กติกา XP: <strong>1 XP ต่อทุก 10 คะแนน</strong> + ตอบคำถามรายวิชาได้ <strong>+30 คะแนน & +5 XP</strong> (สูงสุด {dailyXpCap} XP/วัน • ใช้ไป {dailyXpUsed}/{dailyXpCap})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => resetBoard(mode, gridSize === 8 ? 10 : 8)}
            className="btn-secondary-3d btn-compact-3d"
            title="สลับขนาดกระดาน 8×8 และ 10×10"
          >
            กระดาน {gridSize === 8 ? '8×8 → 10×10' : '10×10 → 8×8'}
          </button>
          <button
            type="button"
            onClick={() => resetBoard('classic', gridSize)}
            className={mode === 'classic' ? 'btn-primary-3d btn-compact-3d' : 'btn-secondary-3d btn-compact-3d'}
          >
            Classic
          </button>
          <button
            type="button"
            onClick={() => resetBoard('daily', gridSize)}
            className={mode === 'daily' ? 'btn-primary-3d btn-compact-3d' : 'btn-secondary-3d btn-compact-3d'}
          >
            <CalendarCheck className="w-4 h-4" />
            Daily {dailyChallengeDone ? '(ผ่านแล้ว)' : '(+20 XP)'}
          </button>
          <button
            type="button"
            onClick={() => setSoundOn(v => !v)}
            className="btn-secondary-3d btn-compact-3d !px-3"
            aria-label={soundOn ? 'ปิดเสียงเกม' : 'เปิดเสียงเกม'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Split: Board (7 cols) + Side Course Quiz Bonus & Piece Tray (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Game Board + Piece Tray */}
        <div className="lg:col-span-7 tus-card p-4 sm:p-6 space-y-5">
          {/* Scoreboard Bar (สไตล์ Block Blast: มงกุฎสถิติสูงสุดซ้าย / คะแนนใหญ่กลาง / ปุ่มขวา) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="px-3.5 py-2 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-[var(--color-gold)] flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <div>
                  <div className="text-[10px] leading-none font-bold">สูงสุด</div>
                  <div className="font-heading font-extrabold text-base leading-tight">
                    {Math.max(bestScore, score)}
                  </div>
                </div>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)]">
                <div className="text-[10px] leading-none text-[var(--text-secondary)] font-bold">คะแนนรอบนี้</div>
                <div className="font-heading font-extrabold text-2xl text-[var(--color-primary)] leading-tight">
                  {score}
                </div>
              </div>
              {combo > 1 && (
                <div className="px-3 py-1.5 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-[var(--color-gold)] font-heading font-extrabold text-sm inline-flex items-center gap-1 animate-scale-pop">
                  <Flame className="w-4 h-4" /> x{combo}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {rowClearCharges > 0 && (
                <button
                  type="button"
                  onClick={handleUseRowClearPowerup}
                  className="btn-secondary-3d btn-compact-3d border-[var(--color-gold-border)] text-[var(--color-gold)]"
                  title="ใช้ตัวช่วยล้างแถวที่แน่นที่สุด 1 แถว"
                >
                  <Zap className="w-4 h-4" /> ล้างแถว ({rowClearCharges})
                </button>
              )}
              <button
                type="button"
                onClick={() => resetBoard(mode, gridSize)}
                className="btn-secondary-3d btn-compact-3d"
              >
                <RotateCcw className="w-4 h-4" /> RESTART
              </button>
              <button type="button" onClick={onGoHome} className="btn-secondary-3d btn-compact-3d">
                <Home className="w-4 h-4" /> HOME
              </button>
            </div>
          </div>

          {mode === 'daily' && (
            <div
              className={`p-3 rounded-2xl border text-sm font-heading font-semibold ${
                dailyGoalReached
                  ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success)]'
                  : 'bg-[var(--color-gold-bg)] border-[var(--color-gold-border)] text-[var(--color-gold)]'
              }`}
            >
              {dailyGoalReached
                ? 'พิชิตภารกิจรายวันสำเร็จ! กดบันทึกคะแนนเพื่อรับโบนัส +20 XP'
                : `ภารกิจรายวัน: ทำคะแนนให้ถึง ${DAILY_TARGET_SCORE} คะแนน (${score}/${DAILY_TARGET_SCORE})`}
            </div>
          )}

          {/* Board Container with Floating Callout */}
          <div className="relative mx-auto w-full max-w-[440px]">
            {callout && (
              <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center animate-scale-pop">
                <span className="px-5 py-2 rounded-2xl bg-[var(--color-primary)] text-white font-heading font-extrabold text-lg shadow-xl border-2 border-white">
                  {callout}
                </span>
              </div>
            )}

            <div
              ref={boardRef}
              onMouseLeave={() => !dragging && setHoverCell(null)}
              className="w-full aspect-square bg-[var(--bg-surface-muted)] p-2.5 rounded-2xl border-2 border-[var(--border-strong)] touch-none shadow-inner"
            >
              <div
                className="grid gap-1.5 w-full h-full"
                style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
              >
                {grid.map((rowArr, r) =>
                  rowArr.map((cellColor, c) => {
                    const key = `${r},${c}`;
                    const isPreview = previewSet.has(key);
                    const isWillClear = willClearSet.has(key);
                    const isClearing = clearingCells.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseEnter={() => !dragging && setHoverCell([r, c])}
                        onClick={() => activeIdx !== null && placeAt(r, c, activeIdx)}
                        aria-label={`ช่องแถว ${r + 1} คอลัมน์ ${c + 1}`}
                        className={`rounded-lg border transition-all duration-100 cursor-pointer ${
                          isClearing
                            ? 'bg-[var(--color-gold-border)] border-white scale-110 shadow-md'
                            : isWillClear
                              ? 'bg-[var(--color-gold-border)]/80 border-white ring-2 ring-[var(--color-gold-border)] scale-[1.03]'
                              : cellColor
                                ? `${cellColor}`
                                : isPreview
                                  ? previewValid
                                    ? 'bg-[#B8194F]/45 border-[#B8194F] scale-95'
                                    : 'bg-[#DC2626]/40 border-[#DC2626]'
                                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 3-Piece Tray right underneath the board (เหมือน Block Blast ต้นฉบับ) */}
          <div className="space-y-2">
            <p className="text-xs text-center text-[var(--text-secondary)]">
              ลากบล็อกด้านล่างไปวางบนกระดาน (หรือแตะเลือกแล้วแตะช่อง) • แถว/คอลัมน์ที่จะระเบิดจะเรืองแสงทองล่วงหน้า!
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-[440px] mx-auto">
              {tray.map((piece, idx) => {
                const isSelected = activeIdx === idx;
                const canFit = piece ? pieceCanFitAnywhere(grid, piece) : false;
                const maxR = piece ? Math.max(...piece.cells.map(c => c[0])) + 1 : 1;
                const maxC = piece ? Math.max(...piece.cells.map(c => c[1])) + 1 : 1;
                const cellPx = maxR >= 4 || maxC >= 4 ? 12 : 16;

                return (
                  <button
                    key={piece?.id || idx}
                    type="button"
                    disabled={!piece || gameOver}
                    onClick={() => setSelectedIdx(idx)}
                    onPointerDown={e => {
                      if (!piece || gameOver) return;
                      const isTouch = e.pointerType === 'touch';
                      setSelectedIdx(idx);
                      setDragging({
                        idx,
                        piece,
                        x: e.clientX,
                        y: e.clientY + (isTouch ? -56 : 0),
                        isTouch
                      });
                    }}
                    className={`min-h-[100px] rounded-2xl p-2.5 flex items-center justify-center border-2 transition touch-none cursor-grab active:cursor-grabbing ${
                      !piece
                        ? 'bg-[var(--bg-surface-muted)] border-dashed border-[var(--border-subtle)] opacity-35 cursor-default'
                        : !canFit
                          ? 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] opacity-45'
                          : isSelected
                            ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] shadow-md scale-[1.03]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {piece && (
                      <div
                        className="grid gap-1 pointer-events-none"
                        style={{ gridTemplateColumns: `repeat(${maxC}, ${cellPx}px)` }}
                      >
                        {Array.from({ length: maxR * maxC }, (_, cellIdx) => {
                          const rr = Math.floor(cellIdx / maxC);
                          const cc = cellIdx % maxC;
                          const filled = piece.cells.some(([pr, pc]) => pr === rr && pc === cc);
                          return (
                            <div
                              key={cellIdx}
                              style={{ width: cellPx, height: cellPx }}
                              className={`rounded-xs ${filled ? `${piece.color} ${piece.bevel} border` : 'bg-transparent'}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {score > 0 && !gameOver && (
            <div className="max-w-[440px] mx-auto">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setGameOver(true);
                  void submitTelemetry({
                    piecesPlaced,
                    linesCleared,
                    maxCombo,
                    mode,
                    dailyCompleted: dailyGoalReached
                  });
                }}
                className="w-full btn-secondary-3d"
              >
                <Sparkles className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'จบและบันทึกคะแนนรอบนี้เข้าฐานข้อมูล'}
              </button>
            </div>
          )}

          {gameOver && (
            <div className="p-5 rounded-2xl bg-[var(--color-primary-soft)] border-2 border-[var(--color-primary)] text-center space-y-3 animate-scale-pop">
              <div className="font-heading font-extrabold text-xl text-[var(--color-primary)]">
                GAME OVER — คะแนนรวม {score} คะแนน
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                เคลียร์ {linesCleared} แนว • คอมโบสูงสุด x{maxCombo} • โบนัสตอบคำถาม +{bonusQuizScore} คะแนน
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <button type="button" onClick={() => resetBoard(mode, gridSize)} className="btn-primary-3d">
                  <RotateCcw className="w-5 h-5" /> RESTART เล่นอีกครั้ง
                </button>
                <button type="button" onClick={onGoHome} className="btn-secondary-3d">
                  <Home className="w-5 h-5" /> HOME
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE PANEL: ปุ่มตอบคำถามรายวิชาเพื่อเพิ่มคะแนน + XP + เหรียญรางวัล */}
        <div className="lg:col-span-5 space-y-5">
          {/* ปุ่มด้านข้างสำหรับตอบคำถามรายวิชาเพิ่มคะแนน */}
          <div className="tus-card p-5 space-y-4 border-2 border-[var(--color-primary-border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block text-xs font-heading font-bold px-2.5 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  โบนัสความรู้ ว30184
                </span>
                <h3 className="font-heading font-bold text-lg text-[var(--text-primary)] mt-1">
                  ตอบคำถามรายวิชา เพิ่มคะแนนเกม!
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  ตอบถูก 1 ข้อ รับทันที <strong>+30 คะแนน</strong> และ <strong>+5 XP</strong> (ตอบถูกครบทุก 2 ข้อ รับตัวช่วย “ล้าง 1 แถว” ฟรี!)
                </p>
              </div>
            </div>

            {!quizOpen ? (
              <button
                type="button"
                onClick={() => void loadCourseQuestion()}
                className="w-full btn-primary-3d"
              >
                <HelpCircle className="w-5 h-5" />
                ตอบคำถามรายวิชา (+30 คะแนน & +5 XP)
              </button>
            ) : quizLoading && !activeQuestion ? (
              <div className="h-44 skeleton" />
            ) : activeQuestion ? (
              <div className="space-y-3 animate-scale-pop">
                <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2">
                  <span className="text-xs font-heading font-bold text-[var(--color-primary)]">
                    {activeQuestion.topic}
                  </span>
                  <div className="font-heading font-bold text-base text-[var(--text-primary)] leading-snug">
                    {activeQuestion.q}
                  </div>
                </div>

                <div className="space-y-2">
                  {activeQuestion.options.map((opt, idx) => {
                    let styleClass =
                      'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--color-primary)]';
                    if (quizFeedback) {
                      if (idx === quizFeedback.correctIndex) {
                        styleClass =
                          'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success)] font-bold';
                      } else if (idx === quizFeedback.selected && !quizFeedback.correct) {
                        styleClass =
                          'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)] font-bold';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={Boolean(quizFeedback) || quizLoading}
                        onClick={() => void handleAnswerCourseQuiz(idx)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition cursor-pointer disabled:cursor-default ${styleClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {quizFeedback && (
                  <div
                    className={`p-4 rounded-2xl border-2 space-y-2 animate-scale-pop ${
                      quizFeedback.correct
                        ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success)]'
                        : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
                    }`}
                  >
                    <div className="font-heading font-bold text-sm flex items-center gap-1.5">
                      {quizFeedback.correct ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" /> ถูกต้อง! +{quizFeedback.bonusScore} คะแนน และ +{quizFeedback.awardedXp} XP
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" /> ยังไม่ถูกครับ ลองดูคำอธิบายด้านล่าง
                        </>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">{quizFeedback.explanation}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void loadCourseQuestion()}
                        className="btn-primary-3d btn-compact-3d flex-1"
                      >
                        คำถามข้อถัดไป <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuizOpen(false);
                          setActiveQuestion(null);
                          setQuizFeedback(null);
                        }}
                        className="btn-secondary-3d btn-compact-3d"
                      >
                        พับเก็บ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
              <span>ตอบถูกในรอบนี้: <strong>{quizCorrectCount} ข้อ</strong></span>
              <span>โบนัสรวม: <strong className="text-[var(--color-primary)]">+{bonusQuizScore} คะแนน</strong></span>
            </div>
          </div>

          {/* XP & Best Score */}
          <div className="tus-card p-5 grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)]">
              <div className="text-xs font-heading font-bold text-[var(--color-gold)] flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> XP สะสมของฉัน
              </div>
              <div className="font-heading font-extrabold text-2xl text-[var(--color-gold)] mt-1">
                {currentXp} XP
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
              <div className="text-xs font-heading font-bold text-[var(--text-secondary)] flex items-center gap-1">
                <Trophy className="w-4 h-4 text-[var(--color-gold)]" /> เคลียร์แล้วรอบนี้
              </div>
              <div className="font-heading font-extrabold text-2xl text-[var(--text-primary)] mt-1">
                {linesCleared} แนว
              </div>
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="tus-card p-5 space-y-3">
            <h4 className="font-heading font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--color-gold)]" />
              เหรียญรางวัลของฉัน ({badges.length}/{Object.keys(BADGE_INFO).length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BADGE_INFO).map(([key, info]) => {
                const earned = badges.includes(key);
                return (
                  <div
                    key={key}
                    title={info.desc}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border ${
                      earned
                        ? 'bg-[var(--color-gold-bg)] border-[var(--color-gold-border)] text-[var(--color-gold)]'
                        : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                    }`}
                  >
                    {earned ? '🏅 ' : '🔒 '}
                    {info.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Ghost Piece while Dragging */}
      {dragging && (
        <div
          className="fixed z-[80] pointer-events-none opacity-90"
          style={{
            left: dragging.x,
            top: dragging.y,
            transform: 'translate(-50%, -60%)'
          }}
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${Math.max(...dragging.piece.cells.map(c => c[1])) + 1}, 26px)`
            }}
          >
            {Array.from(
              {
                length:
                  (Math.max(...dragging.piece.cells.map(c => c[0])) + 1) *
                  (Math.max(...dragging.piece.cells.map(c => c[1])) + 1)
              },
              (_, idx) => {
                const cols = Math.max(...dragging.piece.cells.map(c => c[1])) + 1;
                const rr = Math.floor(idx / cols);
                const cc = idx % cols;
                const filled = dragging.piece.cells.some(([pr, pc]) => pr === rr && pc === cc);
                return (
                  <div
                    key={idx}
                    className={`w-6 h-6 rounded-md ${
                      filled ? `${dragging.piece.color} ${dragging.piece.bevel} border shadow-lg` : 'bg-transparent'
                    }`}
                  />
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
