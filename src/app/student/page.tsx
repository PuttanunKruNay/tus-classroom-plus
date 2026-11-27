'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Home,
  BookOpen,
  ClipboardCheck,
  Send,
  Award,
  Gamepad2,
  KeyRound,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Clock,
  Upload,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
  Box,
  FileText,
  Cpu,
  FileSpreadsheet,
  Link2,
  ShieldCheck
} from 'lucide-react';
import { PortalHeader } from '@/components/PortalHeader';
import { BannerCarousel } from '@/components/BannerCarousel';
import { Top5Leaderboard, type Top5Item } from '@/components/Top5Leaderboard';
import { FloatingAiTutor } from '@/components/FloatingAiTutor';
import { FloatingContactTeacher } from '@/components/FloatingContactTeacher';
import { BlockBlastGame, type GameTelemetry } from '@/components/BlockBlastGame';
import { InteractiveChapterHub } from '@/components/labs/InteractiveChapterHub';
import { TechTaleCircuitLab } from '@/components/techtale/TechTaleCircuitLab';
import { CHAPTER_LAB_CONFIGS } from '@/lib/interactive-labs-data';
import { useToast } from '@/components/ToastProvider';
import type {
  Assignment,
  ClassRoom,
  CourseOverview,
  Lesson,
  PrBanner,
  PublicStudent,
  StreamPost,
  StudentQuizQuestion,
  SubmissionRecord
} from '@/types/database';

interface StudentDashboardData {
  student: PublicStudent;
  hasJoinedClass: boolean;
  enrolledClasses: ClassRoom[];
  prBanners: PrBanner[];
  courseOverview: CourseOverview;
  lessons: Lesson[];
  assignments: Assignment[];
  quizzes: Record<string, StudentQuizQuestion[]>;
  submissions: Record<string, SubmissionRecord>;
  gradeSummary: { totalScore: number; totalMax: number; percent: number; grade: string };
  announcements: StreamPost[];
  leaderboard: Top5Item[];
  quotas: {
    dailyXpUsed: number;
    dailyXpCap: number;
    dailyAiRemaining: number;
    dailyAiLimit: number;
    dailyChallengeDone: boolean;
  };
}

type StudentTab = 'home' | 'lessons' | 'circuit' | 'quizzes' | 'line' | 'grades' | 'game';

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentPortalPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<StudentTab>('home');

  // Class Code Gate & "เปลี่ยนรหัสคลาส" Modal
  const [classCodeInput, setClassCodeInput] = useState('');
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [joining, setJoining] = useState(false);

  // Course Description Expand/Collapse
  const [descExpanded, setDescExpanded] = useState(false);

  // Lessons
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [lessonViewMode, setLessonViewMode] = useState<'lab' | 'slides'>('lab');
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [deckIdx, setDeckIdx] = useState(0);
  const [aiPromptTrigger, setAiPromptTrigger] = useState<{
    text: string;
    lessonTitle?: string;
    nonce: number;
  } | null>(null);

  // Quizzes
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{
    correctCount: number;
    totalQuestions: number;
    score: number;
    maxScore: number;
  } | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // LINE Submission
  const [selectedLineAsgId, setSelectedLineAsgId] = useState<string>('');
  const [lineName, setLineName] = useState('');
  const [lineNote, setLineNote] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [submittingLine, setSubmittingLine] = useState(false);

  // Comment
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  // Google Sheets (Google Drive) Auto Scores
  const [sheetScores, setSheetScores] = useState<{
    loading: boolean;
    loaded: boolean;
    connected: boolean;
    found: boolean;
    matchedBy?: string;
    sheetScope?: string;
    fetchedAt?: string;
    errorMessage?: string;
    columns: { header: string; value: string }[];
  }>({
    loading: false,
    loaded: false,
    connected: false,
    found: false,
    columns: []
  });

  const loadSheetScores = useCallback(async () => {
    setSheetScores(prev => ({ ...prev, loading: true, errorMessage: undefined }));
    try {
      const res = await fetch('/api/student/sheet-scores', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setSheetScores(prev => ({
          ...prev,
          loading: false,
          loaded: true,
          errorMessage: json.message || 'ไม่สามารถดึงคะแนนจาก Google Drive ได้ในขณะนี้'
        }));
        return;
      }
      setSheetScores({
        loading: false,
        loaded: true,
        connected: Boolean(json.connected),
        found: Boolean(json.found),
        matchedBy: json.matchedBy,
        sheetScope: json.sheetScope,
        fetchedAt: json.fetchedAt,
        errorMessage: json.errorMessage,
        columns: Array.isArray(json.columns) ? json.columns : []
      });
    } catch {
      setSheetScores(prev => ({
        ...prev,
        loading: false,
        loaded: true,
        errorMessage: 'ไม่สามารถเชื่อมต่อระบบดึงคะแนนจาก Google Drive ได้ชั่วคราว'
      }));
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch('/api/student/dashboard');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลห้องเรียนได้');
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'โหลดข้อมูลไม่สำเร็จ');

      setData(json);
      if (json.lessons?.length) {
        setSelectedLessonId(prev => prev || json.lessons[0].id);
      }
      const formAsgs = (json.assignments || []).filter((a: Assignment) => a.category === 'form');
      if (formAsgs.length) {
        setSelectedQuizId(prev => prev || formAsgs[0].id);
      }
      const lineAsgs = (json.assignments || []).filter((a: Assignment) => a.category === 'line');
      if (lineAsgs.length) {
        setSelectedLineAsgId(prev => prev || lineAsgs[0].id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeTab === 'grades' && data?.hasJoinedClass && !sheetScores.loaded && !sheetScores.loading) {
      void loadSheetScores();
    }
  }, [activeTab, data?.hasJoinedClass, sheetScores.loaded, sheetScores.loading, loadSheetScores]);

  async function handleJoinClass(e: React.FormEvent, replaceCurrent = false) {
    e.preventDefault();
    setJoining(true);
    try {
      const res = await fetch('/api/student/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: classCodeInput, replaceCurrent })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'รหัสคลาสไม่ถูกต้อง', { kind: 'error' });
        return;
      }
      setClassCodeInput('');
      setChangeClassOpen(false);
      showToast(`เข้าร่วมห้องเรียน ${json.joinedClass.name} เรียบร้อยแล้ว`, { kind: 'success' });
      await loadDashboard();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmitQuiz() {
    if (!data || !selectedQuizId) return;
    const questions = data.quizzes[selectedQuizId] || [];
    const answersArr = questions.map((_, idx) =>
      typeof quizAnswers[idx] === 'number' ? quizAnswers[idx] : -1
    );
    if (answersArr.some(a => a === -1)) {
      showToast('กรุณาเลือกคำตอบให้ครบทุกข้อก่อนส่งแบบทดสอบ', { kind: 'error' });
      return;
    }
    setSubmittingQuiz(true);
    try {
      const res = await fetch('/api/student/quiz-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: selectedQuizId, answers: answersArr })
      });
      const json = await res.json();
      if (json.ok) {
        setQuizResult({
          correctCount: json.correctCount,
          totalQuestions: json.totalQuestions,
          score: json.score,
          maxScore: json.maxScore
        });
        showToast(`ตรวจข้อสอบสำเร็จ! ได้ ${json.score}/${json.maxScore} คะแนน`, { kind: 'success' });
        await loadDashboard();
      } else {
        showToast(json.message || 'ส่งแบบทดสอบไม่สำเร็จ', { kind: 'error' });
      }
    } finally {
      setSubmittingQuiz(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)', { kind: 'error' });
      return;
    }
    try {
      const compressed = await compressImageFile(file);
      setProofImage(compressed);
      showToast('ย่อขนาดและเตรียมภาพหลักฐานเรียบร้อย', { kind: 'info' });
    } catch {
      showToast('ไม่สามารถอ่านไฟล์ภาพนี้ได้ กรุณาเลือกไฟล์ภาพอื่น', { kind: 'error' });
    }
  }

  async function handleSubmitLine(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLineAsgId || !lineName.trim() || !proofImage) {
      showToast('กรุณากรอกชื่อ LINE และแนบภาพหลักฐานการส่งงานให้ครบ', { kind: 'error' });
      return;
    }
    setSubmittingLine(true);
    try {
      const res = await fetch('/api/student/line-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedLineAsgId,
          lineName,
          note: lineNote,
          proofImage
        })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(
          json.isDuplicate
            ? 'ส่งหลักฐานเพิ่มเติมเรียบร้อย (ระบบแจ้งครูว่าเป็นรายการส่งซ้ำเพื่อช่วยตรวจสอบ)'
            : 'ส่งหลักฐาน LINE เข้าสู่ระบบเรียบร้อย รอครูตรวจสอบครับ',
          { kind: 'success' }
        );
        setLineNote('');
        setProofImage('');
        await loadDashboard();
      } else {
        showToast(json.message || 'ส่งงานไม่สำเร็จ', { kind: 'error' });
      }
    } finally {
      setSubmittingLine(false);
    }
  }

  async function handleAddComment(postId: string) {
    const text = (commentTexts[postId] || '').trim();
    if (!text) return;
    const res = await fetch('/api/student/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, text })
    });
    const json = await res.json();
    if (json.ok) {
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      showToast('ส่งความคิดเห็นแล้ว', { kind: 'success' });
      await loadDashboard();
    } else {
      showToast(json.message || 'ส่งความคิดเห็นไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleSaveGame(telemetry: GameTelemetry) {
    const res = await fetch('/api/student/game-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemetry)
    });
    const json = await res.json();
    if (json.ok) {
      await loadDashboard();
    }
    return json;
  }

  async function handleSyncCircuitXp(circuitPoints: number, label: string) {
    try {
      const res = await fetch('/api/student/game-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'circuit',
          circuitPoints,
          label
        })
      });
      const json = await res.json();
      if (json.ok) {
        if ((json.awardedXp || 0) > 0) {
          showToast(
            `รวมคะแนนต่อวงจรเข้า XP แล้ว! รับ +${json.awardedXp} XP (XP รวม ${json.gameXp} XP)`,
            { kind: 'success' }
          );
        } else {
          showToast('บันทึกคะแนนต่อวงจรแล้ว (วันนี้ครบโควตา XP รายวันแล้ว)', { kind: 'info' });
        }
        await loadDashboard();
      }
      return json;
    } catch {
      return { ok: false };
    }
  }

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PortalHeader subtitle="กำลังโหลดห้องเรียนนักเรียน..." role="student" />
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="w-full aspect-[16/9] md:aspect-[21/9] skeleton" />
          <div className="h-32 skeleton" />
          <div className="h-56 skeleton" />
        </main>
      </div>
    );
  }

  // Error State
  if (loadError || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <PortalHeader subtitle="ระบบนักเรียน" role="student" />
        <main className="max-w-xl w-full mx-auto px-4 py-12">
          <div className="tus-card p-8 text-center space-y-4 border-2 border-[var(--color-danger)]">
            <AlertCircle className="w-12 h-12 text-[var(--color-danger)] mx-auto" />
            <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
              ไม่สามารถโหลดข้อมูลห้องเรียนได้
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              สาเหตุ: {loadError || 'ไม่พบข้อมูลบัญชี'} — กรุณากดปุ่มด้านล่างเพื่อลองเชื่อมต่อใหม่
            </p>
            <button type="button" onClick={loadDashboard} className="btn-primary-3d">
              <RefreshCw className="w-5 h-5" /> ลองโหลดใหม่
            </button>
          </div>
        </main>
      </div>
    );
  }

  const fullName = `${data.student.prefix}${data.student.firstName} ${data.student.lastName}`;
  const primaryClass = data.enrolledClasses[0];
  const classLabel = primaryClass?.name || 'ยังไม่เข้าคลาส';
  const classCodeLabel = primaryClass?.classCode || '-';

  const currentLesson = data.lessons.find(l => l.id === selectedLessonId) || data.lessons[0];
  const quizAssignments = data.assignments.filter(a => a.category === 'form');
  const lineAssignments = data.assignments.filter(a => a.category === 'line');
  const activeQuizAsg = quizAssignments.find(a => a.id === selectedQuizId) || quizAssignments[0];
  const activeQuizQuestions = activeQuizAsg ? data.quizzes[activeQuizAsg.id] || [] : [];
  const activeLineAsg = lineAssignments.find(a => a.id === selectedLineAsgId) || lineAssignments[0];

  const tabs: { id: StudentTab; label: string; short: string; icon: typeof Home }[] = [
    { id: 'home', label: 'หน้าแรก', short: 'หน้าแรก', icon: Home },
    { id: 'lessons', label: 'บทเรียนและสไลด์', short: 'บทเรียน', icon: BookOpen },
    { id: 'circuit', label: 'ต่อวงจร TechTale', short: 'วงจร', icon: Cpu },
    { id: 'quizzes', label: 'บททดสอบ', short: 'สอบ', icon: ClipboardCheck },
    { id: 'line', label: 'ส่งงาน LINE', short: 'LINE', icon: Send },
    { id: 'grades', label: 'คะแนนของฉัน', short: 'คะแนน', icon: Award },
    { id: 'game', label: 'เกมเก็บ XP', short: 'XP', icon: Gamepad2 }
  ];

  return (
    <div className="min-h-screen flex flex-col pb-28 md:pb-14">
      <PortalHeader
        subtitle={`${data.courseOverview.courseCode} ${data.courseOverview.courseNameTh}`}
        userName={fullName}
        userMeta={`รหัส ${data.student.studentId} • ห้อง ${classLabel}`}
        role="student"
      />

      {/* Modal เปลี่ยนรหัสคลาส (แสดงเฉพาะเมื่อกดลิงก์เล็กๆ "เปลี่ยนรหัสคลาส") */}
      {changeClassOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setChangeClassOpen(false)}
        >
          <div
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">เปลี่ยนรหัสคลาสเรียน</h3>
              <button
                type="button"
                onClick={() => setChangeClassOpen(false)}
                className="p-2 rounded-xl hover:bg-[var(--bg-surface-muted)] cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              กรอกรหัสคลาสใหม่ที่ได้รับจากครูผู้สอน เพื่อย้ายไปยังห้องเรียนที่ถูกต้อง
            </p>
            <form onSubmit={e => handleJoinClass(e, true)} className="space-y-3">
              <input
                type="text"
                required
                value={classCodeInput}
                onChange={e => setClassCodeInput(e.target.value.toUpperCase())}
                placeholder="เช่น TUS-7M2P"
                className="tus-input font-mono text-center tracking-widest uppercase"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setChangeClassOpen(false)} className="btn-secondary-3d">
                  ยกเลิก
                </button>
                <button type="submit" disabled={joining} className="btn-primary-3d">
                  {joining ? 'กำลังเปลี่ยนห้อง...' : 'ยืนยันเปลี่ยนรหัสคลาส'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {!data.hasJoinedClass ? (
          <div className="max-w-lg mx-auto tus-card p-7 text-center space-y-5 mt-6 animate-scale-pop">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary-border)] mx-auto flex items-center justify-center">
              <KeyRound className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                กรอกรหัสคลาสเรียนเพื่อเข้าสู่ห้องเรียน
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                ขอรหัสคลาสจากครูผู้สอนประจำวิชา (เช่น <code className="font-mono font-bold text-[var(--color-primary)]">TUS-4A8K</code>)
              </p>
            </div>
            <form onSubmit={e => handleJoinClass(e, false)} className="space-y-4">
              <input
                type="text"
                required
                value={classCodeInput}
                onChange={e => setClassCodeInput(e.target.value.toUpperCase())}
                placeholder="กรอกรหัสคลาส"
                className="tus-input font-mono text-center tracking-widest uppercase"
              />
              <button type="submit" disabled={joining} className="w-full btn-primary-3d">
                {joining ? 'กำลังตรวจสอบรหัสคลาส...' : 'ยืนยันเข้าร่วมคลาสเรียน'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* แท็บด้านบนที่เดียวสำหรับคอม/แท็บเล็ต (ไม่มีแถบซ้าย) */}
            <nav
              aria-label="เมนูหลักนักเรียน"
              className="hidden md:flex tus-card p-2 items-center justify-center flex-wrap gap-2"
            >
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-heading font-bold transition inline-flex items-center gap-2 cursor-pointer ${
                      active
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Bottom Navigation สำหรับมือถือ (แสดงครบ 7 ปุ่มพอดีจอ ไม่ต้องเลื่อนแนวนอน) */}
            <nav
              aria-label="เมนูล่างมือถือ"
              className="md:hidden fixed bottom-0 inset-x-0 z-40 tus-bottom-nav pb-safe px-1 pt-1.5"
            >
              <div className="grid grid-cols-7 gap-0.5">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`relative min-h-[54px] px-0.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition active:scale-95 ${
                          active ? 'text-[var(--color-primary)] bg-[var(--color-primary-soft)] font-bold' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {active && (
                          <span className="absolute top-0.5 w-6 h-1 rounded-full bg-[var(--color-primary)]" />
                        )}
                        <Icon className="w-5 h-5 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-heading leading-tight">{tab.short}</span>
                      </button>
                  );
                })}
              </div>
            </nav>

            <div key={activeTab} className="animate-fade-up">
              {/* ================================================================
                  TAB 1: หน้าแรก (เรียงลำดับ 1 -> 5 ตามแบบที่กำหนดไว้เป๊ะๆ!)
                  (1) แบนเนอร์ประชาสัมพันธ์
                  (2) การ์ดต้อนรับ (ห้อง, รหัสคลาส, คะแนนสะสม, ชื่อ-รหัส, ลิงก์ "เปลี่ยนรหัสคลาส")
                  (3) ประกาศล่าสุดจากครูผู้สอน (Classroom Stream)
                  (4) การ์ดรายวิชา (ปกหนังสือ, ชื่อวิชา, คำอธิบายพับ/ขยาย, ผลการเรียนรู้, ปุ่มหลักสีเต็ม 1 ปุ่ม)
                  (5) ตารางอันดับ XP Top 5
                 ================================================================ */}
              {activeTab === 'home' && (
                <div className="space-y-6">
                  {/* (1) แบนเนอร์ประชาสัมพันธ์ */}
                  <BannerCarousel banners={data.prBanners} />

                  {/* (2) การ์ดต้อนรับ */}
                  <section className="tus-card p-5 sm:p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-heading font-bold px-3 py-1 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                            ห้อง {classLabel}
                          </span>
                          <span className="font-mono font-bold px-3 py-1 rounded-xl bg-[var(--bg-surface-muted)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                            รหัสคลาส: {classCodeLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => setChangeClassOpen(true)}
                            className="text-sm text-[var(--color-primary)] hover:underline font-heading font-semibold cursor-pointer px-1"
                          >
                            เปลี่ยนรหัสคลาส
                          </button>
                        </div>
                        <h1 className="font-heading font-bold text-xl sm:text-2xl text-[var(--text-primary)] pt-1">
                          สวัสดี, {fullName}
                        </h1>
                        <p className="text-sm text-[var(--text-secondary)]">
                          รหัสนักเรียน: <span className="font-mono font-semibold">{data.student.studentId}</span> • เลขที่ {data.student.number}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 shrink-0">
                        <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-center">
                          <div className="text-xs text-[var(--text-secondary)]">คะแนนสะสม</div>
                          <div className="font-heading font-extrabold text-lg text-[var(--color-primary)]">
                            {data.gradeSummary.totalScore}/{data.gradeSummary.totalMax}
                          </div>
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-center">
                          <div className="text-xs text-[var(--text-secondary)]">เกรด</div>
                          <div className="font-heading font-extrabold text-lg text-[var(--text-primary)]">
                            {data.gradeSummary.grade}
                          </div>
                        </div>
                        <div className="px-3 sm:px-4 py-3 rounded-2xl bg-[var(--color-gold-bg)] border border-[var(--color-gold-border)] text-center">
                          <div className="text-[11px] sm:text-xs text-[var(--color-gold)] font-semibold">XP รวม</div>
                          <div className="font-heading font-extrabold text-lg text-[var(--color-gold)]">
                            {data.student.gameXp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ทางลัดปุ่มใหญ่สำหรับมือถือ (กดง่ายด้วยนิ้วโป้ง เข้าถึงทุกเมนูหลักใน 1 แตะ) */}
                  <section className="md:hidden grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'lessons' as const, title: 'บทเรียน & 3D', desc: 'สไลด์และสื่อโต้ตอบ', icon: BookOpen },
                      { id: 'circuit' as const, title: 'ต่อวงจร TechTale', desc: 'ต่อสาย + รับ XP รวม', icon: Cpu },
                      { id: 'game' as const, title: 'Blocky Blast 8×8', desc: 'เล่นเกมเก็บ XP', icon: Gamepad2 },
                      { id: 'line' as const, title: 'ส่งงาน LINE', desc: 'แนบภาพส่งครู', icon: Send }
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="tus-card p-3.5 text-left flex items-center gap-3 active:scale-[0.98] transition cursor-pointer border-2 border-[var(--border-subtle)] hover:border-[var(--color-primary)]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-heading font-bold text-sm text-[var(--text-primary)] leading-tight truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] truncate">{item.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </section>

                  {/* (3) ประกาศล่าสุดจากครูผู้สอน (Classroom Stream) */}
                  <section className="space-y-4">
                    <h2 className="font-heading font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[var(--color-primary)]" />
                      ประกาศล่าสุดจากครูผู้สอน (Classroom Stream)
                    </h2>

                    {data.announcements.length === 0 ? (
                      <div className="tus-card p-6 text-center text-[var(--text-secondary)]">
                        ยังไม่มีประกาศจากครูผู้สอนในขณะนี้
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {data.announcements.map(post => (
                          <article key={post.id} className="tus-card p-5 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                  {post.pinned && (
                                    <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-heading font-bold">
                                      ปักหมุด
                                    </span>
                                  )}
                                  <span className="font-semibold text-[var(--text-secondary)]">{post.author}</span>
                                </div>
                                <h3 className="font-heading font-bold text-base sm:text-lg text-[var(--text-primary)] mt-1">
                                  {post.title}
                                </h3>
                              </div>
                              <span className="text-xs text-[var(--text-muted)]">{post.createdAt}</span>
                            </div>

                            <p className="text-base text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                              {post.content}
                            </p>

                            {post.attachments && post.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {post.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary-3d btn-compact-3d"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    {att.label}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Comments */}
                            <div className="border-t border-[var(--border-subtle)] pt-3 space-y-2.5">
                              {(post.comments || []).map(cm => (
                                <div key={cm.id} className="bg-[var(--bg-surface-muted)] rounded-xl px-3.5 py-2.5 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-heading font-bold text-[var(--color-primary)]">
                                      {cm.author}
                                    </span>
                                    <span className="text-xs text-[var(--text-muted)]">{cm.time}</span>
                                  </div>
                                  <p className="text-[var(--text-primary)] mt-0.5">{cm.text}</p>
                                </div>
                              ))}
                              <form
                                onSubmit={e => {
                                  e.preventDefault();
                                  void handleAddComment(post.id);
                                }}
                                className="flex gap-2"
                              >
                                <input
                                  type="text"
                                  value={commentTexts[post.id] || ''}
                                  onChange={e =>
                                    setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))
                                  }
                                  placeholder="แสดงความคิดเห็นในชั้นเรียน..."
                                  className="tus-input !min-h-[44px]"
                                />
                                <button type="submit" className="btn-secondary-3d btn-compact-3d shrink-0">
                                  ส่ง
                                </button>
                              </form>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* (4) การ์ดรายวิชา: ปกหนังสือ, ชื่อวิชา, คำอธิบายพับ/ขยาย, ผลการเรียนรู้, ปุ่มหลัก 1 ปุ่ม */}
                  <section className="tus-card p-5 sm:p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      <img
                        src={data.courseOverview.bookCoverUrl || '/assets/site_m4_main_1.jpg'}
                        alt={data.courseOverview.bookTitle}
                        className="w-28 sm:w-36 rounded-2xl border border-[var(--border-subtle)] shadow-sm shrink-0 object-cover"
                      />
                      <div className="flex-1 space-y-3 min-w-0">
                        <div>
                          <span className="text-xs font-heading font-bold px-2.5 py-1 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                            {data.courseOverview.courseCode} • {data.courseOverview.semester}
                          </span>
                          <h2 className="font-heading font-bold text-xl text-[var(--text-primary)] mt-2">
                            {data.courseOverview.courseNameTh} ({data.courseOverview.courseNameEn})
                          </h2>
                          <p className="text-sm text-[var(--text-secondary)]">
                            {data.courseOverview.bookTitle} • {data.courseOverview.totalHours}
                          </p>
                        </div>

                        <div>
                          <p className={`text-base text-[var(--text-primary)] leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
                            {data.courseOverview.fullDescription}
                          </p>
                          <button
                            type="button"
                            onClick={() => setDescExpanded(v => !v)}
                            className="mt-1.5 text-sm font-heading font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            {descExpanded ? (
                              <>
                                ย่อคำอธิบาย <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                อ่านเพิ่มเติม <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="font-heading font-bold text-sm text-[var(--text-primary)]">
                            ผลการเรียนรู้ที่คาดหวัง
                          </h3>
                          <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                            {data.courseOverview.objectives.map((obj, idx) => (
                              <li key={idx} className="bg-[var(--bg-surface-muted)] px-3.5 py-2 rounded-xl">
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* ปุ่มหลักสีเต็ม 1 ปุ่มเดียวในหน้าแรก */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('lessons')}
                            className="btn-primary-3d w-full sm:w-auto"
                          >
                            <BookOpen className="w-5 h-5" />
                            เปิดอ่านหนังสือเรียนและสไลด์
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* (5) ตารางอันดับ XP Top 5 */}
                  <Top5Leaderboard
                    items={data.leaderboard}
                    onPlayClick={() => setActiveTab('game')}
                  />
                </div>
              )}

              {/* TAB 2: บทเรียนและสไลด์ (จัดกลุ่มตามหัวข้อใหญ่ หน่วยการเรียนรู้ -> บทเรียน -> สไลด์ PDF ย่อย) */}
              {activeTab === 'lessons' && (
                <div className="space-y-5">
                  {data.lessons.length === 0 ? (
                    <div className="tus-card p-10 text-center space-y-2">
                      <h2 className="font-heading font-bold text-lg">ยังไม่มีบทเรียนที่เปิดเผยแพร่ในขณะนี้</h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        ครูผู้สอนกำลังเตรียมหรือตั้งเวลาเปิดเนื้อหาบทเรียน
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* ปุ่มเลือกบทเรียนครบทั้ง 6 บท */}
                      <div className="tus-card p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-heading font-bold text-sm sm:text-base text-[var(--color-primary)]">
                            เลือกบทเรียน ({data.lessons.length} บท • {data.lessons.reduce((s, l) => s + (l.slides?.length || 0), 0)} ไฟล์สไลด์)
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {data.lessons.map(lesson => {
                            const active = currentLesson?.id === lesson.id;
                            return (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() => {
                                  setSelectedLessonId(lesson.id);
                                  setSelectedSlideIdx(0);
                                  setDeckIdx(0);
                                }}
                                className={`px-4 py-3 rounded-2xl text-sm font-heading font-bold border-2 cursor-pointer transition text-left flex flex-col gap-1 ${
                                  active
                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                                }`}
                              >
                                <span className="leading-snug">{lesson.chapter}</span>
                                <span className={`text-xs font-medium ${active ? 'text-white/85' : 'text-[var(--text-muted)]'}`}>
                                  {lesson.hours} • {lesson.slides?.length || 0} ไฟล์สไลด์ PDF
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {currentLesson && (
                        <div className="tus-card p-5 sm:p-6 space-y-6">
                          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                            <div className="space-y-1">
                              <span className="text-xs font-heading font-bold text-[var(--color-primary)]">
                                {currentLesson.unit} • {currentLesson.hours}
                              </span>
                              <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                                {currentLesson.chapter}
                              </h2>
                              <p className="text-base text-[var(--text-secondary)]">{currentLesson.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setAiPromptTrigger({
                                  text: `ช่วยสรุปเนื้อหาสำคัญและยกตัวอย่างใกล้ตัวของ "${currentLesson.chapter}" ให้เข้าใจง่ายหน่อยครับ`,
                                  lessonTitle: currentLesson.chapter,
                                  nonce: Date.now()
                                })
                              }
                              className={
                                CHAPTER_LAB_CONFIGS[currentLesson.id] && lessonViewMode === 'lab'
                                  ? 'btn-secondary-3d'
                                  : 'btn-primary-3d'
                              }
                            >
                              <Sparkles className="w-5 h-5" /> ให้ AI ช่วยอธิบายบทนี้
                            </button>
                          </div>

                          {/* ปุ่มสลับโหมด: สื่อ 3 มิติ & ห้องทดลอง Interactive vs สไลด์เนื้อหา PDF */}
                          {CHAPTER_LAB_CONFIGS[currentLesson.id] && (
                            <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)]">
                              <button
                                type="button"
                                onClick={() => setLessonViewMode('lab')}
                                className={`flex-1 min-h-[46px] px-4 py-2 rounded-xl text-sm font-heading font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition ${
                                  lessonViewMode === 'lab'
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                                }`}
                              >
                                <Box className="w-4 h-4" />
                                สื่อ 3 มิติ & ห้องทดลอง (Interactive Lab)
                              </button>
                              <button
                                type="button"
                                onClick={() => setLessonViewMode('slides')}
                                className={`flex-1 min-h-[46px] px-4 py-2 rounded-xl text-sm font-heading font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition ${
                                  lessonViewMode === 'slides'
                                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                                สไลด์เนื้อหา PDF ({currentLesson.slides?.length || 0} ไฟล์)
                              </button>
                            </div>
                          )}

                          {/* โหมดสื่อ 3 มิติ & กิจกรรม สสวท. */}
                          {CHAPTER_LAB_CONFIGS[currentLesson.id] && lessonViewMode === 'lab' ? (
                            <InteractiveChapterHub
                              lessonId={currentLesson.id}
                              customModelUrl={currentLesson.modelUrl}
                              customPosterUrl={currentLesson.posterUrl}
                            />
                          ) : (
                            <>
                              {/* ไฟล์สไลด์ PDF ประจำบท (สลับหัวข้อย่อยได้ เช่น 1.1-1.2 / 1.3-1.4) */}
                              {currentLesson.slides && currentLesson.slides.length > 0 && (() => {
                                const activeSlide =
                                  currentLesson.slides[selectedSlideIdx % currentLesson.slides.length];
                                return (
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div className="flex flex-wrap gap-2">
                                        {currentLesson.slides.map((sl, sIdx) => {
                                          const isSel = sIdx === selectedSlideIdx % currentLesson.slides.length;
                                          return (
                                            <button
                                              key={sl.id}
                                              type="button"
                                              onClick={() => setSelectedSlideIdx(sIdx)}
                                              className={`px-3.5 py-2 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer transition ${
                                                isSel
                                                  ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                                                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                              }`}
                                            >
                                              {sl.title}
                                            </button>
                                          );
                                        })}
                                      </div>

                                      <a
                                        href={activeSlide.externalUrl || activeSlide.embedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary-3d btn-compact-3d"
                                      >
                                        เปิดเต็มจอ / ดาวน์โหลด PDF <ExternalLink className="w-4 h-4" />
                                      </a>
                                    </div>

                                    <div className="rounded-2xl overflow-hidden border-2 border-[var(--border-subtle)] bg-white">
                                      <iframe
                                        key={activeSlide.id}
                                        src={`${activeSlide.embedUrl}#view=FitH`}
                                        title={activeSlide.title}
                                        className="w-full h-[540px] sm:h-[640px]"
                                        allowFullScreen
                                      />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* สไลด์สรุปย่อสำหรับอ่านเร็วบนมือถือ */}
                              {currentLesson.deckPages?.length > 0 && (
                                <div className="rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-strong)] p-5 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-heading font-bold px-3 py-1 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                      สรุปประเด็นสำคัญ • {currentLesson.deckPages[deckIdx % currentLesson.deckPages.length].badge}
                                    </span>
                                    {currentLesson.deckPages.length > 1 && (
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeckIdx(
                                              i =>
                                                (i - 1 + currentLesson.deckPages.length) %
                                                currentLesson.deckPages.length
                                            )
                                          }
                                          className="btn-secondary-3d btn-compact-3d !px-3"
                                          aria-label="สรุปก่อนหน้า"
                                        >
                                          <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDeckIdx(i => (i + 1) % currentLesson.deckPages.length)
                                          }
                                          className="btn-secondary-3d btn-compact-3d !px-3"
                                          aria-label="สรุปถัดไป"
                                        >
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                                    {currentLesson.deckPages[deckIdx % currentLesson.deckPages.length].title}
                                  </h3>
                                  <ul className="space-y-2 text-base text-[var(--text-primary)]">
                                    {currentLesson.deckPages[deckIdx % currentLesson.deckPages.length].bullets.map(
                                      (b, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                          <span className="text-[var(--color-primary)] font-bold">•</span>
                                          <span>{b}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                  {currentLesson.deckPages[deckIdx % currentLesson.deckPages.length].codeSample && (
                                    <pre className="p-4 rounded-xl bg-neutral-900 text-pink-100 text-sm overflow-x-auto font-mono">
                                      {currentLesson.deckPages[deckIdx % currentLesson.deckPages.length].codeSample}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: บททดสอบ (รองรับทั้ง Google Forms สอบหลังเรียน และแบบทดสอบในระบบ) */}
              {activeTab === 'quizzes' && (
                <div className="space-y-5">
                  {quizAssignments.length === 0 ? (
                    <div className="tus-card p-10 text-center space-y-2">
                      <h2 className="font-heading font-bold text-lg">ยังไม่มีบททดสอบออนไลน์</h2>
                      <p className="text-sm text-[var(--text-secondary)]">
                        เมื่อครูเพิ่มลิงก์ Google Forms หรือชุดแบบทดสอบ รายการจะปรากฏที่หน้านี้ทันที
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {quizAssignments.map(asg => {
                          const sub = data.submissions[asg.id];
                          const active = activeQuizAsg?.id === asg.id;
                          const isGoogleForm = Boolean(asg.formExternalUrl || asg.formEmbedUrl);
                          return (
                            <button
                              key={asg.id}
                              type="button"
                              onClick={() => {
                                setSelectedQuizId(asg.id);
                                setQuizAnswers({});
                                setQuizResult(null);
                              }}
                              className={`px-4 py-2.5 rounded-xl text-sm font-heading font-bold border-2 cursor-pointer transition inline-flex items-center gap-2 text-left ${
                                active
                                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--color-primary)]'
                              }`}
                            >
                              <span>
                                {asg.code}: {asg.title}
                              </span>
                              {isGoogleForm && (
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-lg ${
                                    active
                                      ? 'bg-white/20 text-white'
                                      : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                                  }`}
                                >
                                  Google Form
                                </span>
                              )}
                              {typeof sub?.score === 'number' && (
                                <span className="text-xs opacity-90">
                                  ({sub.score}/{asg.maxScore})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {activeQuizAsg && (() => {
                        const hasGoogleForm = Boolean(activeQuizAsg.formExternalUrl || activeQuizAsg.formEmbedUrl);
                        const formOpenUrl = activeQuizAsg.formExternalUrl || activeQuizAsg.formEmbedUrl || '';
                        const canEmbedForm = Boolean(
                          activeQuizAsg.formEmbedUrl && activeQuizAsg.formEmbedUrl.includes('embedded=true')
                        );
                        return (
                          <div className="tus-card p-5 sm:p-6 space-y-5">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-mono font-bold px-2.5 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                    {activeQuizAsg.code}
                                  </span>
                                  {hasGoogleForm && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 font-heading font-bold">
                                      <Link2 className="w-3.5 h-3.5" /> แบบทดสอบ Google Forms
                                    </span>
                                  )}
                                  {activeQuizAsg.dueDate && (
                                    <span className="text-[var(--text-muted)]">กำหนด: {activeQuizAsg.dueDate}</span>
                                  )}
                                </div>
                                <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                                  {activeQuizAsg.title}
                                </h2>
                                {activeQuizAsg.description && (
                                  <p className="text-sm text-[var(--text-secondary)]">
                                    {activeQuizAsg.description}
                                  </p>
                                )}
                              </div>
                              <span className="px-3.5 py-1.5 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-heading font-bold text-sm shrink-0">
                                คะแนนเต็ม {activeQuizAsg.maxScore} คะแนน
                              </span>
                            </div>

                            {/* Google Form Exam Mode */}
                            {hasGoogleForm && (
                              <div className="space-y-4">
                                <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1 text-sm">
                                    <div className="font-heading font-bold text-[var(--text-primary)]">
                                      ทำแบบทดสอบผ่าน Google Forms
                                    </div>
                                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                                      กรอกรหัสนักเรียน (<strong>{data.student.studentId}</strong>) และชื่อ-สกุลให้ถูกต้อง หากใช้ iPhone/iPad แนะนำกดปุ่มเปิดเต็มจอเพื่อความลื่นไหลครับ
                                    </p>
                                  </div>
                                  <a
                                    href={formOpenUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary-3d shrink-0 w-full sm:w-auto"
                                  >
                                    <ExternalLink className="w-5 h-5" />
                                    เปิดทำข้อสอบ Google Forms
                                  </a>
                                </div>

                                {canEmbedForm && (
                                  <div className="rounded-2xl overflow-hidden border-2 border-[var(--border-subtle)] bg-white">
                                    <iframe
                                      key={activeQuizAsg.id}
                                      src={activeQuizAsg.formEmbedUrl}
                                      title={activeQuizAsg.title}
                                      className="w-full h-[65dvh] min-h-[500px] max-h-[820px]"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Built-in Auto-Graded Quiz Mode */}
                            {quizResult && (
                              <div className="p-4 rounded-2xl bg-[var(--color-success-bg)] border-2 border-[var(--color-success-border)] text-[var(--color-success)]">
                                <div className="font-heading font-bold text-lg">
                                  ส่งคำตอบสำเร็จ! ได้คะแนน {quizResult.score} / {quizResult.maxScore}
                                </div>
                                <p className="text-sm">
                                  ตอบถูกต้อง {quizResult.correctCount} จาก {quizResult.totalQuestions} ข้อ (บันทึกคะแนนลงระบบแล้ว)
                                </p>
                              </div>
                            )}

                            {activeQuizQuestions.length > 0 ? (
                              <div className="space-y-4">
                                {activeQuizQuestions.map((item, qIdx) => (
                                  <div
                                    key={qIdx}
                                    className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-3"
                                  >
                                    <div className="font-heading font-bold text-base text-[var(--text-primary)]">
                                      {item.q}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {item.options.map((opt, optIdx) => {
                                        const selected = quizAnswers[qIdx] === optIdx;
                                        return (
                                          <button
                                            key={optIdx}
                                            type="button"
                                            onClick={() =>
                                              setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
                                            }
                                            className={`text-left px-4 py-3 rounded-xl border-2 text-sm transition cursor-pointer ${
                                              selected
                                                ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)] font-bold'
                                                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  disabled={submittingQuiz}
                                  onClick={handleSubmitQuiz}
                                  className="w-full btn-primary-3d"
                                >
                                  <ClipboardCheck className="w-5 h-5" />
                                  {submittingQuiz ? 'กำลังตรวจคำตอบ...' : 'ส่งคำตอบและตรวจคะแนนทันที'}
                                </button>
                              </div>
                            ) : !hasGoogleForm ? (
                              <div className="p-8 text-center text-[var(--text-secondary)]">
                                ยังไม่มีข้อสอบหรือลิงก์ Google Forms ในชุดนี้
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: ส่งงาน LINE */}
              {activeTab === 'line' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 space-y-3">
                    <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                      เลือกใบงานที่ต้องการยืนยันการส่งใน LINE
                    </h2>
                    {lineAssignments.length === 0 ? (
                      <div className="tus-card p-6 text-center text-[var(--text-secondary)]">
                        ยังไม่มีใบงานที่ต้องส่งผ่าน LINE
                      </div>
                    ) : (
                      lineAssignments.map(asg => {
                        const sub = data.submissions[asg.id];
                        const active = activeLineAsg?.id === asg.id;
                        return (
                          <button
                            key={asg.id}
                            type="button"
                            onClick={() => setSelectedLineAsgId(asg.id)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer space-y-1.5 ${
                              active
                                ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]'
                                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-[var(--color-primary)]">
                                {asg.code} • เต็ม {asg.maxScore} คะแนน
                              </span>
                              {sub?.status === 'graded' ? (
                                <span className="text-xs font-bold text-[var(--color-success)] inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> ตรวจแล้ว ({sub.score}/{asg.maxScore})
                                </span>
                              ) : sub?.status === 'pending_review' ? (
                                <span className="text-xs font-bold text-[var(--color-gold)] inline-flex items-center gap-1">
                                  <Clock className="w-4 h-4" /> รอครูตรวจ
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)]">ยังไม่ส่ง</span>
                              )}
                            </div>
                            <div className="font-heading font-bold text-base text-[var(--text-primary)]">
                              {asg.title}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {activeLineAsg && (
                    <div className="lg:col-span-7 tus-card p-5 sm:p-6 space-y-5">
                      <div>
                        <h3 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                          {activeLineAsg.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                          {activeLineAsg.instruction || activeLineAsg.description}
                        </p>
                      </div>

                      {data.submissions[activeLineAsg.id] && (
                        <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-1.5 text-sm">
                          <div className="font-heading font-bold text-[var(--color-primary)]">สถานะล่าสุด</div>
                          <div>ชื่อ LINE: <strong>{data.submissions[activeLineAsg.id].lineName}</strong></div>
                          <div>ส่งเมื่อ: {data.submissions[activeLineAsg.id].submittedAt}</div>
                          {data.submissions[activeLineAsg.id].teacherComment && (
                            <div className="p-3 rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success)] font-medium mt-1">
                              ความเห็นจากครู: {data.submissions[activeLineAsg.id].teacherComment}
                            </div>
                          )}
                        </div>
                      )}

                      <form onSubmit={handleSubmitLine} className="space-y-4">
                        <div>
                          <label htmlFor="line-name" className="block text-sm font-heading font-semibold mb-1.5">
                            ชื่อบัญชี LINE ที่ใช้ส่งงาน *
                          </label>
                          <input
                            id="line-name"
                            type="text"
                            required
                            value={lineName}
                            onChange={e => setLineName(e.target.value)}
                            placeholder="เช่น Kittipong_TUS"
                            className="tus-input"
                          />
                        </div>
                        <div>
                          <label htmlFor="line-note" className="block text-sm font-heading font-semibold mb-1.5">
                            หมายเหตุถึงครู (ถ้ามี)
                          </label>
                          <textarea
                            id="line-note"
                            rows={2}
                            value={lineNote}
                            onChange={e => setLineNote(e.target.value)}
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                            className="tus-input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-heading font-semibold mb-1.5">
                            ภาพแคปหน้าจอหลักฐานจาก LINE * (รองรับ JPG, PNG, WebP)
                          </label>
                          <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)] hover:border-[var(--color-primary)] cursor-pointer transition">
                            <Upload className="w-7 h-7 text-[var(--color-primary)] mb-1.5" />
                            <span className="font-heading font-bold text-sm text-[var(--color-primary)]">
                              คลิกเลือกรูปภาพหลักฐาน (ย่อขนาดอัตโนมัติ)
                            </span>
                            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                          </label>
                          {proofImage && (
                            <img
                              src={proofImage}
                              alt="ตัวอย่างภาพหลักฐาน"
                              className="mt-3 max-h-64 rounded-2xl border border-[var(--border-subtle)] mx-auto object-contain"
                            />
                          )}
                        </div>

                        <button type="submit" disabled={submittingLine} className="w-full btn-primary-3d">
                          <Send className="w-5 h-5" />
                          {submittingLine ? 'กำลังส่งหลักฐาน...' : 'ยืนยันการส่งงาน LINE'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: คะแนนของฉัน (ดึงคะแนนอัตโนมัติจาก Google Sheets ใน Google Drive + คะแนนในระบบ) */}
              {activeTab === 'grades' && (
                <div className="space-y-5">
                  {/* การ์ดคะแนนจาก Google Drive (Google Sheets) ดึงให้อัตโนมัติเฉพาะนักเรียนคนนี้ */}
                  {sheetScores.loading ? (
                    <div className="tus-card p-5 space-y-3">
                      <div className="h-6 w-64 skeleton" />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="h-20 skeleton" />
                        <div className="h-20 skeleton" />
                        <div className="h-20 skeleton" />
                        <div className="h-20 skeleton" />
                      </div>
                    </div>
                  ) : sheetScores.connected ? (
                    <section className="tus-card p-5 sm:p-6 space-y-4 border-2 border-[var(--color-success-border)]">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)] flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <div>
                            <h2 className="font-heading font-bold text-lg sm:text-xl text-[var(--text-primary)]">
                              คะแนนสรุปจาก Google Drive ({sheetScores.sheetScope || 'รายวิชา'})
                            </h2>
                            <p className="text-xs sm:text-sm text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5 mt-0.5">
                              <ShieldCheck className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                              <span>ดึงข้อมูลอัตโนมัติเฉพาะคะแนนของ {fullName} ({data.student.studentId})</span>
                              {sheetScores.fetchedAt && <span>• อัปเดตเมื่อ {sheetScores.fetchedAt} น.</span>}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void loadSheetScores()}
                          disabled={sheetScores.loading}
                          className="btn-secondary-3d btn-compact-3d"
                        >
                          <RefreshCw className={`w-4 h-4 ${sheetScores.loading ? 'animate-spin' : ''}`} />
                          รีเฟรชคะแนนจาก Drive
                        </button>
                      </div>

                      {sheetScores.errorMessage ? (
                        <div className="p-4 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)] text-sm">
                          {sheetScores.errorMessage}
                        </div>
                      ) : sheetScores.found && sheetScores.columns.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {sheetScores.columns.map((col, idx) => {
                            const hLower = col.header.toLowerCase();
                            const isHighlight =
                              hLower.includes('รวม') ||
                              hLower.includes('total') ||
                              hLower.includes('เกรด') ||
                              hLower.includes('grade') ||
                              hLower.includes('ผล');
                            return (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-2xl border ${
                                  isHighlight
                                    ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary-border)]'
                                    : 'bg-[var(--bg-surface-muted)] border-[var(--border-subtle)]'
                                }`}
                              >
                                <div className="text-xs font-heading font-semibold text-[var(--text-secondary)] break-words">
                                  {col.header}
                                </div>
                                <div
                                  className={`font-heading font-extrabold text-base sm:text-lg mt-1 break-words ${
                                    isHighlight ? 'text-[var(--color-primary)]' : 'text-[var(--text-primary)]'
                                  }`}
                                >
                                  {col.value}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">
                          ยังไม่พบแถวคะแนนของรหัส <strong className="font-mono">{data.student.studentId}</strong> หรือชื่อ{' '}
                          <strong>{fullName}</strong> ในชีทสรุปคะแนนของครู — หากเพิ่งส่งงานหรือเพิ่งสมัครเข้าห้องเรียน กรุณาแจ้งครูผู้สอนตรวจสอบรายชื่อในชีทครับ
                        </div>
                      )}
                    </section>
                  ) : null}

                  <div className="tus-card p-5 sm:p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                      <div>
                        <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                          คะแนนของฉันในระบบ (เห็นเฉพาะข้อมูลส่วนตัว)
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {fullName} • ห้อง {classLabel}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="px-4 py-2 rounded-2xl bg-[var(--color-primary-soft)] text-center">
                          <div className="text-xs text-[var(--color-primary)]">คะแนนรวม</div>
                          <div className="font-heading font-extrabold text-lg text-[var(--color-primary)]">
                            {data.gradeSummary.totalScore}/{data.gradeSummary.totalMax} ({data.gradeSummary.percent}%)
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-center">
                          <div className="text-xs text-[var(--text-secondary)]">เกรด</div>
                          <div className="font-heading font-extrabold text-lg text-[var(--text-primary)]">
                            {data.gradeSummary.grade}
                          </div>
                        </div>
                      </div>
                    </div>

                    {data.assignments.length === 0 ? (
                      <div className="p-8 text-center text-[var(--text-secondary)]">ยังไม่มีรายการคะแนน</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                              <th className="py-3 px-3">รหัส</th>
                              <th className="py-3 px-3">รายการงาน / แบบทดสอบ</th>
                              <th className="py-3 px-3">สถานะ</th>
                              <th className="py-3 px-3 text-right">คะแนน</th>
                              <th className="py-3 px-3">ความเห็นครู</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-subtle)]">
                            {data.assignments.map(asg => {
                              const sub = data.submissions[asg.id];
                              return (
                                <tr key={asg.id}>
                                  <td className="py-3 px-3 font-mono font-bold text-[var(--color-primary)] whitespace-nowrap">
                                    {asg.code}
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">{asg.title}</td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    {sub?.status === 'graded' ? (
                                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] text-xs font-heading font-bold">
                                        ตรวจแล้ว
                                      </span>
                                    ) : sub?.status === 'pending_review' ? (
                                      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-gold-bg)] text-[var(--color-gold)] text-xs font-heading font-bold">
                                        รอครูตรวจ
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-muted)] text-[var(--text-muted)] text-xs">
                                        ยังไม่ส่ง
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-right font-heading font-bold text-[var(--text-primary)] whitespace-nowrap">
                                    {typeof sub?.score === 'number' ? sub.score : '-'} / {asg.maxScore}
                                  </td>
                                  <td className="py-3 px-3 text-[var(--text-secondary)]">
                                    {sub?.teacherComment || '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: จำลองต่อวงจร & เขียนโค้ด (TechTale Circuit Lab) */}
              {activeTab === 'circuit' && (
                <div className="space-y-6">
                  <TechTaleCircuitLab
                    studentId={data.student.studentId}
                    studentName={fullName}
                    currentXp={data.student.gameXp}
                    dailyXpUsed={data.quotas.dailyXpUsed}
                    dailyXpCap={data.quotas.dailyXpCap}
                    onSyncSchoolXp={handleSyncCircuitXp}
                  />
                  <Top5Leaderboard items={data.leaderboard} />
                </div>
              )}

              {/* TAB 6: เกมเก็บ XP (BLOCK MASTER PUZZLE 10x10) */}
              {activeTab === 'game' && (
                <div className="space-y-6">
                  <BlockBlastGame
                    currentXp={data.student.gameXp}
                    bestScore={data.student.gameBestScore}
                    dailyXpUsed={data.quotas.dailyXpUsed}
                    dailyXpCap={data.quotas.dailyXpCap}
                    dailyChallengeDone={data.quotas.dailyChallengeDone}
                    badges={data.student.badges || []}
                    onSaveGame={handleSaveGame}
                    onRefreshDashboard={loadDashboard}
                    onGoHome={() => setActiveTab('home')}
                  />
                  <Top5Leaderboard items={data.leaderboard} />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ปุ่มรูปลอยติดต่อครูเนย์ / ครูขวัญ */}
      <FloatingContactTeacher
        studentId={data.student.studentId}
        studentName={fullName}
        classNameLabel={classLabel}
      />

      {/* ผู้ช่วย AI ปุ่มกลมมุมล่างขวา เห็นได้ทุกหน้า */}
      <FloatingAiTutor
        externalPrompt={aiPromptTrigger}
        initialRemaining={data.quotas.dailyAiRemaining}
        dailyLimit={data.quotas.dailyAiLimit}
      />
    </div>
  );
}
