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
  ArrowRight,
  Palette,
  BarChart3,
  ShieldAlert,
  Play
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

const GRID_SIZE = 8;
const DAILY_TARGET_SCORE = 150;
const LOCAL_STATS_KEY = 'tus_blocky_blast_v2_stats';

type GameMode = 'classic' | 'hard' | 'daily';
type ThemeId = 'cobalt' | 'berry' | 'emerald';

interface BlockColorDef {
  id: string;
  bg: string;
  top: string;
  left: string;
  right: string;
  bottom: string;
  glow: string;
  ghostBg: string;
  ghostBorder: string;
}

interface PlacedCell {
  colorId: string;
  justPlaced?: boolean;
}

interface ClearingCell {
  colorId: string;
  delayMs: number;
}

interface PieceShape {
  id: string;
  shapeIndex: number;
  cells: [number, number][]; // [row, col]
  color: BlockColorDef;
}

interface TriviaQuestion {
  id: string;
  topic: string;
  q: string;
  options: string[];
}

interface LocalGameStats {
  highScore: number;
  gamesPlayed: number;
  totalLines: number;
  bestCombo: number;
}

interface CalloutState {
  id: number;
  title: string;
  subtitle?: string;
  points?: string;
  accent: string;
}

// 3 ธีมสีโทนเข้มสไตล์เกมมือถือ Blocky Blast Puzzle (สลับได้จากปุ่มจานสีมุมขวาบน)
const BOARD_THEMES: Record<
  ThemeId,
  {
    name: string;
    cabinetBg: string;
    cabinetBorder: string;
    boardRim: string;
    boardBg: string;
    emptyCellBg: string;
    emptyCellBorder: string;
    barBg: string;
    barFill: string;
    pillBg: string;
    accentText: string;
  }
> = {
  cobalt: {
    name: 'Royal Cobalt',
    cabinetBg: 'linear-gradient(180deg, #3A5499 0%, #2C417A 58%, #223363 100%)',
    cabinetBorder: '#5672BA',
    boardRim: '#4E69B0',
    boardBg: '#19213B',
    emptyCellBg: '#232E52',
    emptyCellBorder: '#161E38',
    barBg: '#19223E',
    barFill: 'linear-gradient(90deg, #38BDF8 0%, #FACC15 100%)',
    pillBg: 'rgba(20, 29, 56, 0.72)',
    accentText: '#FDE047'
  },
  berry: {
    name: 'Midnight Rose',
    cabinetBg: 'linear-gradient(180deg, #64214C 0%, #441636 58%, #2D0F24 100%)',
    cabinetBorder: '#9D3B79',
    boardRim: '#8C356C',
    boardBg: '#1C0D18',
    emptyCellBg: '#2B1526',
    emptyCellBorder: '#170A14',
    barBg: '#200E1B',
    barFill: 'linear-gradient(90deg, #F472B6 0%, #FBBF24 100%)',
    pillBg: 'rgba(28, 12, 24, 0.72)',
    accentText: '#FDE68A'
  },
  emerald: {
    name: 'Emerald Arcade',
    cabinetBg: 'linear-gradient(180deg, #1A5C57 0%, #124041 58%, #0C2D30 100%)',
    cabinetBorder: '#34938C',
    boardRim: '#2C827B',
    boardBg: '#0B1F22',
    emptyCellBg: '#133136',
    emptyCellBorder: '#09191C',
    barBg: '#0B2023',
    barFill: 'linear-gradient(90deg, #34D399 0%, #FDE047 100%)',
    pillBg: 'rgba(10, 29, 32, 0.72)',
    accentText: '#6EE7B7'
  }
};

// ชุดสีบล็อกอัญมณี 3D Chamfered Bevel สดใสแบบ Blocky Blast Puzzle (Poki)
const BLOCK_COLORS: BlockColorDef[] = [
  {
    id: 'vermilion',
    bg: '#FF471A',
    top: '#FF9A76',
    left: '#FF6B42',
    right: '#D92B04',
    bottom: '#A81C00',
    glow: 'rgba(255, 71, 26, 0.65)',
    ghostBg: 'rgba(255, 71, 26, 0.34)',
    ghostBorder: '#FF855E'
  },
  {
    id: 'amber',
    bg: '#FF9B0A',
    top: '#FFD475',
    left: '#FFB53D',
    right: '#D97700',
    bottom: '#A85600',
    glow: 'rgba(255, 155, 10, 0.65)',
    ghostBg: 'rgba(255, 155, 10, 0.34)',
    ghostBorder: '#FFC557'
  },
  {
    id: 'purple',
    bg: '#B43CFF',
    top: '#E0A3FF',
    left: '#C86BFF',
    right: '#8D1FD9',
    bottom: '#6912A8',
    glow: 'rgba(180, 60, 255, 0.65)',
    ghostBg: 'rgba(180, 60, 255, 0.34)',
    ghostBorder: '#D587FF'
  },
  {
    id: 'blue',
    bg: '#1877FF',
    top: '#7CC0FF',
    left: '#4798FF',
    right: '#0A54CC',
    bottom: '#063B96',
    glow: 'rgba(24, 119, 255, 0.65)',
    ghostBg: 'rgba(24, 119, 255, 0.34)',
    ghostBorder: '#6BB4FF'
  },
  {
    id: 'emerald',
    bg: '#16C75E',
    top: '#7CF2AA',
    left: '#3DDD7D',
    right: '#0B9943',
    bottom: '#066E2E',
    glow: 'rgba(22, 199, 94, 0.65)',
    ghostBg: 'rgba(22, 199, 94, 0.34)',
    ghostBorder: '#68EB9D'
  },
  {
    id: 'rose',
    bg: '#F4367A',
    top: '#FF94B9',
    left: '#FA5E95',
    right: '#C71858',
    bottom: '#940C3E',
    glow: 'rgba(244, 54, 122, 0.65)',
    ghostBg: 'rgba(244, 54, 122, 0.34)',
    ghostBorder: '#FF7CAA'
  },
  {
    id: 'cyan',
    bg: '#08B8D8',
    top: '#7AEBFF',
    left: '#3BD2ED',
    right: '#048BA6',
    bottom: '#026378',
    glow: 'rgba(8, 184, 216, 0.65)',
    ghostBg: 'rgba(8, 184, 216, 0.34)',
    ghostBorder: '#67E2F7'
  }
];

const COLOR_MAP: Record<string, BlockColorDef> = Object.fromEntries(
  BLOCK_COLORS.map(c => [c.id, c])
);

// คลังรูปทรงบล็อกครบชุด (เส้นตรง 1–5 ช่อง, สี่เหลี่ยม 2×2 / 3×3 / 2×3, รูป L, J, T, Z, S ครบทุกทิศ — ห้ามหมุนบล็อก)
interface ShapeTemplate {
  cells: [number, number][];
  weightClassic: number;
  weightHard: number;
}

const SHAPE_LIBRARY: ShapeTemplate[] = [
  // 1×1
  { cells: [[0, 0]], weightClassic: 5, weightHard: 2 },
  // เส้นตรง 2–5 ช่อง (แนวนอน & แนวตั้ง)
  { cells: [[0, 0], [0, 1]], weightClassic: 7, weightHard: 4 },
  { cells: [[0, 0], [1, 0]], weightClassic: 7, weightHard: 4 },
  { cells: [[0, 0], [0, 1], [0, 2]], weightClassic: 8, weightHard: 6 },
  { cells: [[0, 0], [1, 0], [2, 0]], weightClassic: 8, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], weightClassic: 6, weightHard: 7 },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], weightClassic: 6, weightHard: 7 },
  { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], weightClassic: 4, weightHard: 7 },
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], weightClassic: 4, weightHard: 7 },
  // สี่เหลี่ยม 2×2, 2×3, 3×2, 3×3
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], weightClassic: 9, weightHard: 7 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], weightClassic: 4, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], weightClassic: 4, weightHard: 6 },
  {
    cells: [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2]
    ],
    weightClassic: 4,
    weightHard: 8
  },
  // มุม L เล็ก 3 ช่อง (4 ทิศ)
  { cells: [[0, 0], [1, 0], [1, 1]], weightClassic: 6, weightHard: 4 },
  { cells: [[0, 0], [0, 1], [1, 0]], weightClassic: 6, weightHard: 4 },
  { cells: [[0, 0], [0, 1], [1, 1]], weightClassic: 6, weightHard: 4 },
  { cells: [[0, 1], [1, 0], [1, 1]], weightClassic: 6, weightHard: 4 },
  // รูป L / J 4 ช่อง (ครบทุกทิศ)
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 1], [1, 1], [2, 1], [2, 0]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [1, 0], [2, 0]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 0], [1, 0], [1, 1], [1, 2]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 2], [1, 0], [1, 1], [1, 2]], weightClassic: 5, weightHard: 6 },
  // รูป L ใหญ่ 3×3 (5 ช่อง)
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], weightClassic: 3, weightHard: 6 },
  { cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], weightClassic: 3, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], weightClassic: 3, weightHard: 6 },
  { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], weightClassic: 3, weightHard: 6 },
  // รูป T (4 ทิศ)
  { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 1], [1, 0], [1, 1], [1, 2]], weightClassic: 5, weightHard: 6 },
  { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], weightClassic: 4, weightHard: 5 },
  { cells: [[0, 1], [1, 0], [1, 1], [2, 1]], weightClassic: 4, weightHard: 5 },
  // รูป Z & S (4 ทิศ)
  { cells: [[0, 0], [0, 1], [1, 1], [1, 2]], weightClassic: 4, weightHard: 6 },
  { cells: [[0, 1], [0, 2], [1, 0], [1, 1]], weightClassic: 4, weightHard: 6 },
  { cells: [[0, 1], [1, 0], [1, 1], [2, 0]], weightClassic: 4, weightHard: 6 },
  { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], weightClassic: 4, weightHard: 6 }
];

const BADGE_INFO: Record<string, { label: string; desc: string }> = {
  first_game: { label: 'ก้าวแรก', desc: 'เล่นจบ 1 รอบ' },
  line_sweeper: { label: 'นักเคลียร์แถว', desc: 'เคลียร์อย่างน้อย 5 แนวในรอบเดียว' },
  combo_master: { label: 'จ้าวคอมโบ', desc: 'ทำคอมโบต่อเนื่อง 3 ครั้งขึ้นไป' },
  daily_hero: { label: 'พิชิตภารกิจรายวัน', desc: 'ผ่านโหมด Daily Challenge' },
  xp_500: { label: 'ตำนาน 500 XP', desc: 'สะสม XP รวมถึง 500' }
};

function createEmptyGrid(): (PlacedCell | null)[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function createStarterGrid(mode: GameMode): (PlacedCell | null)[][] {
  const g = createEmptyGrid();
  if (mode === 'classic') return g;

  const seedStr =
    mode === 'daily'
      ? new Date().toISOString().slice(0, 10)
      : `hard-${Date.now() % 9973}`;
  let seed = 1337;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 99991;
  }

  const count = mode === 'hard' ? 14 : 11;
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < 120) {
    guard++;
    seed = (seed * 48271) % 2147483647;
    const r = seed % GRID_SIZE;
    seed = (seed * 48271) % 2147483647;
    const c = seed % GRID_SIZE;
    if (!g[r][c]) {
      // ป้องกันไม่ให้แถวหรือคอลัมน์เต็มตั้งแต่เริ่มเกม
      const rowCount = g[r].filter(Boolean).length;
      const colCount = g.filter(row => row[c] !== null).length;
      if (rowCount < GRID_SIZE - 2 && colCount < GRID_SIZE - 2) {
        const color = BLOCK_COLORS[placed % BLOCK_COLORS.length];
        g[r][c] = { colorId: color.id };
        placed++;
      }
    }
  }
  return g;
}

function canPlaceCells(
  grid: (PlacedCell | null)[][],
  cells: [number, number][],
  row: number,
  col: number
): boolean {
  return cells.every(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c] === null;
  });
}

function canPlace(
  grid: (PlacedCell | null)[][],
  piece: PieceShape,
  row: number,
  col: number
): boolean {
  return canPlaceCells(grid, piece.cells, row, col);
}

function shapeFitsAnywhere(grid: (PlacedCell | null)[][], cells: [number, number][]): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (canPlaceCells(grid, cells, r, c)) return true;
    }
  }
  return false;
}

function pieceCanFitAnywhere(grid: (PlacedCell | null)[][], piece: PieceShape): boolean {
  return shapeFitsAnywhere(grid, piece.cells);
}

function hasAnyValidMove(grid: (PlacedCell | null)[][], tray: (PieceShape | null)[]): boolean {
  return tray.some(piece => piece !== null && pieceCanFitAnywhere(grid, piece));
}

function getPieceDimensions(cells: [number, number][]): { rows: number; cols: number } {
  let maxR = 0;
  let maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

function pickWeightedShapeIndex(mode: GameMode, excludeIndices: Set<number>): number {
  const candidates = SHAPE_LIBRARY.map((t, idx) => ({
    idx,
    w: mode === 'hard' ? t.weightHard : t.weightClassic
  })).filter(item => !excludeIndices.has(item.idx));

  const pool = candidates.length > 0 ? candidates : SHAPE_LIBRARY.map((t, idx) => ({ idx, w: t.weightClassic }));
  const totalWeight = pool.reduce((sum, item) => sum + item.w, 0);
  let r = Math.random() * totalWeight;
  for (const item of pool) {
    r -= item.w;
    if (r <= 0) return item.idx;
  }
  return pool[0].idx;
}

function makePiece(shapeIndex: number, slotIdx: number, colorOffset?: number): PieceShape {
  const template = SHAPE_LIBRARY[shapeIndex];
  const color =
    colorOffset !== undefined
      ? BLOCK_COLORS[colorOffset % BLOCK_COLORS.length]
      : BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
  return {
    id: `${Date.now()}-${slotIdx}-${Math.random().toString(36).slice(2, 7)}`,
    shapeIndex,
    cells: template.cells,
    color
  };
}

// ตัวสุ่มบล็อกแบบฉลาด (Smart Piece Spawner):
// รับประกันว่าชุด 3 ชิ้นที่สุ่มออกมาใหม่มีอย่างน้อย 1 ชิ้น (และพยายามให้มี 2 ชิ้นเมื่อกระดานยังไม่แน่นมาก) ที่วางลงกระดาน 8×8 ได้จริง!
function generateSmartTray(grid: (PlacedCell | null)[][], mode: GameMode): (PieceShape | null)[] {
  const usedShapes = new Set<number>();
  const usedColorIds = new Set<string>();
  const picked: PieceShape[] = [];

  for (let i = 0; i < 3; i++) {
    const shapeIdx = pickWeightedShapeIndex(mode, usedShapes);
    usedShapes.add(shapeIdx);
    const availableColors = BLOCK_COLORS.filter(c => !usedColorIds.has(c.id));
    const chosenColor =
      availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
    usedColorIds.add(chosenColor.id);
    picked.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      shapeIndex: shapeIdx,
      cells: SHAPE_LIBRARY[shapeIdx].cells,
      color: chosenColor
    });
  }

  // ตรวจสอบว่ามีบล็อกที่วางได้แล้วกี่ชิ้น
  const playableCount = picked.filter(p => pieceCanFitAnywhere(grid, p)).length;
  if (playableCount >= 1) {
    return picked;
  }

  // ถ้าสุ่มมาแล้ววางไม่ได้เลยทั้ง 3 ชิ้น ให้ค้นหารูปทรงที่วางได้จริงจากคลังมาแทนที่อย่างน้อย 1–2 ชิ้น
  const fittingIndices: number[] = [];
  for (let i = 0; i < SHAPE_LIBRARY.length; i++) {
    if (shapeFitsAnywhere(grid, SHAPE_LIBRARY[i].cells)) {
      fittingIndices.push(i);
    }
  }

  if (fittingIndices.length > 0) {
    const replaceSlot = Math.floor(Math.random() * 3);
    const chosenFit = fittingIndices[Math.floor(Math.random() * fittingIndices.length)];
    picked[replaceSlot] = makePiece(chosenFit, replaceSlot);

    // ถ้ายังมีตัวเลือกที่วางได้เหลืออีก และไม่ใช่โหมดยาก ให้ช่วยเพิ่มอีก 1 ชิ้นที่วางได้เมื่อมีโอกาส
    if (mode !== 'hard' && fittingIndices.length > 1) {
      const secondSlot = (replaceSlot + 1) % 3;
      const otherFits = fittingIndices.filter(i => i !== chosenFit);
      const secondFit = otherFits[Math.floor(Math.random() * otherFits.length)];
      picked[secondSlot] = makePiece(secondFit, secondSlot);
    }
  }

  return picked;
}

// Web Audio API Synthesizer (ไม่ใช้ไฟล์ภายนอก + ใช้ AudioContext ร่วมกันตัวเดียวไม่รั่ว memory)
let sharedAudioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      sharedAudioCtx = new AudioCtor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playSynthSound(
  type: 'pickup' | 'place' | 'clear' | 'combo' | 'bonus' | 'gameover',
  enabled: boolean,
  comboLevel = 1
) {
  if (!enabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    if (type === 'pickup') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.045);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
      return;
    }

    if (type === 'place') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.065);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      return;
    }

    if (type === 'clear' || type === 'combo') {
      // โน้ต pentatonic ไต่ระดับเสียงสูงขึ้นตามจังหวะ Combo
      const pitchBoost = Math.pow(1.06, Math.min(8, Math.max(0, comboLevel - 1)));
      const notes =
        type === 'combo'
          ? [523.25, 659.25, 783.99, 1046.5]
          : [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
        const start = now + idx * 0.055;
        osc.frequency.setValueAtTime(freq * pitchBoost, start);
        gain.gain.setValueAtTime(0.14, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
      return;
    }

    if (type === 'bonus') {
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const start = now + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.27);
      });
      return;
    }

    // gameover
    [330, 277.18, 220, 164.81].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const start = now + idx * 0.1;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.075, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // ignore audio errors
  }
}

// สไตล์บล็อกอัญมณี 3D Chamfered Bevel แบบ Blocky Blast Puzzle
function jewelBlockStyle(color: BlockColorDef, glowBoost = false): React.CSSProperties {
  return {
    backgroundColor: color.bg,
    borderTop: `3px solid ${color.top}`,
    borderLeft: `3px solid ${color.left}`,
    borderRight: `3px solid ${color.right}`,
    borderBottom: `3px solid ${color.bottom}`,
    boxShadow: glowBoost
      ? `0 0 14px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.45)`
      : `inset 0 1px 0 rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.35)`
  };
}

function loadLocalStats(): LocalGameStats {
  if (typeof window === 'undefined') {
    return { highScore: 0, gamesPlayed: 0, totalLines: 0, bestCombo: 0 };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STATS_KEY);
    if (!raw) return { highScore: 0, gamesPlayed: 0, totalLines: 0, bestCombo: 0 };
    const parsed = JSON.parse(raw) as Partial<LocalGameStats>;
    return {
      highScore: Number(parsed.highScore) || 0,
      gamesPlayed: Number(parsed.gamesPlayed) || 0,
      totalLines: Number(parsed.totalLines) || 0,
      bestCombo: Number(parsed.bestCombo) || 0
    };
  } catch {
    return { highScore: 0, gamesPlayed: 0, totalLines: 0, bestCombo: 0 };
  }
}

function saveLocalStats(stats: LocalGameStats) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

export interface GameTelemetry {
  piecesPlaced: number;
  cellsPlaced?: number;
  linesCleared: number;
  multiLineBonus?: number;
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

  const [themeId, setThemeId] = useState<ThemeId>('cobalt');
  const [mode, setMode] = useState<GameMode>('classic');
  const [grid, setGrid] = useState<(PlacedCell | null)[][]>(() => createEmptyGrid());
  const [tray, setTray] = useState<(PieceShape | null)[]>(() =>
    generateSmartTray(createEmptyGrid(), 'classic')
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [clearingMap, setClearingMap] = useState<Map<string, ClearingCell>>(new Map());
  const [callout, setCallout] = useState<CalloutState | null>(null);
  const [boardShaking, setBoardShaking] = useState(false);

  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const [cellsPlacedTotal, setCellsPlacedTotal] = useState(0);
  const [linesCleared, setLinesCleared] = useState(0);
  const [multiLineBonusTotal, setMultiLineBonusTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bonusQuizScore, setBonusQuizScore] = useState(0);
  const [score, setScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [lastAwardedXp, setLastAwardedXp] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // สถิติในเครื่อง (localStorage) + High Score
  const [localStats, setLocalStats] = useState<LocalGameStats>({
    highScore: 0,
    gamesPlayed: 0,
    totalLines: 0,
    bestCombo: 0
  });

  useEffect(() => {
    setLocalStats(loadLocalStats());
  }, []);

  // โบนัสคำถามรายวิชา ว30184
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

  // Smooth 60fps Drag-and-Drop Engine (ไม่สร้าง/ลบ window listener ซ้ำทุกเฟรม)
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragVisual, setDragVisual] = useState<{
    idx: number;
    piece: PieceShape;
    x: number;
    y: number;
    cellSize: number;
  } | null>(null);

  const dragMetaRef = useRef<{
    idx: number;
    piece: PieceShape;
    isTouch: boolean;
    cellSize: number;
    startX: number;
    startY: number;
    moved: boolean;
    offsetY: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const theme = BOARD_THEMES[themeId];
  const displayHighScore = Math.max(bestScore, localStats.highScore, score);
  const activePiece = dragVisual ? dragVisual.piece : selectedIdx !== null ? tray[selectedIdx] : null;
  const activeIdx = dragVisual ? dragVisual.idx : selectedIdx;

  // คำนวณเป้าหมาย Milestone Progress Bar (เหมือนแถบ 150 ด้านบนกระดาน Poki)
  const nextMilestone = useMemo(() => {
    if (mode === 'daily') return DAILY_TARGET_SCORE;
    const steps = [150, 300, 500, 800, 1200, 2000, 3500, 5000];
    return steps.find(s => score < s) || Math.ceil((score + 500) / 1000) * 1000;
  }, [mode, score]);

  const progressPct = Math.min(100, Math.round((score / Math.max(1, nextMilestone)) * 100));

  const triggerCallout = useCallback(
    (title: string, subtitle?: string, points?: string, accent = '#FDE047') => {
      const id = Date.now() + Math.random();
      setCallout({ id, title, subtitle, points, accent });
      window.setTimeout(() => {
        setCallout(prev => (prev && prev.id === id ? null : prev));
      }, 1150);
    },
    []
  );

  const cycleTheme = () => {
    const order: ThemeId[] = ['cobalt', 'berry', 'emerald'];
    const next = order[(order.indexOf(themeId) + 1) % order.length];
    setThemeId(next);
    playSynthSound('pickup', soundOn);
  };

  const resetBoard = useCallback((nextMode: GameMode) => {
    const freshGrid = createStarterGrid(nextMode);
    setMode(nextMode);
    setGrid(freshGrid);
    setTray(generateSmartTray(freshGrid, nextMode));
    setSelectedIdx(null);
    setHoverCell(null);
    setClearingMap(new Map());
    setCallout(null);
    setBoardShaking(false);
    setPiecesPlaced(0);
    setCellsPlacedTotal(0);
    setLinesCleared(0);
    setMultiLineBonusTotal(0);
    setCombo(0);
    setMaxCombo(0);
    setBonusQuizScore(0);
    setScore(0);
    setGameOver(false);
    setIsNewBest(false);
    setLastAwardedXp(null);
  }, []);

  const submitTelemetry = useCallback(
    async (stats: GameTelemetry) => {
      if (stats.piecesPlaced === 0 && stats.linesCleared === 0) return;
      setSaving(true);
      try {
        const res = await onSaveGame(stats);
        if (res.ok) {
          setLastAwardedXp(res.awardedXp ?? 0);
          showToast(
            `บันทึกคะแนนแล้ว! คะแนนตรวจสอบ ${res.verifiedScore} • รับ +${res.awardedXp} XP`,
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

  // คำนวณตำแหน่ง [row, col] จากพิกัดจุดศูนย์กลางของบล็อกที่กำลังลาก + ระบบดูดเข้าช่องใกล้เคียงแบบนุ่มนวล (Magnetic Snap)
  const getSnappedCell = useCallback(
    (centerX: number, centerY: number, piece: PieceShape, currentGrid: (PlacedCell | null)[][]): [number, number] | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      // อนุญาตระยะขอบรอบกระดานเล็กน้อย เพื่อให้วางขอบกระดานง่ายบนมือถือ
      const pad = rect.width * 0.08;
      if (
        centerX < rect.left - pad ||
        centerX > rect.right + pad ||
        centerY < rect.top - pad ||
        centerY > rect.bottom + pad
      ) {
        return null;
      }

      const { rows, cols } = getPieceDimensions(piece.cells);
      const cellW = rect.width / GRID_SIZE;
      const cellH = rect.height / GRID_SIZE;

      const exactCol = (centerX - rect.left) / cellW - cols / 2;
      const exactRow = (centerY - rect.top) / cellH - rows / 2;
      const baseRow = Math.round(exactRow);
      const baseCol = Math.round(exactCol);

      if (canPlace(currentGrid, piece, baseRow, baseCol)) {
        return [baseRow, baseCol];
      }

      // Magnetic forgiveness: ลองหาช่องข้างเคียงที่ใกล้ที่สุดภายในระยะ ~0.65 ช่องที่วางได้
      let bestCandidate: [number, number] | null = null;
      let bestDist = 0.72;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = baseRow + dr;
          const nc = baseCol + dc;
          if (!canPlace(currentGrid, piece, nr, nc)) continue;
          const dist = Math.hypot(nr - exactRow, nc - exactCol);
          if (dist < bestDist) {
            bestDist = dist;
            bestCandidate = [nr, nc];
          }
        }
      }
      if (bestCandidate) return bestCandidate;

      // คืนตำแหน่งฐานสำหรับแสดงเงาสีแดงกรณีวางไม่ได้ (ถ้าอยู่ในขอบเขตกระดาน)
      if (
        centerX >= rect.left &&
        centerX <= rect.right &&
        centerY >= rect.top &&
        centerY <= rect.bottom
      ) {
        return [baseRow, baseCol];
      }
      return null;
    },
    []
  );

  const placeAt = useCallback(
    (row: number, col: number, pieceIndex: number) => {
      if (gameOver) return;
      const piece = tray[pieceIndex];
      if (!piece || !canPlace(grid, piece, row, col)) return;

      // สร้างกระดานใหม่พร้อมล้าง flag justPlaced เดิม
      const nextGrid: (PlacedCell | null)[][] = grid.map(r =>
        r.map(cell => (cell ? { colorId: cell.colorId } : null))
      );

      for (const [dr, dc] of piece.cells) {
        nextGrid[row + dr][col + dc] = { colorId: piece.color.id, justPlaced: true };
      }

      // ตรวจหาแถวและคอลัมน์ที่เต็ม
      const fullRows: number[] = [];
      const fullCols: number[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        if (nextGrid[r].every(cell => cell !== null)) fullRows.push(r);
      }
      for (let c = 0; c < GRID_SIZE; c++) {
        if (nextGrid.every(r => r[c] !== null)) fullCols.push(c);
      }

      const clearedNow = fullRows.length + fullCols.length;
      const nextClearing = new Map<string, ClearingCell>();

      if (clearedNow > 0) {
        for (const r of fullRows) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const cell = nextGrid[r][c];
            nextClearing.set(`${r},${c}`, {
              colorId: cell?.colorId || piece.color.id,
              delayMs: c * 22
            });
          }
        }
        for (const c of fullCols) {
          for (let r = 0; r < GRID_SIZE; r++) {
            const cell = nextGrid[r][c];
            if (!nextClearing.has(`${r},${c}`)) {
              nextClearing.set(`${r},${c}`, {
                colorId: cell?.colorId || piece.color.id,
                delayMs: r * 22
              });
            }
          }
        }

        for (const key of nextClearing.keys()) {
          const [rr, cc] = key.split(',').map(Number);
          nextGrid[rr][cc] = null;
        }
      }

      // ตรวจว่าล้างกระดานเกลี้ยง (Perfect Clear!) หรือไม่
      const isAllClear = clearedNow > 0 && nextGrid.every(r => r.every(c => c === null));

      // ระบบคะแนนตามกติกา:
      // 1) วางบล็อกได้คะแนนเท่าจำนวนช่องที่วาง
      // 2) ล้างแถว/คอลัมน์: 1 แถว = 10, 2 แถว = 30, 3 แถว = 60, 4 แถว = 100 (ยิ่งหลายแนวพร้อมกันยิ่งคูณเพิ่ม!)
      // 3) Combo ต่อเนื่อง + โบนัสล้างหมดกระดาน
      const placementPoints = piece.cells.length;
      const baseLinePoints = clearedNow * 10;
      const extraMultiPoints = clearedNow > 1 ? (clearedNow * (clearedNow - 1) * 10) / 2 : 0;
      const nextCombo = clearedNow > 0 ? combo + 1 : 0;
      const nextMaxCombo = Math.max(maxCombo, nextCombo);
      const comboStepBonus = clearedNow > 0 && nextCombo > 1 ? (nextCombo - 1) * 15 : 0;
      const allClearBonus = isAllClear ? 100 : 0;
      const turnPoints =
        placementPoints + baseLinePoints + extraMultiPoints + comboStepBonus + allClearBonus;

      const nextPiecesPlaced = piecesPlaced + 1;
      const nextCellsPlaced = cellsPlacedTotal + placementPoints;
      const nextLinesCleared = linesCleared + clearedNow;
      const nextMultiBonusTotal = multiLineBonusTotal + extraMultiPoints + allClearBonus;
      const nextScore = score + turnPoints;

      // อัปเดตสถิติ High Score ในเครื่องทันที
      if (nextScore > displayHighScore) {
        setIsNewBest(true);
      }

      if (clearedNow > 0) {
        setClearingMap(nextClearing);
        window.setTimeout(() => setClearingMap(new Map()), 360);

        if (clearedNow >= 2 || nextCombo >= 2) {
          setBoardShaking(true);
          window.setTimeout(() => setBoardShaking(false), 250);
        }

        playSynthSound(
          nextCombo > 1 || clearedNow >= 2 ? 'combo' : 'clear',
          soundOn,
          nextCombo
        );

        let title = 'NICE!';
        let accent = '#67E8F9';
        if (isAllClear) {
          title = 'PERFECT CLEAR!';
          accent = '#FDE047';
        } else if (clearedNow >= 4) {
          title = 'UNBELIEVABLE!';
          accent = '#F472B6';
        } else if (clearedNow === 3) {
          title = 'AWESOME!';
          accent = '#FB923C';
        } else if (clearedNow === 2) {
          title = 'GREAT!';
          accent = '#FDE047';
        } else if (nextCombo >= 3) {
          title = 'AWESOME!';
          accent = '#FB923C';
        } else if (nextCombo === 2) {
          title = 'GREAT!';
          accent = '#FDE047';
        }

        const subtitle =
          nextCombo > 1
            ? `COMBO x${nextCombo} 🔥`
            : clearedNow > 1
              ? `ล้างพร้อมกัน ${clearedNow} แนว!`
              : undefined;

        triggerCallout(title, subtitle, `+${turnPoints}`, accent);
      } else {
        playSynthSound('place', soundOn);
      }

      // อัปเดตถาดบล็อก 3 ชิ้น — เมื่อวางครบทั้ง 3 ชิ้น ให้สุ่มชุดใหม่แบบฉลาด (Smart Spawner)
      const nextTray = tray.map((p, i) => (i === pieceIndex ? null : p));
      const finalTray = nextTray.every(p => p === null)
        ? generateSmartTray(nextGrid, mode)
        : nextTray;

      setGrid(nextGrid);
      setTray(finalTray);
      setPiecesPlaced(nextPiecesPlaced);
      setCellsPlacedTotal(nextCellsPlaced);
      setLinesCleared(nextLinesCleared);
      setMultiLineBonusTotal(nextMultiBonusTotal);
      setCombo(nextCombo);
      setMaxCombo(nextMaxCombo);
      setScore(nextScore);
      setSelectedIdx(null);
      setHoverCell(null);

      // อัปเดต localStorage เมื่อทำลายสถิติระหว่างเล่น
      setLocalStats(prev => {
        const nextBest = Math.max(prev.highScore, nextScore);
        const nextBestCombo = Math.max(prev.bestCombo, nextMaxCombo);
        if (nextBest !== prev.highScore || nextBestCombo !== prev.bestCombo) {
          const updated = { ...prev, highScore: nextBest, bestCombo: nextBestCombo };
          saveLocalStats(updated);
          return updated;
        }
        return prev;
      });

      // ตรวจ Game Over (ไม่มีบล็อกชิ้นไหนที่เหลือในถาดวางลงกระดาน 8×8 ได้อีก)
      if (!hasAnyValidMove(nextGrid, finalTray)) {
        setGameOver(true);
        playSynthSound('gameover', soundOn);

        setLocalStats(prev => {
          const updated: LocalGameStats = {
            highScore: Math.max(prev.highScore, nextScore),
            gamesPlayed: prev.gamesPlayed + 1,
            totalLines: prev.totalLines + nextLinesCleared,
            bestCombo: Math.max(prev.bestCombo, nextMaxCombo)
          };
          saveLocalStats(updated);
          return updated;
        });

        const isDailyWin = mode === 'daily' && nextScore >= DAILY_TARGET_SCORE;
        void submitTelemetry({
          piecesPlaced: nextPiecesPlaced,
          cellsPlaced: nextCellsPlaced,
          linesCleared: nextLinesCleared,
          multiLineBonus: nextMultiBonusTotal,
          maxCombo: nextMaxCombo,
          mode: mode === 'daily' ? 'daily' : 'classic',
          dailyCompleted: isDailyWin
        });
      }
    },
    [
      cellsPlacedTotal,
      combo,
      displayHighScore,
      gameOver,
      grid,
      linesCleared,
      maxCombo,
      mode,
      multiLineBonusTotal,
      piecesPlaced,
      score,
      soundOn,
      submitTelemetry,
      tray,
      triggerCallout
    ]
  );

  const placeAtRef = useRef(placeAt);
  placeAtRef.current = placeAt;

  // ตัวจัดการ Pointer ลากวางแบบลื่น 60fps (ไม่รบกวนการเลื่อนหน้าจอนอกโซนเกม)
  useEffect(() => {
    if (!isDragging) return;

    function onPointerMove(e: PointerEvent) {
      const meta = dragMetaRef.current;
      if (!meta) return;
      if (meta.isTouch) {
        e.preventDefault();
      }

      const dist = Math.hypot(e.clientX - meta.startX, e.clientY - meta.startY);
      if (dist > 6) {
        meta.moved = true;
      }

      const x = e.clientX;
      const y = e.clientY + meta.offsetY;
      setDragVisual({
        idx: meta.idx,
        piece: meta.piece,
        x,
        y,
        cellSize: meta.cellSize
      });

      const snapped = getSnappedCell(x, y, meta.piece, gridRef.current);
      setHoverCell(snapped);
    }

    function onPointerUp(e: PointerEvent) {
      const meta = dragMetaRef.current;
      dragMetaRef.current = null;
      setIsDragging(false);
      setDragVisual(null);

      if (!meta) return;
      const x = e.clientX;
      const y = e.clientY + meta.offsetY;
      const snapped = getSnappedCell(x, y, meta.piece, gridRef.current);

      if (snapped && canPlace(gridRef.current, meta.piece, snapped[0], snapped[1])) {
        placeAtRef.current(snapped[0], snapped[1], meta.idx);
      } else if (!meta.moved) {
        // แตะเฉยๆ โดยไม่ลาก -> สลับเลือกบล็อกไว้สำหรับแตะวางบนกระดาน
        setSelectedIdx(prev => (prev === meta.idx ? null : meta.idx));
      }
      setHoverCell(null);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [getSnappedCell, isDragging]);

  const startDragPiece = (e: React.PointerEvent, idx: number, piece: PieceShape) => {
    if (gameOver) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();

    const isTouch = e.pointerType === 'touch';
    const rect = boardRef.current?.getBoundingClientRect();
    const measuredCell = rect ? Math.max(24, Math.floor((rect.width - 20) / GRID_SIZE)) : 40;
    const { rows } = getPieceDimensions(piece.cells);
    // บนมือถือยกบล็อกลอยขึ้นเหนือนิ้วเพื่อไม่ให้นิ้วบังตำแหน่งที่จะวาง
    const offsetY = isTouch ? -Math.max(76, Math.round((rows * measuredCell) / 2 + 44)) : 0;

    playSynthSound('pickup', soundOn);

    dragMetaRef.current = {
      idx,
      piece,
      isTouch,
      cellSize: measuredCell,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      offsetY
    };

    setSelectedIdx(idx);
    setDragVisual({
      idx,
      piece,
      x: e.clientX,
      y: e.clientY + offsetY,
      cellSize: measuredCell
    });
    setIsDragging(true);

    const snapped = getSnappedCell(e.clientX, e.clientY + offsetY, piece, gridRef.current);
    setHoverCell(snapped);
  };

  // คำนวณ Ghost Preview + ไฮไลต์ทั้งแถว/คอลัมน์ที่จะเต็มก่อนวาง (Imminent Clear Pre-Highlight)
  const { previewSet, previewValid, willClearSet, willClearLinesCount } = useMemo(() => {
    const pSet = new Set<string>();
    const wcSet = new Set<string>();
    if (!activePiece || !hoverCell || gameOver) {
      return { previewSet: pSet, previewValid: false, willClearSet: wcSet, willClearLinesCount: 0 };
    }

    const valid = canPlace(grid, activePiece, hoverCell[0], hoverCell[1]);
    for (const [dr, dc] of activePiece.cells) {
      const r = hoverCell[0] + dr;
      const c = hoverCell[1] + dc;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        pSet.add(`${r},${c}`);
      }
    }

    let lineCount = 0;
    if (valid) {
      const sim = grid.map(r => r.map(c => c !== null));
      for (const [dr, dc] of activePiece.cells) {
        sim[hoverCell[0] + dr][hoverCell[1] + dc] = true;
      }
      for (let r = 0; r < GRID_SIZE; r++) {
        if (sim[r].every(Boolean)) {
          lineCount++;
          for (let c = 0; c < GRID_SIZE; c++) wcSet.add(`${r},${c}`);
        }
      }
      for (let c = 0; c < GRID_SIZE; c++) {
        if (sim.every(row => row[c])) {
          lineCount++;
          for (let r = 0; r < GRID_SIZE; r++) wcSet.add(`${r},${c}`);
        }
      }
    }

    return {
      previewSet: pSet,
      previewValid: valid,
      willClearSet: wcSet,
      willClearLinesCount: lineCount
    };
  }, [activePiece, hoverCell, gameOver, grid]);

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

    const nextClearing = new Map<string, ClearingCell>();
    const nextGrid = grid.map(r => [...r]);
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = nextGrid[densestRow][c];
      nextClearing.set(`${densestRow},${c}`, {
        colorId: cell?.colorId || 'amber',
        delayMs: c * 22
      });
      nextGrid[densestRow][c] = null;
    }
    setClearingMap(nextClearing);
    window.setTimeout(() => setClearingMap(new Map()), 360);
    setGrid(nextGrid);
    setRowClearCharges(c => c - 1);
    playSynthSound('bonus', soundOn);
    triggerCallout('POWER BLAST!', 'ล้างแถวที่แน่นที่สุดแล้ว', undefined, '#34D399');
    showToast('ใช้ตัวช่วยล้างแถวที่แน่นที่สุดเรียบร้อย!', { kind: 'success' });
  }

  // โหลดคำถามรายวิชาการออกแบบและเทคโนโลยีจากเซิร์ฟเวอร์
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
        playSynthSound('bonus', soundOn);
        setBonusQuizScore(prev => prev + json.bonusScore);
        setScore(prev => prev + json.bonusScore);
        const nextCorrect = quizCorrectCount + 1;
        setQuizCorrectCount(nextCorrect);
        if (nextCorrect % 2 === 0) {
          setRowClearCharges(c => c + 1);
          showToast(
            `ตอบถูก! +${json.bonusScore} คะแนน, +${json.awardedXp} XP และรับตัวช่วย "ล้าง 1 แถว" ฟรี!`,
            { kind: 'success' }
          );
        } else {
          showToast(`ตอบถูกต้อง! รับโบนัส +${json.bonusScore} คะแนน และ +${json.awardedXp} XP`, {
            kind: 'success'
          });
        }
        triggerCallout('BONUS QUIZ!', `+${json.awardedXp} XP`, `+${json.bonusScore}`, '#34D399');
        await onRefreshDashboard?.();
      } else {
        showToast('ยังไม่ถูกครับ อ่านคำอธิบายแล้วลองข้อต่อไปได้เลย!', { kind: 'info' });
      }
    } finally {
      setQuizLoading(false);
    }
  }

  const dailyGoalReached = mode === 'daily' && score >= DAILY_TARGET_SCORE;

  return (
    <div className="space-y-5 select-none">
      {/* แถบโหมดเกม & กติกา XP ด้านบน */}
      <div className="tus-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-heading font-extrabold text-lg sm:text-2xl text-[var(--color-primary)]">
              BLOCKY BLAST PUZZLE 8×8
            </h2>
            <span className="text-xs font-heading font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary-border)]">
              ห้ามหมุนบล็อก • Smart Spawner
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            ลากบล็อกลงกระดาน 8×8 ล้างหลายแถวพร้อมกันรับโบนัสคูณเพิ่ม + คอมโบ • รับ <strong>1 XP / 10 คะแนน</strong> (วันนี้ใช้ไป {dailyXpUsed}/{dailyXpCap} XP)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => resetBoard('classic')}
            className={mode === 'classic' ? 'btn-primary-3d btn-compact-3d' : 'btn-secondary-3d btn-compact-3d'}
          >
            โหมดปกติ
          </button>
          <button
            type="button"
            onClick={() => resetBoard('hard')}
            className={mode === 'hard' ? 'btn-primary-3d btn-compact-3d' : 'btn-secondary-3d btn-compact-3d'}
          >
            <ShieldAlert className="w-4 h-4" /> โหมดยาก
          </button>
          <button
            type="button"
            onClick={() => resetBoard('daily')}
            className={mode === 'daily' ? 'btn-primary-3d btn-compact-3d' : 'btn-secondary-3d btn-compact-3d'}
          >
            <CalendarCheck className="w-4 h-4" />
            Daily {dailyChallengeDone ? '(ผ่านแล้ว)' : '(+20 XP)'}
          </button>
          <button type="button" onClick={onGoHome} className="btn-secondary-3d btn-compact-3d">
            <Home className="w-4 h-4" /> หน้าหลัก
          </button>
        </div>
      </div>

      {/* Main Layout: ตู้เกม Dark Arcade 8×8 (ซ้าย/หลัก) + แผงโบนัสคำถาม & สถิติ (ขวา) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: ตู้เกม Blocky Blast Puzzle 8×8 สไตล์โทนเข้มเกมมือถือ (อ้างอิง Poki) */}
        <div
          className="lg:col-span-7 rounded-3xl p-3.5 sm:p-5 shadow-2xl border-2 text-white relative overflow-hidden"
          style={{
            background: theme.cabinetBg,
            borderColor: theme.cabinetBorder
          }}
        >
          {/* TOP HUD (เหมือน Blocky Blast บน Poki: ถ้วยสถิติสูงสุดซ้าย / คะแนนใหญ่กลาง / ปุ่มธีม-เสียง-เริ่มใหม่ขวา) */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            {/* ซ้าย: High Score (localStorage + Server) */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-white/15"
              style={{ backgroundColor: theme.pillBg }}
              title="คะแนนสูงสุดที่เก็บไว้ในเครื่องและเซิร์ฟเวอร์"
            >
              <Trophy className="w-5 h-5 text-amber-400 shrink-0 drop-shadow" />
              <div>
                <div className="text-[10px] leading-none text-white/70 font-bold">สูงสุด</div>
                <div className="font-heading font-extrabold italic text-base sm:text-lg leading-tight text-white">
                  {displayHighScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* กลาง: คะแนนรอบปัจจุบันตัวใหญ่สไตล์อาร์เคด */}
            <div className="text-center flex-1">
              <div
                key={score}
                className="font-heading font-black italic text-3xl sm:text-4xl tracking-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.38)] leading-none"
              >
                {score.toLocaleString()}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1 min-h-[18px]">
                {combo > 1 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-200 font-heading font-extrabold text-[11px] animate-scale-pop">
                    <Flame className="w-3.5 h-3.5 text-amber-300" /> COMBO x{combo}
                  </span>
                ) : (
                  <span className="text-[11px] font-heading font-semibold text-white/75">
                    {mode === 'hard'
                      ? 'โหมดยาก • บล็อกใหญ่'
                      : mode === 'daily'
                        ? dailyGoalReached
                          ? 'ผ่านภารกิจรายวันแล้ว! 🎉'
                          : `เป้าหมายวันนี้ ${DAILY_TARGET_SCORE} คะแนน`
                        : `ล้างแล้ว ${linesCleared} แนว`}
                  </span>
                )}
              </div>
            </div>

            {/* ขวา: สลับธีมสี / เปิด-ปิดเสียง / เริ่มใหม่ */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cycleTheme}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-white/20 hover:bg-white/15 active:scale-95 transition cursor-pointer"
                style={{ backgroundColor: theme.pillBg }}
                title={`เปลี่ยนธีมสี (ปัจจุบัน: ${theme.name})`}
                aria-label="เปลี่ยนธีมสี"
              >
                <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={() => setSoundOn(v => !v)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-white/20 hover:bg-white/15 active:scale-95 transition cursor-pointer"
                style={{ backgroundColor: theme.pillBg }}
                title={soundOn ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
                aria-label={soundOn ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
              >
                {soundOn ? (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
                )}
              </button>
              <button
                type="button"
                onClick={() => resetBoard(mode)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-white/20 hover:bg-white/15 active:scale-95 transition cursor-pointer"
                style={{ backgroundColor: theme.pillBg }}
                title="เริ่มเกมใหม่"
                aria-label="เริ่มเกมใหม่"
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Progress Bar เป้าหมาย Milestone ด้านบนกระดาน (สไตล์ Poki) */}
          <div className="max-w-[430px] mx-auto mb-3">
            <div className="flex items-center justify-between text-[11px] font-heading font-bold text-white/80 mb-1 px-0.5">
              <span>{mode === 'daily' ? 'ภารกิจรายวัน' : 'เป้าหมายถัดไป'}</span>
              <span className="italic" style={{ color: theme.accentText }}>
                {score} / {nextMilestone}
              </span>
            </div>
            <div
              className="h-2.5 w-full rounded-full overflow-hidden border border-white/15 shadow-inner"
              style={{ backgroundColor: theme.barBg }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  background: theme.barFill
                }}
              />
            </div>
          </div>

          {/* 8×8 BOARD CONTAINER */}
          <div
            className={`relative mx-auto w-full max-w-[430px] ${boardShaking ? 'animate-board-shake' : ''}`}
          >
            {/* Callout Popup ("GREAT!", "AWESOME!", "COMBO x3!", "+60") */}
            {callout && (
              <div
                key={callout.id}
                className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center animate-callout-pop"
              >
                <div
                  className="font-heading font-black italic text-3xl sm:text-4xl tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)] text-center"
                  style={{
                    color: callout.accent,
                    WebkitTextStroke: '1.5px rgba(15, 23, 42, 0.7)'
                  }}
                >
                  {callout.title}
                </div>
                {callout.subtitle && (
                  <div className="mt-1 px-3 py-0.5 rounded-full bg-slate-950/80 border border-white/25 text-white font-heading font-bold text-xs sm:text-sm shadow-lg">
                    {callout.subtitle}
                  </div>
                )}
                {callout.points && (
                  <div className="mt-1 font-heading font-black text-xl sm:text-2xl text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]">
                    {callout.points}
                  </div>
                )}
              </div>
            )}

            {/* 8×8 Inset Grid */}
            <div
              ref={boardRef}
              onMouseLeave={() => !isDragging && setHoverCell(null)}
              className={`w-full aspect-square p-2 sm:p-2.5 rounded-2xl shadow-[inset_0_4px_16px_rgba(0,0,0,0.55),0_10px_28px_rgba(0,0,0,0.3)] border-[3px] ${
                isDragging ? 'touch-none' : 'touch-pan-y'
              }`}
              style={{
                backgroundColor: theme.boardBg,
                borderColor: theme.boardRim
              }}
            >
              <div className="grid grid-cols-8 grid-rows-8 gap-[3px] sm:gap-1 w-full h-full">
                {grid.map((rowArr, r) =>
                  rowArr.map((cell, c) => {
                    const key = `${r},${c}`;
                    const clearing = clearingMap.get(key);
                    const isPreview = previewSet.has(key);
                    const isWillClear = willClearSet.has(key);
                    const placedColor = cell ? COLOR_MAP[cell.colorId] || BLOCK_COLORS[0] : null;
                    const clearColor = clearing ? COLOR_MAP[clearing.colorId] || BLOCK_COLORS[0] : null;
                    const highlightColor = activePiece?.color || BLOCK_COLORS[1];

                    // สร้างสไตล์ของแต่ละช่อง
                    let cellStyle: React.CSSProperties = {
                      backgroundColor: theme.emptyCellBg,
                      border: `1px solid ${theme.emptyCellBorder}`
                    };
                    let extraClass = '';

                    if (clearing && clearColor) {
                      cellStyle = {
                        ...jewelBlockStyle(clearColor, true),
                        animationDelay: `${clearing.delayMs}ms`
                      };
                      extraClass = 'animate-block-shatter';
                    } else if (isWillClear) {
                      // ไฮไลต์ทั้งแถว/คอลัมน์ที่จะเต็มก่อนวางด้วยสีบล็อกที่กำลังถือ
                      cellStyle = jewelBlockStyle(highlightColor, true);
                      extraClass = 'animate-will-clear z-10 scale-[1.02]';
                    } else if (placedColor) {
                      cellStyle = jewelBlockStyle(placedColor, false);
                      if (cell?.justPlaced) extraClass = 'animate-block-place';
                    } else if (isPreview) {
                      if (previewValid && activePiece) {
                        cellStyle = {
                          backgroundColor: activePiece.color.ghostBg,
                          border: `2px dashed ${activePiece.color.ghostBorder}`,
                          boxShadow: `inset 0 0 10px ${activePiece.color.glow}`
                        };
                      } else {
                        cellStyle = {
                          backgroundColor: 'rgba(239, 68, 68, 0.3)',
                          border: '2px solid rgba(248, 113, 113, 0.85)'
                        };
                      }
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseEnter={() => {
                          if (!isDragging && selectedIdx !== null && tray[selectedIdx]) {
                            setHoverCell([r, c]);
                          }
                        }}
                        onClick={() => {
                          if (selectedIdx !== null && tray[selectedIdx]) {
                            placeAt(r, c, selectedIdx);
                          }
                        }}
                        aria-label={`ช่องแถว ${r + 1} คอลัมน์ ${c + 1}`}
                        className={`w-full h-full rounded-[5px] sm:rounded-[6px] transition-[transform,filter] duration-100 relative cursor-pointer ${extraClass}`}
                        style={cellStyle}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* หน้าจอ GAME OVER Overlay กลางกระดาน */}
            {gameOver && (
              <div className="absolute inset-0 z-40 rounded-2xl bg-slate-950/82 flex flex-col items-center justify-center p-5 text-center animate-scale-pop border-2 border-white/20">
                {isNewBest && (
                  <span className="mb-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-heading font-black text-xs tracking-wider shadow-lg">
                    🏆 สถิติใหม่! NEW BEST!
                  </span>
                )}
                <div className="font-heading font-black italic text-3xl sm:text-4xl text-white drop-shadow">
                  จบเกม!
                </div>
                <div className="text-xs sm:text-sm text-white/75 mt-1">
                  ไม่มีพื้นที่ว่างสำหรับบล็อกที่เหลือแล้ว
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full max-w-[290px] my-4">
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
                    <div className="text-[11px] text-white/70 font-bold">คะแนนรอบนี้</div>
                    <div className="font-heading font-black text-2xl text-amber-300">
                      {score.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
                    <div className="text-[11px] text-white/70 font-bold">สถิติสูงสุด</div>
                    <div className="font-heading font-black text-2xl text-white">
                      {displayHighScore.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-white/80 mb-4 space-y-0.5">
                  <div>
                    ล้างได้ <strong>{linesCleared} แนว</strong> • คอมโบสูงสุด <strong>x{maxCombo}</strong>
                  </div>
                  {lastAwardedXp !== null && (
                    <div className="text-emerald-300 font-heading font-bold">
                      ได้รับ +{lastAwardedXp} XP บันทึกเข้าอันดับเรียบร้อย!
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => resetBoard(mode)}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-heading font-black text-base shadow-[0_4px_0_#065F46] active:translate-y-1 active:shadow-none transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current" /> เล่นใหม่
                  </button>
                  <button
                    type="button"
                    onClick={onGoHome}
                    className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-heading font-bold text-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Home className="w-4 h-4" /> กลับหน้าหลัก
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar เล็กๆ ใต้กระดาน (เหมือน Poki: แสดงตัวช่วยล้างแถว / สถานะกำลังจะล้าง) */}
          <div className="max-w-[430px] mx-auto mt-2.5 flex items-center justify-between gap-2 min-h-[30px]">
            <div className="text-[11px] sm:text-xs font-heading font-semibold text-white/80">
              {willClearLinesCount > 0 ? (
                <span className="text-amber-300 font-bold animate-pulse">
                  ✨ ปล่อยวางเพื่อล้างพร้อมกัน {willClearLinesCount} แนว!
                </span>
              ) : (
                'ลากบล็อกด้านล่างไปวางบนกระดาน (ห้ามหมุนบล็อก)'
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {rowClearCharges > 0 && (
                <button
                  type="button"
                  onClick={handleUseRowClearPowerup}
                  className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 font-heading font-extrabold text-xs inline-flex items-center gap-1 shadow hover:brightness-105 active:scale-95 transition cursor-pointer"
                  title="ใช้ตัวช่วยล้างแถวที่แน่นที่สุด 1 แถว"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" /> ล้างแถว ({rowClearCharges})
                </button>
              )}
              {score > 0 && !gameOver && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setGameOver(true);
                    void submitTelemetry({
                      piecesPlaced,
                      cellsPlaced: cellsPlacedTotal,
                      linesCleared,
                      multiLineBonus: multiLineBonusTotal,
                      maxCombo,
                      mode: mode === 'daily' ? 'daily' : 'classic',
                      dailyCompleted: dailyGoalReached
                    });
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-heading font-bold text-[11px] transition cursor-pointer"
                >
                  {saving ? 'กำลังบันทึก...' : 'จบและเก็บ XP'}
                </button>
              )}
            </div>
          </div>

          {/* 3-PIECE TRAY ด้านล่างกระดาน (วางเรียง 3 ช่องพอดีตา touch-none เฉพาะตัวบล็อกเพื่อให้ลากบนมือถือลื่นมาก) */}
          <div className="max-w-[430px] mx-auto mt-2 grid grid-cols-3 gap-2.5 sm:gap-3">
            {tray.map((piece, idx) => {
              const isBeingDragged = dragVisual?.idx === idx;
              const isSelected = !dragVisual && selectedIdx === idx;
              const canFit = piece ? pieceCanFitAnywhere(grid, piece) : false;
              const dims = piece ? getPieceDimensions(piece.cells) : { rows: 1, cols: 1 };
              const maxDim = Math.max(dims.rows, dims.cols);
              const previewPx = maxDim >= 5 ? 15 : maxDim === 4 ? 18 : maxDim === 3 ? 21 : 24;

              return (
                <div
                  key={piece?.id || `empty-${idx}`}
                  onPointerDown={e => {
                    if (piece && !gameOver) {
                      startDragPiece(e, idx, piece);
                    }
                  }}
                  role="button"
                  tabIndex={piece && !gameOver ? 0 : -1}
                  aria-label={piece ? `บล็อกชิ้นที่ ${idx + 1}` : 'ช่องว่าง'}
                  onKeyDown={e => {
                    if (piece && !gameOver && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setSelectedIdx(prev => (prev === idx ? null : idx));
                    }
                  }}
                  className={`h-[104px] sm:h-[118px] rounded-2xl flex items-center justify-center transition-all touch-none ${
                    !piece
                      ? 'bg-black/15 border border-dashed border-white/15'
                      : isBeingDragged
                        ? 'opacity-0 scale-90'
                        : !canFit
                          ? 'bg-black/25 border border-white/10 opacity-40 cursor-not-allowed'
                          : isSelected
                            ? 'bg-white/20 border-2 border-amber-300 shadow-[0_0_18px_rgba(253,224,71,0.35)] scale-[1.03] cursor-grab'
                            : 'bg-black/20 hover:bg-white/10 border border-white/15 cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {piece && (
                    <div
                      className="grid gap-[2px] pointer-events-none drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)]"
                      style={{
                        gridTemplateColumns: `repeat(${dims.cols}, ${previewPx}px)`
                      }}
                    >
                      {Array.from({ length: dims.rows * dims.cols }, (_, cellIdx) => {
                        const rr = Math.floor(cellIdx / dims.cols);
                        const cc = cellIdx % dims.cols;
                        const filled = piece.cells.some(([pr, pc]) => pr === rr && pc === cc);
                        return (
                          <div
                            key={cellIdx}
                            style={{
                              width: previewPx,
                              height: previewPx,
                              ...(filled ? jewelBlockStyle(piece.color, false) : {})
                            }}
                            className={`rounded-[4px] ${filled ? '' : 'bg-transparent'}`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE PANEL: โบนัสตอบคำถามรายวิชา + สถิติการเล่น + เหรียญรางวัล */}
        <div className="lg:col-span-5 space-y-4">
          {/* การ์ดโบนัสตอบคำถามรายวิชา ว30184 */}
          <div className="tus-card p-5 space-y-4 border-2 border-[var(--color-primary-border)]">
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
              <span>
                ตอบถูกในรอบนี้: <strong>{quizCorrectCount} ข้อ</strong>
              </span>
              <span>
                โบนัสรวม: <strong className="text-[var(--color-primary)]">+{bonusQuizScore} คะแนน</strong>
              </span>
            </div>
          </div>

          {/* XP สะสม + สถิติในเครื่อง */}
          <div className="tus-card p-5 space-y-3">
            <h4 className="font-heading font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
              สถิติและคะแนนสะสมของฉัน
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)]">
                <div className="text-xs font-heading font-bold text-[var(--color-gold)] flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> XP สะสม
                </div>
                <div className="font-heading font-extrabold text-2xl text-[var(--color-gold)] mt-0.5">
                  {currentXp} XP
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
                <div className="text-xs font-heading font-bold text-[var(--text-secondary)] flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-[var(--color-gold)]" /> High Score
                </div>
                <div className="font-heading font-extrabold text-2xl text-[var(--text-primary)] mt-0.5">
                  {displayHighScore.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">เล่นจบทั้งหมด</span>
                <strong className="font-heading text-sm text-[var(--text-primary)]">
                  {localStats.gamesPlayed} รอบ
                </strong>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">คอมโบสูงสุด</span>
                <strong className="font-heading text-sm text-[var(--color-primary)]">
                  x{Math.max(localStats.bestCombo, maxCombo)}
                </strong>
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

      {/* บล็อกลอยขนาดจริง 1:1 ขณะลากด้วยเมาส์หรือนิ้วบนมือถือ */}
      {dragVisual && (
        <div
          className="fixed z-[90] pointer-events-none"
          style={{
            left: dragVisual.x,
            top: dragVisual.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {(() => {
            const dims = getPieceDimensions(dragVisual.piece.cells);
            return (
              <div
                className="grid gap-[3px] drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]"
                style={{
                  gridTemplateColumns: `repeat(${dims.cols}, ${dragVisual.cellSize}px)`
                }}
              >
                {Array.from({ length: dims.rows * dims.cols }, (_, idx) => {
                  const rr = Math.floor(idx / dims.cols);
                  const cc = idx % dims.cols;
                  const filled = dragVisual.piece.cells.some(([pr, pc]) => pr === rr && pc === cc);
                  return (
                    <div
                      key={idx}
                      style={{
                        width: dragVisual.cellSize,
                        height: dragVisual.cellSize,
                        ...(filled ? jewelBlockStyle(dragVisual.piece.color, true) : {})
                      }}
                      className={`rounded-[6px] ${filled ? '' : 'bg-transparent'}`}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
