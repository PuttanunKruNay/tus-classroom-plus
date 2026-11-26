'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home,
  Calendar,
  BookOpen,
  CheckSquare,
  Trophy,
  Archive,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Maximize2,
  RefreshCw,
  Lock,
  Unlock,
  Copy,
  Pin,
  Trash2,
  Sparkles,
  Download,
  KeyRound,
  Upload,
  Bold,
  Italic,
  List,
  Link2,
  Youtube,
  Paperclip,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  FolderKanban,
  MessageSquare,
  RotateCcw,
  Send,
  FileEdit,
  CheckCircle2,
  Pencil,
  ClipboardCheck,
  MessageSquareWarning
} from 'lucide-react';
import { PortalHeader } from '@/components/PortalHeader';
import { TeacherLineGrading } from '@/components/TeacherLineGrading';
import { TeacherClassworkManager } from '@/components/TeacherClassworkManager';
import { TeacherFormsManager } from '@/components/TeacherFormsManager';
import { TeacherGradeSheetCard } from '@/components/TeacherGradeSheetCard';
import { TeacherXpManager } from '@/components/TeacherXpManager';
import { TeacherIssueReports } from '@/components/TeacherIssueReports';
import { useToast } from '@/components/ToastProvider';
import { calculateGrade, copyTextSafe, generateClassCode } from '@/lib/utils';
import type {
  Assignment,
  ClassRoom,
  CourseOverview,
  Lesson,
  PublicStudent,
  PublishStatus,
  QuizBankDoc,
  SessionUser,
  StreamAttachment,
  StreamPost,
  SubmissionRecord,
  TeacherMessage,
  Topic
} from '@/types/database';

interface TeacherOverviewData {
  user: SessionUser;
  dbMode: 'firestore' | 'local-dev';
  courseOverview: CourseOverview;
  defaultGradeSheetUrl?: string;
  defaultGradeSheetUpdatedAt?: string;
  classes: ClassRoom[];
  students: PublicStudent[];
  topics: Topic[];
  lessons: Lesson[];
  assignments: Assignment[];
  quizzes: QuizBankDoc[];
  submissions: SubmissionRecord[];
  announcements: StreamPost[];
  teacherMessages?: TeacherMessage[];
  research: {
    avgPre: number;
    avgPost: number;
    avgDiff: number;
    sampleCount: number;
  };
}

type SidebarView = 'home' | 'calendar' | 'course' | 'line' | 'issues' | 'xp' | 'archived' | 'settings';
type CourseTab = 'stream' | 'classwork' | 'forms' | 'people' | 'grades' | 'line' | 'issues' | 'xp';
type CreateModalType = 'class' | 'line' | 'form' | 'question' | 'lesson' | 'topic' | 'reuse' | 'ai' | null;

export default function TeacherPortalPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<TeacherOverviewData | null>(null);

  // Navigation state
  const [sidebarView, setSidebarView] = useState<SidebarView>('course');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [courseTab, setCourseTab] = useState<CourseTab>('stream');
  const [teachingOpen, setTeachingOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // "+ สร้าง" Menu & Modal
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createModal, setCreateModal] = useState<CreateModalType>(null);

  // Fullscreen Class Code Modal
  const [fullscreenClass, setFullscreenClass] = useState<ClassRoom | null>(null);

  // Rich Announcement Composer
  const [postEditId, setPostEditId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postClassId, setPostClassId] = useState('');
  const [postTargetGroup, setPostTargetGroup] = useState('นักเรียนทุกคน');
  const [postPinned, setPostPinned] = useState(false);
  const [postScheduledAt, setPostScheduledAt] = useState('');
  const [postAttachments, setPostAttachments] = useState<StreamAttachment[]>([]);
  const [attType, setAttType] = useState<'link' | 'youtube' | 'file'>('link');
  const [attLabel, setAttLabel] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [streamFilter, setStreamFilter] = useState<'all' | PublishStatus>('all');
  const [postScheduleTarget, setPostScheduleTarget] = useState<{ id: string; title: string; at: string } | null>(null);

  // Create Modal Fields
  const [itemCode, setItemCode] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemUnit, setItemUnit] = useState('บทที่ 1 : ระบบทางเทคโนโลยีที่ซับซ้อน (2 ชั่วโมง)');
  const [itemMaxScore, setItemMaxScore] = useState('10');
  const [itemDueDate, setItemDueDate] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemSlideUrl, setItemSlideUrl] = useState('');
  const [itemFormUrl, setItemFormUrl] = useState('');
  const [itemHours, setItemHours] = useState('2 ชั่วโมง');
  const [itemScheduledAt, setItemScheduledAt] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // People & Class Creation
  const [newGrade, setNewGrade] = useState('ม.4');
  const [newRoom, setNewRoom] = useState('4');
  const [newClassCode, setNewClassCode] = useState(() => generateClassCode());
  const [newStId, setNewStId] = useState('');
  const [newStPrefix, setNewStPrefix] = useState('นาย');
  const [newStFirst, setNewStFirst] = useState('');
  const [newStLast, setNewStLast] = useState('');
  const [newStNum, setNewStNum] = useState('1');
  const [newStClassId, setNewStClassId] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkClassId, setBulkClassId] = useState('');

  // Password Reset Inline Modal (no window.prompt!)
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPassVal, setResetPassVal] = useState('1234');

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch('/api/teacher/overview');
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลระบบครูผู้สอนได้');
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'โหลดข้อมูลไม่สำเร็จ');
      setData(json);

      const activeClasses = (json.classes || []).filter((c: ClassRoom) => !c.archived);
      if (activeClasses.length) {
        setNewStClassId(prev => prev || activeClasses[0].id);
        setBulkClassId(prev => prev || activeClasses[0].id);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeClasses = useMemo(() => (data?.classes || []).filter(c => !c.archived), [data]);
  const archivedClasses = useMemo(() => (data?.classes || []).filter(c => c.archived), [data]);
  const classMap = useMemo(() => new Map((data?.classes || []).map(c => [c.id, c])), [data]);
  const asgMap = useMemo(() => new Map((data?.assignments || []).map(a => [a.id, a])), [data]);

  const pendingLineCount = useMemo(() => {
    if (!data) return 0;
    return data.submissions.filter(
      s => !s.deletedAt && asgMap.get(s.assignmentId)?.category === 'line' && s.status === 'pending_review'
    ).length;
  }, [data, asgMap]);

  const openIssuesCount = useMemo(() => {
    return (data?.teacherMessages || []).filter(m => m.status === 'open').length;
  }, [data]);

  const selectedClassObj = selectedClassId !== 'ALL' ? classMap.get(selectedClassId) || activeClasses[0] : activeClasses[0];

  const subByStudent = useMemo(() => {
    const map = new Map<string, SubmissionRecord>();
    for (const s of data?.submissions || []) {
      if (s.deletedAt) continue;
      const key = `${s.studentId}__${s.assignmentId}`;
      const existing = map.get(key);
      if (!existing || s.status === 'graded' || s.updatedAt >= existing.updatedAt) {
        map.set(key, s);
      }
    }
    return map;
  }, [data]);

  function openClass(classId: string) {
    setSelectedClassId(classId);
    setSidebarView('course');
    setCourseTab('stream');
    setMobileMenuOpen(false);
  }

  function applyFormat(snippet: string) {
    setPostContent(prev => `${prev}${prev && !prev.endsWith('\n') ? ' ' : ''}${snippet}`);
  }

  function handleAddAttachment() {
    if (!attUrl.trim()) {
      showToast('กรุณาวางลิงก์ที่ต้องการแนบ', { kind: 'error' });
      return;
    }
    setPostAttachments(prev => [
      ...prev,
      { type: attType, label: attLabel.trim() || attUrl.trim(), url: attUrl.trim() }
    ]);
    setAttLabel('');
    setAttUrl('');
    showToast('แนบลิงก์เรียบร้อย', { kind: 'info' });
  }

  async function handleSavePost(targetStatus: PublishStatus) {
    if (!postTitle.trim() || !postContent.trim()) {
      showToast('กรุณากรอกหัวข้อและเนื้อหาประกาศให้ครบถ้วน', { kind: 'error' });
      return;
    }
    if (targetStatus === 'scheduled' && !postScheduledAt) {
      showToast('กรุณาเลือกวันและเวลาในช่อง “ตั้งเวลาโพสต์” ก่อนกดตั้งเวลา', { kind: 'error' });
      return;
    }

    const res = await fetch('/api/teacher/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: postEditId || undefined,
        title: postTitle,
        content: postContent,
        classId: postClassId,
        targetGroup: postTargetGroup,
        pinned: postPinned,
        attachments: postAttachments,
        publishStatus: targetStatus,
        scheduledAt: targetStatus === 'scheduled' ? postScheduledAt : undefined
      })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'บันทึกประกาศไม่สำเร็จ', { kind: 'error' });
      return;
    }
    setPostEditId(null);
    setPostTitle('');
    setPostContent('');
    setPostPinned(false);
    setPostAttachments([]);
    setPostScheduledAt('');
    showToast(
      targetStatus === 'draft'
        ? 'บันทึกประกาศเป็นฉบับร่างแล้ว (ยังไม่แสดงให้นักเรียนเห็น)'
        : targetStatus === 'scheduled'
          ? `ตั้งเวลาโพสต์ประกาศเรียบร้อย (${postScheduledAt.replace('T', ' ')})`
          : 'โพสต์ประกาศในฟอรัมให้นักเรียนเห็นทันทีเรียบร้อย',
      { kind: 'success' }
    );
    await loadData();
  }

  async function handlePostStatusAction(
    id: string,
    action: 'toggle_pin' | 'publish' | 'draft' | 'schedule',
    scheduledAt?: string
  ) {
    const res = await fetch('/api/teacher/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, scheduledAt })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'จัดการประกาศไม่สำเร็จ', { kind: 'error' });
      return;
    }
    setPostScheduleTarget(null);
    showToast(
      action === 'publish'
        ? 'โพสต์ประกาศให้นักเรียนเห็นแล้ว'
        : action === 'draft'
          ? 'เก็บประกาศเป็นฉบับร่างแล้ว'
          : action === 'schedule'
            ? `ตั้งเวลาโพสต์เป็น ${(scheduledAt || '').replace('T', ' ')} แล้ว`
            : 'อัปเดตการปักหมุดแล้ว',
      { kind: 'success' }
    );
    await loadData();
  }

  async function handleDeletePost(id: string) {
    await fetch(`/api/teacher/announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    showToast('ลบประกาศเรียบร้อย', { kind: 'info' });
    await loadData();
  }

  async function handleClassAction(id: string, action: 'regenerate_code' | 'toggle_enrollment' | 'toggle_archive') {
    const res = await fetch('/api/teacher/classes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'อัปเดตชั้นเรียนไม่สำเร็จ', { kind: 'error' });
      return;
    }
    if (fullscreenClass && fullscreenClass.id === id) {
      setFullscreenClass(json.classRoom);
    }
    showToast(
      action === 'regenerate_code'
        ? `สุ่มรหัสคลาสใหม่: ${json.classRoom.classCode}`
        : action === 'toggle_enrollment'
          ? json.classRoom.enrollmentOpen
            ? 'เปิดรับสมัครนักเรียนเข้าห้องแล้ว'
            : 'ปิดรับสมัครชั่วคราวแล้ว'
          : json.classRoom.archived
            ? 'ย้ายห้องเรียนไปที่ชั้นเรียนที่เก็บแล้ว'
            : 'กู้คืนชั้นเรียนกลับมาสอนแล้ว',
      { kind: 'success' }
    );
    await loadData();
  }

  async function handleCreateClass(e: React.FormEvent, usePreviewCode = false) {
    e.preventDefault();
    const res = await fetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gradeLevel: newGrade,
        roomNo: newRoom,
        courseCode: data?.courseOverview.courseCode,
        courseName: data?.courseOverview.courseNameTh,
        classCode: usePreviewCode ? newClassCode.trim().toUpperCase() : ''
      })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'สร้างห้องเรียนไม่สำเร็จ', { kind: 'error' });
      return;
    }
    setCreateModal(null);
    setNewClassCode(generateClassCode());
    showToast(`สร้างห้อง ${json.classRoom.name} รหัส ${json.classRoom.classCode} เรียบร้อย`, { kind: 'success' });
    await loadData();
  }

  async function handleSubmitCreateModal(targetStatus: PublishStatus = 'published') {
    if (!createModal) return;
    if (!itemTitle.trim()) {
      showToast('กรุณากรอกชื่อรายการก่อนบันทึก', { kind: 'error' });
      return;
    }
    if (createModal !== 'topic' && targetStatus === 'scheduled' && !itemScheduledAt) {
      showToast('กรุณาเลือกวันและเวลาที่ต้องการตั้งเวลาโพสต์', { kind: 'error' });
      return;
    }

    if (createModal === 'topic') {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'topic', title: itemTitle })
      });
      const json = await res.json();
      if (json.ok) {
        showToast('สร้างหัวข้อใหญ่ใหม่แล้ว', { kind: 'success' });
        setCreateModal(null);
        setItemTitle('');
        await loadData();
      } else {
        showToast(json.message || 'สร้างหัวข้อไม่สำเร็จ', { kind: 'error' });
      }
      return;
    }

    if (createModal === 'lesson') {
      const res = await fetch('/api/teacher/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit: itemUnit,
          chapter: itemTitle,
          hours: itemHours,
          description: itemDesc,
          slideUrl: itemSlideUrl,
          publishStatus: targetStatus,
          scheduledAt: targetStatus === 'scheduled' ? itemScheduledAt : undefined
        })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(
          targetStatus === 'draft'
            ? 'บันทึกบทเรียนเป็นฉบับร่างแล้ว'
            : targetStatus === 'scheduled'
              ? 'ตั้งเวลาโพสต์บทเรียนเรียบร้อย'
              : 'โพสต์บทเรียนและสไลด์ให้นักเรียนเห็นทันทีแล้ว',
          { kind: 'success' }
        );
        setCreateModal(null);
        setItemTitle('');
        setItemDesc('');
        setItemSlideUrl('');
        setItemScheduledAt('');
        await loadData();
      } else {
        showToast(json.message || 'เพิ่มเนื้อหาไม่สำเร็จ', { kind: 'error' });
      }
      return;
    }

    if (createModal === 'line' || createModal === 'form' || createModal === 'question') {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: itemCode || `${createModal.toUpperCase()}-${Date.now().toString().slice(-2)}`,
          title: itemTitle,
          topicUnit: itemUnit,
          category: createModal,
          maxScore: Number(itemMaxScore) || 10,
          dueDate: itemDueDate || 'ตามกำหนด',
          description: itemDesc,
          formExternalUrl: createModal === 'form' ? itemFormUrl.trim() : undefined,
          publishStatus: targetStatus,
          scheduledAt: targetStatus === 'scheduled' ? itemScheduledAt : undefined
        })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(
          targetStatus === 'draft'
            ? 'บันทึกชิ้นงานเป็นฉบับร่างแล้ว'
            : targetStatus === 'scheduled'
              ? 'ตั้งเวลาโพสต์ชิ้นงานเรียบร้อย'
              : 'โพสต์งานของชั้นเรียนเรียบร้อย',
          { kind: 'success' }
        );
        setCreateModal(null);
        setItemCode('');
        setItemTitle('');
        setItemDesc('');
        setItemFormUrl('');
        setItemDueDate('');
        setItemScheduledAt('');
        await loadData();
      } else {
        showToast(json.message || 'สร้างงานไม่สำเร็จ', { kind: 'error' });
      }
    }
  }

  async function handleRunAiDraft() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult('');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, toolMode: 'teacher_toolkit' })
      });
      const json = await res.json();
      setAiResult(json.answer || json.message || 'ไม่สามารถร่างเนื้อหาได้');
    } catch {
      showToast('เชื่อมต่อ AI ไม่สำเร็จ', { kind: 'error' });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveInlineScore(studentId: string, assignmentId: string, scoreVal: string) {
    const res = await fetch('/api/teacher/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        assignmentId,
        score: scoreVal === '' ? null : Number(scoreVal)
      })
    });
    const json = await res.json();
    if (json.ok) {
      showToast('บันทึกคะแนนลงฐานข้อมูลแล้ว', { kind: 'success' });
      await loadData();
    } else {
      showToast(json.message || 'บันทึกคะแนนไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/teacher/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: newStId,
        prefix: newStPrefix,
        firstName: newStFirst,
        lastName: newStLast,
        number: Number(newStNum) || 1,
        classId: newStClassId
      })
    });
    const json = await res.json();
    if (!json.ok) {
      showToast(json.message || 'เพิ่มนักเรียนไม่สำเร็จ', { kind: 'error' });
      return;
    }
    setNewStId('');
    setNewStFirst('');
    setNewStLast('');
    showToast('เพิ่มนักเรียนเข้าชั้นเรียนเรียบร้อย', { kind: 'success' });
    await loadData();
  }

  async function handleBulkImport() {
    const lines = bulkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bulkStudents = lines.map((line, i) => {
      const parts = line.split(/[\t,]+/).map(p => p.trim());
      return {
        studentId: parts[0] || '',
        prefix: parts[1] || 'นาย',
        firstName: parts[2] || '',
        lastName: parts[3] || '',
        number: Number(parts[4]) || i + 1
      };
    });
    const res = await fetch('/api/teacher/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: bulkClassId, bulkStudents })
    });
    const json = await res.json();
    if (json.ok) {
      setBulkText('');
      showToast(`นำเข้านักเรียนสำเร็จ ${json.addedCount} คน`, { kind: 'success' });
      await loadData();
    } else {
      showToast(json.message || 'นำเข้าไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleConfirmResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTargetId || !resetPassVal.trim()) return;
    const res = await fetch('/api/teacher/students', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: resetTargetId, newPassword: resetPassVal.trim() })
    });
    const json = await res.json();
    if (json.ok) {
      showToast(`รีเซ็ตรหัสผ่านนักเรียน ${resetTargetId} เรียบร้อย`, { kind: 'success' });
      setResetTargetId(null);
      setResetPassVal('1234');
    } else {
      showToast(json.message || 'รีเซ็ตรหัสไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleDeleteStudent(studentId: string) {
    const res = await fetch(`/api/teacher/students?studentId=${encodeURIComponent(studentId)}`, { method: 'DELETE' });
    if ((await res.json()).ok) {
      showToast(`ลบนักเรียน ${studentId} เรียบร้อย`, { kind: 'info' });
      await loadData();
    }
  }

  function handleExportCSV() {
    if (!data) return;
    const filtered = data.students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId);
    const totalMax = data.assignments.reduce((sum, a) => sum + a.maxScore, 0);
    const headers = [
      'ห้อง',
      'เลขที่',
      'รหัสนักเรียน',
      'ชื่อ-สกุล',
      'XP เกม',
      ...data.assignments.map(a => `${a.code} (${a.maxScore})`),
      'คะแนนรวม',
      'ร้อยละ',
      'เกรด'
    ];
    const rows = [headers.join(',')];
    for (const st of filtered) {
      let total = 0;
      const scores = data.assignments.map(a => {
        const sub = subByStudent.get(`${st.studentId}__${a.id}`);
        if (typeof sub?.score === 'number') {
          total += sub.score;
          return String(sub.score);
        }
        return '';
      });
      const pct = totalMax > 0 ? Math.round((total / totalMax) * 1000) / 10 : 0;
      rows.push(
        [
          `"${classMap.get(st.classId)?.name || '-'}"`,
          st.number,
          `"${st.studentId}"`,
          `"${st.prefix}${st.firstName} ${st.lastName}"`,
          st.gameXp,
          ...scores,
          total,
          pct,
          calculateGrade(pct)
        ].join(',')
      );
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tus-gradebook-${selectedClassId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ CSV สำหรับ Excel ภาษาไทยเรียบร้อย', { kind: 'success' });
  }

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PortalHeader subtitle="กำลังโหลดระบบครูผู้สอน..." role="teacher" />
        <div className="max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="hidden lg:block lg:col-span-3 h-[520px] skeleton" />
          <div className="lg:col-span-9 space-y-4">
            <div className="h-28 skeleton" />
            <div className="h-80 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (loadError || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <PortalHeader subtitle="ระบบครูผู้สอน" role="teacher" />
        <main className="max-w-xl w-full mx-auto px-4 py-12">
          <div className="tus-card p-8 text-center space-y-4 border-2 border-[var(--color-danger)]">
            <AlertCircle className="w-12 h-12 text-[var(--color-danger)] mx-auto" />
            <h2 className="font-heading font-bold text-xl">ไม่สามารถโหลดข้อมูลครูผู้สอนได้</h2>
            <p className="text-sm text-[var(--text-secondary)]">สาเหตุ: {loadError || 'ไม่พบข้อมูล'}</p>
            <button type="button" onClick={loadData} className="btn-primary-3d">
              <RefreshCw className="w-5 h-5" /> ลองโหลดใหม่
            </button>
          </div>
        </main>
      </div>
    );
  }

  const filteredStudents = data.students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId);
  const top5Items = data.students
    .filter(s => s.classId && (s.gameXp || 0) > 0)
    .sort((a, b) => b.gameXp - a.gameXp)
    .slice(0, 5)
    .map((s, idx) => ({
      rank: idx + 1,
      studentId: s.studentId,
      displayName: `${s.prefix}${s.firstName} ${s.lastName}`,
      className: classMap.get(s.classId)?.name || s.classId,
      gameXp: s.gameXp
    }));

  const sidebarContent = (
    <div className="space-y-3">
      {/* ปุ่มหลัก "+ สร้าง" (1 ปุ่มสีเต็มหลักในแถบซ้าย) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setCreateMenuOpen(v => !v)}
          className="w-full btn-primary-3d"
        >
          <Plus className="w-5 h-5" />
          สร้าง
        </button>

        {createMenuOpen && (
          <div className="mt-2 tus-card p-2 space-y-1 shadow-xl animate-scale-pop z-30 relative">
            {[
              { id: 'class' as const, label: '+ สร้างห้องเรียนใหม่ (สุ่มรหัสคลาส)' },
              { id: 'line' as const, label: 'งาน (ส่งใน LINE)' },
              { id: 'form' as const, label: 'แบบทดสอบ (Quiz)' },
              { id: 'question' as const, label: 'คำถามชวนคิด' },
              { id: 'lesson' as const, label: 'เนื้อหา / สไลด์บทเรียน' },
              { id: 'reuse' as const, label: 'ใช้โพสต์ซ้ำ' },
              { id: 'topic' as const, label: 'หัวข้อ (Topic)' },
              { id: 'ai' as const, label: 'ร่างด้วย AI (Gemini)' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setCreateMenuOpen(false);
                  if (opt.id === 'class') setNewClassCode(generateClassCode());
                  setCreateModal(opt.id);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold text-[var(--text-primary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] cursor-pointer transition"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* เมนูซ้ายแบบ Google Classroom */}
      <nav aria-label="เมนูครูผู้สอน" className="space-y-1">
        <button
          type="button"
          onClick={() => {
            setSidebarView('home');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'home'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <Home className="w-5 h-5" /> หน้าแรก
        </button>

        <button
          type="button"
          onClick={() => {
            setSidebarView('calendar');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'calendar'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <Calendar className="w-5 h-5" /> ปฏิทิน
        </button>

        {/* การสอน (พับได้ มีรายวิชา) */}
        <div className="pt-1 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setTeachingOpen(v => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-heading font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> การสอน ({activeClasses.length})
            </span>
            {teachingOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {teachingOpen && (
            <div className="mt-1 pl-3 space-y-1">
              <button
                type="button"
                onClick={() => openClass('ALL')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${
                  sidebarView === 'course' && selectedClassId === 'ALL'
                    ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                }`}
              >
                รวมทุกห้องเรียน ({data.courseOverview.courseCode})
              </button>
              {activeClasses.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => openClass(cls.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer transition flex items-center justify-between ${
                    sidebarView === 'course' && selectedClassId === cls.id
                      ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]'
                  }`}
                >
                  <span>ห้อง {cls.name}</span>
                  <span className="text-xs font-mono opacity-75">{cls.classCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ตรวจงาน LINE พร้อมตัวเลขแจ้งเตือน */}
        <button
          type="button"
          onClick={() => {
            setSidebarView('line');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'line'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <span className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5" /> ตรวจงาน LINE
          </span>
          {pendingLineCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-danger)] text-white text-xs font-mono font-bold">
              {pendingLineCount}
            </span>
          )}
        </button>

        {/* รายงานปัญหาจากนักเรียน พร้อมตัวเลขแจ้งเตือน */}
        <button
          type="button"
          onClick={() => {
            setSidebarView('issues');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'issues'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <span className="flex items-center gap-3">
            <MessageSquareWarning className="w-5 h-5" /> รายงานปัญหาจากนักเรียน
          </span>
          {openIssuesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-danger)] text-white text-xs font-mono font-bold">
              {openIssuesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setSidebarView('xp');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'xp'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <Trophy className="w-5 h-5 text-[var(--color-gold)]" /> อันดับ XP
        </button>

        <button
          type="button"
          onClick={() => {
            setSidebarView('archived');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'archived'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <span className="flex items-center gap-3">
            <Archive className="w-5 h-5" /> ชั้นเรียนที่เก็บ
          </span>
          {archivedClasses.length > 0 && <span className="text-xs">{archivedClasses.length}</span>}
        </button>

        <button
          type="button"
          onClick={() => {
            setSidebarView('settings');
            setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold cursor-pointer transition ${
            sidebarView === 'settings'
              ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
              : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]'
          }`}
        >
          <Settings className="w-5 h-5" /> ตั้งค่าชั้นเรียน
        </button>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pb-24 lg:pb-12">
      <PortalHeader
        subtitle={`${data.courseOverview.courseCode} ${data.courseOverview.courseNameTh}`}
        userName={data.user.nameTh}
        userMeta={data.user.position}
        role={data.user.role}
        rightSlot={
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden btn-secondary-3d btn-compact-3d !px-3"
            aria-label="เปิดเมนูครู"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        }
      />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-80 max-w-[85vw] bg-[var(--bg-surface)] h-full p-4 overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
              <span className="font-heading font-bold text-base text-[var(--color-primary)]">เมนูครูผู้สอน</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Fullscreen Class Code Modal */}
      {fullscreenClass && (
        <div
          role="dialog"
          aria-label="รหัสชั้นเรียนเต็มหน้าจอ"
          className="fixed inset-0 z-[75] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setFullscreenClass(null)}
        >
          <div
            className="tus-card max-w-2xl w-full p-8 sm:p-12 text-center space-y-6 animate-scale-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-base font-heading font-semibold text-[var(--text-secondary)]">
              รหัสเข้าชั้นเรียน • ห้อง {fullscreenClass.name} ({fullscreenClass.courseCode})
            </div>
            <div className="font-mono font-extrabold text-5xl sm:text-7xl tracking-widest text-[var(--color-primary)] py-4">
              {fullscreenClass.classCode}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  await copyTextSafe(fullscreenClass.classCode);
                  showToast(`คัดลอกรหัส ${fullscreenClass.classCode} แล้ว`, { kind: 'success' });
                }}
                className="btn-primary-3d"
              >
                <Copy className="w-5 h-5" /> คัดลอกรหัส
              </button>
              <button
                type="button"
                onClick={() => handleClassAction(fullscreenClass.id, 'regenerate_code')}
                className="btn-secondary-3d"
              >
                <RefreshCw className="w-5 h-5" /> สุ่มรหัสใหม่
              </button>
              <button type="button" onClick={() => setFullscreenClass(null)} className="btn-secondary-3d">
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal (ไม่ใช้ prompt()) */}
      {resetTargetId && (
        <div
          className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
          onClick={() => setResetTargetId(null)}
        >
          <form
            onSubmit={handleConfirmResetPassword}
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
          >
            <h3 className="font-heading font-bold text-lg">รีเซ็ตรหัสผ่านนักเรียน {resetTargetId}</h3>
            <input
              type="text"
              required
              minLength={4}
              value={resetPassVal}
              onChange={e => setResetPassVal(e.target.value)}
              className="tus-input font-mono"
              placeholder="กรอกรหัสผ่านใหม่"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetTargetId(null)} className="btn-secondary-3d">
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary-3d">
                บันทึกรหัสผ่านใหม่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Modal (+ สร้าง) */}
      {createModal && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setCreateModal(null)}
        >
          <div
            className="tus-card max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-pop"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                {createModal === 'class'
                  ? 'สร้างห้องเรียนใหม่ (สุ่มรหัสคลาส)'
                  : createModal === 'line'
                    ? 'สร้างใบงาน (ส่งใน LINE)'
                    : createModal === 'form'
                      ? 'สร้างแบบทดสอบ (Quiz)'
                      : createModal === 'question'
                        ? 'สร้างคำถามชวนคิด'
                        : createModal === 'lesson'
                          ? 'เพิ่มเนื้อหา / สไลด์บทเรียน'
                          : createModal === 'topic'
                            ? 'สร้างหัวข้อใหม่ (Topic)'
                            : createModal === 'reuse'
                              ? 'เลือกใช้โพสต์เดิมซ้ำ'
                              : 'ร่างเนื้อหาการสอนด้วย AI (Gemini)'}
              </h3>
              <button type="button" onClick={() => setCreateModal(null)} className="p-2 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createModal === 'class' ? (
              <form onSubmit={e => void handleCreateClass(e, true)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                      ระดับชั้น
                    </label>
                    <select value={newGrade} onChange={e => setNewGrade(e.target.value)} className="tus-input">
                      {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                      ห้อง (1–15)
                    </label>
                    <select value={newRoom} onChange={e => setNewRoom(e.target.value)} className="tus-input">
                      {Array.from({ length: 15 }, (_, i) => String(i + 1)).map(r => (
                        <option key={r} value={r}>ห้อง {r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-strong)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-heading font-bold text-[var(--text-secondary)]">
                      รหัสเข้าห้องเรียนแบบสุ่ม (ให้นักเรียนกรอกเพื่อเข้าห้อง {newGrade}/{newRoom})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewClassCode(generateClassCode())}
                      className="btn-secondary-3d btn-compact-3d"
                    >
                      <RefreshCw className="w-4 h-4" /> สุ่มรหัสใหม่
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newClassCode}
                    onChange={e => setNewClassCode(e.target.value.toUpperCase())}
                    placeholder="เช่น TUS-8K4P"
                    className="tus-input font-mono font-extrabold text-center text-xl tracking-widest uppercase text-[var(--color-primary)]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setCreateModal(null)} className="btn-secondary-3d">
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn-primary-3d">
                    <Plus className="w-5 h-5" /> สร้างห้อง {newGrade}/{newRoom} และใช้รหัสนี้
                  </button>
                </div>
              </form>
            ) : createModal === 'reuse' ? (
              <div className="space-y-2.5">
                {data.announcements.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPostTitle(p.title);
                      setPostContent(p.content);
                      setCreateModal(null);
                      setSidebarView('course');
                      setCourseTab('stream');
                      showToast('ดึงข้อความโพสต์เดิมมาวางในกล่องประกาศแล้ว', { kind: 'info' });
                    }}
                    className="w-full text-left p-4 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--color-primary)] bg-[var(--bg-surface-muted)] cursor-pointer transition"
                  >
                    <div className="font-heading font-bold text-base">{p.title}</div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">{p.content}</p>
                  </button>
                ))}
              </div>
            ) : createModal === 'ai' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    'ร่างแผนการสอน 50 นาที เรื่องระบบทางเทคโนโลยีที่ซับซ้อน ม.4',
                    'ออกข้อสอบปรนัย 5 ข้อ เรื่องกระบวนการออกแบบเชิงวิศวกรรม พร้อมเฉลย',
                    'ร่างประกาศเตือนนักเรียนส่งใบงานใน LINE อย่างสุภาพและเป็นกันเอง'
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAiPrompt(preset)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] text-xs font-heading font-semibold hover:border-[var(--color-primary)] cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="พิมพ์สิ่งที่ต้องการให้ AI ช่วยร่าง..."
                  className="tus-input"
                />
                <button
                  type="button"
                  disabled={aiLoading || !aiPrompt.trim()}
                  onClick={handleRunAiDraft}
                  className="w-full btn-primary-3d"
                >
                  <Sparkles className="w-5 h-5" />
                  {aiLoading ? 'กำลังร่างด้วย AI...' : 'สร้างร่างด้วย Gemini AI'}
                </button>
                {aiResult && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] whitespace-pre-wrap text-sm">
                      {aiResult}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPostTitle(aiPrompt.slice(0, 80));
                        setPostContent(aiResult);
                        setCreateModal(null);
                        setSidebarView('course');
                        setCourseTab('stream');
                        showToast('นำข้อความไปวางในฟอร์มประกาศเรียบร้อย', { kind: 'success' });
                      }}
                      className="btn-secondary-3d w-full"
                    >
                      นำไปใช้สร้างประกาศทันที
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  void handleSubmitCreateModal('published');
                }}
                className="space-y-3.5"
              >
                {createModal !== 'topic' && (
                  <div>
                    <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                      จัดอยู่ในหัวข้อใหญ่ (บทที่ 1–6)
                    </label>
                    <select
                      value={itemUnit}
                      onChange={e => setItemUnit(e.target.value)}
                      className="tus-input"
                    >
                      {Array.from(
                        new Set([
                          ...(data.topics || []).map(t => t.title),
                          ...(data.lessons || []).map(l => l.unit)
                        ])
                      ).map(u => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {createModal !== 'topic' && createModal !== 'lesson' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={itemCode}
                      onChange={e => setItemCode(e.target.value)}
                      placeholder="รหัส เช่น LINE-04"
                      className="tus-input font-mono"
                    />
                    <input
                      type="number"
                      min={1}
                      value={itemMaxScore}
                      onChange={e => setItemMaxScore(e.target.value)}
                      placeholder="คะแนนเต็ม"
                      className="tus-input"
                    />
                  </div>
                )}
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={e => setItemTitle(e.target.value)}
                  placeholder={
                    createModal === 'topic'
                      ? 'ชื่อหัวข้อ เช่น หน่วยการเรียนรู้ที่ 4'
                      : createModal === 'lesson'
                        ? 'ชื่อบทเรียน เช่น บทที่ 7 : การนำเสนอผลงาน'
                        : 'ชื่องาน / แบบทดสอบ / คำถาม'
                  }
                  className="tus-input"
                />
                {createModal === 'lesson' && (
                  <>
                    <input
                      type="text"
                      value={itemHours}
                      onChange={e => setItemHours(e.target.value)}
                      placeholder="จำนวนชั่วโมง เช่น 2 ชั่วโมง"
                      className="tus-input"
                    />
                    <input
                      type="text"
                      value={itemSlideUrl}
                      onChange={e => setItemSlideUrl(e.target.value)}
                      placeholder="ลิงก์ PDF / Google Slides / Drive / Canva (แปลง Embed อัตโนมัติ)"
                      className="tus-input"
                    />
                  </>
                )}
                {createModal === 'form' && (
                  <input
                    type="url"
                    value={itemFormUrl}
                    onChange={e => setItemFormUrl(e.target.value)}
                    placeholder="ลิงก์ Google Forms (เช่น https://docs.google.com/forms/d/e/.../viewform)"
                    className="tus-input font-mono text-sm"
                  />
                )}
                {createModal !== 'topic' && createModal !== 'lesson' && (
                  <input
                    type="text"
                    value={itemDueDate}
                    onChange={e => setItemDueDate(e.target.value)}
                    placeholder="กำหนดส่ง เช่น ศุกร์นี้ 17:00 น."
                    className="tus-input"
                  />
                )}
                {createModal !== 'topic' && (
                  <>
                    <textarea
                      rows={3}
                      value={itemDesc}
                      onChange={e => setItemDesc(e.target.value)}
                      placeholder="คำอธิบายหรือคำชี้แจง..."
                      className="tus-input"
                    />
                    <div>
                      <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                        ตั้งเวลาโพสต์ล่วงหน้า (เลือกเมื่อจะกด “ตั้งเวลาโพสต์”)
                      </label>
                      <input
                        type="datetime-local"
                        value={itemScheduledAt}
                        onChange={e => setItemScheduledAt(e.target.value)}
                        className="tus-input"
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {createModal === 'topic' ? (
                    <>
                      <button type="button" onClick={() => setCreateModal(null)} className="btn-secondary-3d">
                        ยกเลิก
                      </button>
                      <button type="submit" className="btn-primary-3d">
                        สร้างหัวข้อใหญ่
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSubmitCreateModal('draft')}
                        className="btn-secondary-3d"
                      >
                        <FileEdit className="w-4 h-4" /> บันทึกร่าง
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSubmitCreateModal('scheduled')}
                        className="btn-secondary-3d"
                      >
                        <Clock className="w-4 h-4" /> ตั้งเวลาโพสต์
                      </button>
                      <button type="submit" className="btn-primary-3d">
                        <Send className="w-4 h-4" /> โพสต์ทันที
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Layout: Left Sidebar (Desktop) + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="hidden lg:block lg:col-span-3 sticky top-24 tus-card p-4">
          {sidebarContent}
        </aside>

        <main className="lg:col-span-9 space-y-6 animate-fade-up min-w-0">
          {/* VIEW: HOME (Overview of all classes) */}
          {sidebarView === 'home' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-heading font-bold text-2xl text-[var(--text-primary)]">
                  ชั้นเรียนที่ฉันสอน ({activeClasses.length} ห้อง)
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewClassCode(generateClassCode());
                      setCreateModal('class');
                    }}
                    className="btn-primary-3d btn-compact-3d"
                  >
                    <Plus className="w-4 h-4" /> สร้างห้องเรียนใหม่ (สุ่มรหัส)
                  </button>
                  <button type="button" onClick={() => setSidebarView('line')} className="btn-secondary-3d btn-compact-3d">
                    <CheckSquare className="w-4 h-4" /> ตรวจงาน LINE ({pendingLineCount})
                  </button>
                </div>
              </div>
              {activeClasses.length === 0 ? (
                <div className="tus-card p-10 text-center space-y-3">
                  <p className="font-heading font-bold text-lg">ยังไม่มีชั้นเรียนที่เปิดสอน</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewClassCode(generateClassCode());
                      setCreateModal('class');
                    }}
                    className="btn-primary-3d"
                  >
                    <Plus className="w-5 h-5" /> สร้างห้องเรียนใหม่และสุ่มรหัสคลาส
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeClasses.map(cls => {
                    const count = data.students.filter(s => s.classId === cls.id).length;
                    return (
                      <div key={cls.id} className="tus-card tus-card-hover p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-heading font-extrabold text-xl text-[var(--color-primary)]">
                              ห้อง {cls.name}
                            </span>
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                              {cls.classCode}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-[var(--text-secondary)]">
                              {cls.courseCode} {cls.courseName}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">นักเรียน {count} คน</p>
                          </div>

                          {/* ปุ่มลัดจัดการรหัสคลาสบนการ์ดห้องเรียน */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await copyTextSafe(cls.classCode);
                                showToast(`คัดลอกรหัสห้อง ${cls.name}: ${cls.classCode} แล้ว`, { kind: 'success' });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] text-xs font-heading font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                              title="คัดลอกรหัสห้องเรียน"
                            >
                              <Copy className="w-3.5 h-3.5 text-[var(--color-primary)]" /> คัดลอก
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleClassAction(cls.id, 'regenerate_code')}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] text-xs font-heading font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                              title="สุ่มรหัสห้องเรียนใหม่"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[var(--color-primary)]" /> สุ่มรหัสใหม่
                            </button>
                            <button
                              type="button"
                              onClick={() => setFullscreenClass(cls)}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] hover:border-[var(--color-primary)] text-xs font-heading font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                              title="ฉายรหัสห้องเรียนเต็มจอหน้าห้อง"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-[var(--color-primary)]" /> เต็มจอ
                            </button>
                          </div>
                        </div>

                        <button type="button" onClick={() => openClass(cls.id)} className="btn-secondary-3d btn-compact-3d w-full">
                          เข้าจัดการห้องเรียน
                        </button>
                      </div>
                    );
                  })}

                  {/* การ์ดลัด "+ สร้างห้องเรียนใหม่" */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewClassCode(generateClassCode());
                      setCreateModal('class');
                    }}
                    className="rounded-3xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)]/60 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]/50 p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition min-h-[190px]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary-border)] flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="font-heading font-bold text-base text-[var(--color-primary)]">
                      สร้างห้องเรียนใหม่
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      เลือกระดับชั้น-ห้อง พร้อมสุ่มรหัสเข้าห้องเรียนอัตโนมัติ
                    </p>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW: CALENDAR */}
          {sidebarView === 'calendar' && (
            <div className="tus-card p-6 space-y-4">
              <h1 className="font-heading font-bold text-xl text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--color-primary)]" /> ปฏิทินกำหนดส่งงานและประกาศตั้งเวลา
              </h1>
              <div className="space-y-3">
                {data.assignments.map(a => (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{a.code}</span>
                      <div className="font-heading font-bold text-base">{a.title}</div>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm font-semibold">
                      กำหนดส่ง: {a.dueDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: STANDALONE LINE GRADING */}
          {sidebarView === 'line' && (
            <div className="space-y-4">
              <h1 className="font-heading font-bold text-2xl text-[var(--text-primary)]">
                ระบบตรวจงานส่งใน LINE
              </h1>
              <TeacherLineGrading
                submissions={data.submissions}
                students={data.students}
                classes={data.classes}
                assignments={data.assignments}
                onRefresh={loadData}
              />
            </div>
          )}

          {/* VIEW: STANDALONE ISSUE REPORTS */}
          {sidebarView === 'issues' && (
            <TeacherIssueReports
              messages={data.teacherMessages || []}
              onRefresh={loadData}
            />
          )}

          {/* VIEW: XP LEADERBOARD */}
          {sidebarView === 'xp' && (
            <TeacherXpManager
              students={data.students}
              classes={data.classes}
              top5Items={top5Items}
              initialClassId={selectedClassId}
              onRefresh={loadData}
            />
          )}

          {/* VIEW: ARCHIVED CLASSES */}
          {sidebarView === 'archived' && (
            <div className="tus-card p-6 space-y-4">
              <h1 className="font-heading font-bold text-xl">ชั้นเรียนที่เก็บ ({archivedClasses.length})</h1>
              {archivedClasses.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">ยังไม่มีชั้นเรียนที่เก็บไว้</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {archivedClasses.map(cls => (
                    <div key={cls.id} className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <div className="font-heading font-bold text-base">ห้อง {cls.name}</div>
                        <div className="text-xs font-mono text-[var(--text-muted)]">{cls.classCode}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClassAction(cls.id, 'toggle_archive')}
                        className="btn-secondary-3d btn-compact-3d"
                      >
                        <RotateCcw className="w-4 h-4" /> กู้คืน
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: SETTINGS (Create / Manage Classes) */}
          {sidebarView === 'settings' && (
            <div className="tus-card p-6 space-y-5">
              <h1 className="font-heading font-bold text-xl">ตั้งค่าและสร้างห้องเรียนใหม่</h1>
              <form onSubmit={handleCreateClass} className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm font-heading font-semibold mb-1">ระดับชั้น</label>
                  <select value={newGrade} onChange={e => setNewGrade(e.target.value)} className="tus-input">
                    {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-heading font-semibold mb-1">ห้อง (1-13)</label>
                  <select value={newRoom} onChange={e => setNewRoom(e.target.value)} className="tus-input">
                    {Array.from({ length: 13 }, (_, i) => String(i + 1)).map(r => (
                      <option key={r} value={r}>ห้อง {r}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary-3d">
                  <Plus className="w-5 h-5" /> สร้างห้องและสุ่มรหัสคลาส
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeClasses.map(cls => (
                  <div key={cls.id} className="p-4 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <div>
                      <div className="font-heading font-bold text-base">ห้อง {cls.name}</div>
                      <div className="text-sm font-mono font-bold text-[var(--color-primary)]">{cls.classCode}</div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleClassAction(cls.id, 'toggle_archive')}
                        className="btn-secondary-3d btn-compact-3d"
                      >
                        <Archive className="w-4 h-4" /> เก็บ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: COURSE WORKSPACE (Google Classroom Tabs) */}
          {sidebarView === 'course' && (
            <div className="space-y-5">
              {/* Course Tabs: แสดงครบทุกปุ่ม 2 แถวบนคอม/แท็บเล็ต และ 2 คอลัมน์บนมือถือ ไม่ต้องเลื่อนซ้าย-ขวา */}
              <div className="tus-card p-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'stream' as const, label: 'ฟอรัม', icon: MessageSquare, badge: 0 },
                  { id: 'classwork' as const, label: 'งานของชั้นเรียน', icon: FolderKanban, badge: 0 },
                  { id: 'forms' as const, label: 'บททดสอบ (Form)', icon: ClipboardCheck, badge: 0 },
                  { id: 'people' as const, label: 'บุคคล', icon: Users, badge: 0 },
                  { id: 'grades' as const, label: 'คะแนน', icon: BarChart3, badge: 0 },
                  { id: 'line' as const, label: 'ตรวจงาน LINE', icon: CheckSquare, badge: pendingLineCount },
                  { id: 'issues' as const, label: 'รายงานปัญหา', icon: MessageSquareWarning, badge: openIssuesCount },
                  { id: 'xp' as const, label: 'เกม XP', icon: Trophy, badge: 0 }
                ].map(t => {
                  const Icon = t.icon;
                  const active = courseTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setCourseTab(t.id)}
                      className={`min-h-[44px] px-2.5 sm:px-3 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition text-center ${
                        active
                          ? 'bg-[var(--color-primary)] text-white shadow-sm'
                          : 'bg-[var(--bg-surface-muted)]/60 text-[var(--text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{t.label}</span>
                      {t.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 ${
                            active
                              ? 'bg-white text-[var(--color-primary)]'
                              : 'bg-[var(--color-danger)] text-white'
                          }`}
                        >
                          {t.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* COURSE TAB 1: ฟอรัม (Class Code Card + Rich Announcement Composer + Stream) */}
              {courseTab === 'stream' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  {/* การ์ดรหัสชั้นเรียนพร้อมขยายเต็มจอ / สุ่มรหัสใหม่ / ปิดรับสมัครชั่วคราว */}
                  {selectedClassObj && (
                    <div className="xl:col-span-4 tus-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-bold text-[var(--text-secondary)]">
                          รหัสชั้นเรียน • ห้อง {selectedClassObj.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFullscreenClass(selectedClassObj)}
                          className="p-2 rounded-xl hover:bg-[var(--bg-surface-muted)] text-[var(--color-primary)] cursor-pointer"
                          title="ขยายรหัสเต็มหน้าจอ"
                          aria-label="ขยายรหัสเต็มหน้าจอ"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="font-mono font-extrabold text-3xl tracking-wider text-[var(--color-primary)]">
                        {selectedClassObj.classCode}
                      </div>

                      <div className="text-xs font-semibold">
                        สถานะรับสมัคร:{' '}
                        <span
                          className={
                            selectedClassObj.enrollmentOpen === false
                              ? 'text-[var(--color-danger)]'
                              : 'text-[var(--color-success)]'
                          }
                        >
                          {selectedClassObj.enrollmentOpen === false ? 'ปิดรับสมัครชั่วคราว' : 'เปิดรับนักเรียนเข้าร่วม'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await copyTextSafe(selectedClassObj.classCode);
                            showToast(`คัดลอกรหัส ${selectedClassObj.classCode} แล้ว`, { kind: 'success' });
                          }}
                          className="btn-secondary-3d btn-compact-3d w-full"
                        >
                          <Copy className="w-4 h-4" /> คัดลอกรหัส
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClassAction(selectedClassObj.id, 'regenerate_code')}
                          className="btn-secondary-3d btn-compact-3d w-full"
                        >
                          <RefreshCw className="w-4 h-4" /> สุ่มรหัสใหม่
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClassAction(selectedClassObj.id, 'toggle_enrollment')}
                          className="btn-secondary-3d btn-compact-3d w-full"
                        >
                          {selectedClassObj.enrollmentOpen === false ? (
                            <>
                              <Unlock className="w-4 h-4" /> เปิดรับสมัคร
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" /> ปิดรับสมัครชั่วคราว
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ฟอร์มประกาศ + ปุ่ม โพสต์ / ตั้งเวลา / ร่าง / จัดการ */}
                  <div className="xl:col-span-8 space-y-5">
                    {postScheduleTarget && (
                      <div
                        className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
                        onClick={() => setPostScheduleTarget(null)}
                      >
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            void handlePostStatusAction(postScheduleTarget.id, 'schedule', postScheduleTarget.at);
                          }}
                          onClick={e => e.stopPropagation()}
                          className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
                        >
                          <h3 className="font-heading font-bold text-lg">ตั้งเวลาโพสต์ประกาศ</h3>
                          <p className="text-sm text-[var(--text-secondary)]">{postScheduleTarget.title}</p>
                          <input
                            type="datetime-local"
                            required
                            value={postScheduleTarget.at}
                            onChange={e => setPostScheduleTarget({ ...postScheduleTarget, at: e.target.value })}
                            className="tus-input"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setPostScheduleTarget(null)} className="btn-secondary-3d">
                              ยกเลิก
                            </button>
                            <button type="submit" className="btn-primary-3d">
                              ยืนยันตั้งเวลา
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        void handleSavePost('published');
                      }}
                      className="tus-card p-5 space-y-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                          {postEditId ? 'แก้ไขประกาศในชั้นเรียน' : 'ประกาศบางอย่างให้ชั้นเรียนของคุณ'}
                        </h2>
                        {postEditId && (
                          <button
                            type="button"
                            onClick={() => {
                              setPostEditId(null);
                              setPostTitle('');
                              setPostContent('');
                              setPostScheduledAt('');
                            }}
                            className="text-xs font-heading font-bold text-[var(--color-danger)] hover:underline cursor-pointer"
                          >
                            ยกเลิกการแก้ไข
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={postClassId}
                          onChange={e => setPostClassId(e.target.value)}
                          className="tus-input"
                          aria-label="เลือกห้องเรียนเป้าหมาย"
                        >
                          <option value="">ทุกห้องเรียน ({data.courseOverview.courseCode})</option>
                          {activeClasses.map(c => (
                            <option key={c.id} value={c.id}>
                              เฉพาะห้อง {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={postTargetGroup}
                          onChange={e => setPostTargetGroup(e.target.value)}
                          className="tus-input"
                          aria-label="เลือกกลุ่มนักเรียน"
                        >
                          <option value="นักเรียนทุกคน">นักเรียนทุกคน</option>
                          <option value="กลุ่มที่ยังไม่ส่งงาน">กลุ่มที่ยังไม่ส่งงาน</option>
                          <option value="หัวหน้าห้อง / ตัวแทน">หัวหน้าห้อง / ตัวแทน</option>
                        </select>
                      </div>

                      <input
                        type="text"
                        required
                        value={postTitle}
                        onChange={e => setPostTitle(e.target.value)}
                        placeholder="หัวข้อประกาศ..."
                        className="tus-input"
                      />

                      {/* แถบจัดรูปแบบตัวอักษร */}
                      <div className="flex flex-wrap items-center gap-1.5 border border-[var(--border-subtle)] rounded-xl p-1.5 bg-[var(--bg-surface-muted)]">
                        <button
                          type="button"
                          onClick={() => applyFormat('**ข้อความตัวหนา**')}
                          className="p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer"
                          title="ตัวหนา"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormat('*ข้อความตัวเอียง*')}
                          className="p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer"
                          title="ตัวเอียง"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => applyFormat('\n- รายการที่ 1\n- รายการที่ 2')}
                          className="p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer"
                          title="รายการหัวข้อย่อย"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        required
                        value={postContent}
                        onChange={e => setPostContent(e.target.value)}
                        placeholder="รายละเอียดประกาศ คำชี้แจง หรือกำหนดส่งงาน..."
                        className="tus-input"
                      />

                      {/* แนบไฟล์ / YouTube / ลิงก์ */}
                      <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] space-y-2.5">
                        <div className="text-xs font-heading font-bold text-[var(--text-secondary)]">
                          แนบไฟล์ / YouTube / ลิงก์
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <select
                            value={attType}
                            onChange={e => setAttType(e.target.value as 'link' | 'youtube' | 'file')}
                            className="tus-input sm:col-span-3 !min-h-[42px]"
                          >
                            <option value="link">ลิงก์เว็บ</option>
                            <option value="youtube">YouTube</option>
                            <option value="file">ไฟล์ / Drive</option>
                          </select>
                          <input
                            type="text"
                            value={attLabel}
                            onChange={e => setAttLabel(e.target.value)}
                            placeholder="ชื่อลิงก์"
                            className="tus-input sm:col-span-3 !min-h-[42px]"
                          />
                          <input
                            type="url"
                            value={attUrl}
                            onChange={e => setAttUrl(e.target.value)}
                            placeholder="https://..."
                            className="tus-input sm:col-span-4 !min-h-[42px]"
                          />
                          <button
                            type="button"
                            onClick={handleAddAttachment}
                            className="btn-secondary-3d btn-compact-3d sm:col-span-2"
                          >
                            แนบ
                          </button>
                        </div>
                        {postAttachments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {postAttachments.map((att, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold"
                              >
                                {att.type === 'youtube' ? (
                                  <Youtube className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                                ) : att.type === 'file' ? (
                                  <Paperclip className="w-3.5 h-3.5" />
                                ) : (
                                  <Link2 className="w-3.5 h-3.5" />
                                )}
                                {att.label}
                                <button
                                  type="button"
                                  onClick={() => setPostAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                  className="text-[var(--color-danger)] cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-1">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={postPinned}
                              onChange={e => setPostPinned(e.target.checked)}
                            />
                            ปักหมุด
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <Clock className="w-4 h-4" /> ตั้งเวลาโพสต์:
                            <input
                              type="datetime-local"
                              value={postScheduledAt}
                              onChange={e => setPostScheduledAt(e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs"
                            />
                          </label>
                        </div>

                        {/* 3 ปุ่มชัดเจน: โพสต์ทันที / ตั้งเวลาโพสต์ / บันทึกฉบับร่าง */}
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSavePost('draft')}
                            className="btn-secondary-3d"
                          >
                            <FileEdit className="w-4 h-4" /> บันทึกฉบับร่าง
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSavePost('scheduled')}
                            className="btn-secondary-3d"
                          >
                            <Clock className="w-4 h-4" /> ตั้งเวลาโพสต์
                          </button>
                          <button type="submit" className="btn-primary-3d">
                            <Send className="w-4 h-4" /> โพสต์ทันที
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* ตัวกรองสถานะประกาศ: ทั้งหมด / โพสต์แล้ว / ตั้งเวลาไว้ / ฉบับร่าง */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all' as const, label: 'ทั้งหมด', count: data.announcements.length },
                        {
                          id: 'published' as const,
                          label: 'โพสต์แล้ว',
                          count: data.announcements.filter(p => (p.publishStatus || 'published') === 'published').length
                        },
                        {
                          id: 'scheduled' as const,
                          label: 'ตั้งเวลาไว้',
                          count: data.announcements.filter(p => p.publishStatus === 'scheduled').length
                        },
                        {
                          id: 'draft' as const,
                          label: 'ฉบับร่าง',
                          count: data.announcements.filter(p => p.publishStatus === 'draft').length
                        }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStreamFilter(tab.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                            streamFilter === tab.id
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>

                    {/* Stream Posts พร้อมปุ่มจัดการครบชุด */}
                    {data.announcements
                      .filter(p => streamFilter === 'all' || (p.publishStatus || 'published') === streamFilter)
                      .map(post => {
                        const pStatus = post.publishStatus || 'published';
                        return (
                          <article key={post.id} className="tus-card p-5 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                                  {pStatus === 'draft' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border border-[var(--border-strong)] font-heading font-bold">
                                      <FileEdit className="w-3.5 h-3.5" /> ฉบับร่าง
                                    </span>
                                  ) : pStatus === 'scheduled' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-gold-bg)] text-[var(--color-gold)] border border-[var(--color-gold-border)] font-heading font-bold">
                                      <Clock className="w-3.5 h-3.5" /> ตั้งเวลา: {(post.scheduledAt || '').replace('T', ' ')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)] font-heading font-bold">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> โพสต์แล้ว
                                    </span>
                                  )}
                                  {post.pinned && (
                                    <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-bold">
                                      ปักหมุด
                                    </span>
                                  )}
                                  <span>{post.author}</span>
                                  <span>• {post.createdAt}</span>
                                </div>
                                <h3 className="font-heading font-bold text-base sm:text-lg mt-1">{post.title}</h3>
                              </div>

                              <div className="flex flex-wrap gap-1.5 shrink-0">
                                {pStatus !== 'published' && (
                                  <button
                                    type="button"
                                    onClick={() => void handlePostStatusAction(post.id, 'publish')}
                                    className="btn-primary-3d btn-compact-3d"
                                  >
                                    <Send className="w-3.5 h-3.5" /> โพสต์เลย
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPostScheduleTarget({
                                      id: post.id,
                                      title: post.title,
                                      at: post.scheduledAt || ''
                                    })
                                  }
                                  className="btn-secondary-3d btn-compact-3d"
                                  title="ตั้งเวลาโพสต์"
                                >
                                  <Clock className="w-3.5 h-3.5" /> ตั้งเวลา
                                </button>
                                {pStatus !== 'draft' && (
                                  <button
                                    type="button"
                                    onClick={() => void handlePostStatusAction(post.id, 'draft')}
                                    className="btn-secondary-3d btn-compact-3d"
                                    title="ย้ายไปเป็นฉบับร่าง"
                                  >
                                    <FileEdit className="w-3.5 h-3.5" /> ร่าง
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPostEditId(post.id);
                                    setPostTitle(post.title);
                                    setPostContent(post.content);
                                    setPostClassId(post.classId || '');
                                    setPostPinned(Boolean(post.pinned));
                                    setPostScheduledAt(post.scheduledAt || '');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="btn-secondary-3d btn-compact-3d !px-3"
                                  title="แก้ไขประกาศ"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handlePostStatusAction(post.id, 'toggle_pin')}
                                  className="btn-secondary-3d btn-compact-3d !px-3"
                                  title="ปักหมุด/เลิกปักหมุด"
                                >
                                  <Pin className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeletePost(post.id)}
                                  className="btn-danger-3d btn-compact-3d !px-3"
                                  title="ลบประกาศ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-base whitespace-pre-wrap">{post.content}</p>
                          </article>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* COURSE TAB 2: งานของชั้นเรียน (จัดแยกตามหัวข้อใหญ่ + 11 สไลด์ PDF + โพสต์/ตั้งเวลา/ร่าง/จัดการ) */}
              {courseTab === 'classwork' && (
                <TeacherClassworkManager
                  topics={data.topics || []}
                  lessons={data.lessons}
                  assignments={data.assignments}
                  onOpenCreate={t => setCreateModal(t)}
                  onRefresh={loadData}
                />
              )}

              {/* COURSE TAB 2.5: บททดสอบ (Google Forms สอบหลังเรียน) */}
              {courseTab === 'forms' && (
                <TeacherFormsManager
                  topics={data.topics || []}
                  lessons={data.lessons}
                  assignments={data.assignments}
                  quizzes={data.quizzes || []}
                  onRefresh={loadData}
                />
              )}

              {/* COURSE TAB 3: บุคคล */}
              {courseTab === 'people' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <form onSubmit={handleAddStudent} className="tus-card p-5 space-y-3">
                      <h3 className="font-heading font-bold text-base">+ เพิ่มนักเรียนรายบุคคล</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="text" required value={newStId} onChange={e => setNewStId(e.target.value)} placeholder="รหัส" className="tus-input" />
                        <input type="number" min={1} value={newStNum} onChange={e => setNewStNum(e.target.value)} placeholder="เลขที่" className="tus-input" />
                        <select value={newStClassId} onChange={e => setNewStClassId(e.target.value)} className="tus-input">
                          {activeClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select value={newStPrefix} onChange={e => setNewStPrefix(e.target.value)} className="tus-input">
                          <option value="นาย">นาย</option>
                          <option value="นางสาว">นางสาว</option>
                          <option value="เด็กชาย">เด็กชาย</option>
                          <option value="เด็กหญิง">เด็กหญิง</option>
                        </select>
                        <input type="text" required value={newStFirst} onChange={e => setNewStFirst(e.target.value)} placeholder="ชื่อ" className="tus-input" />
                        <input type="text" required value={newStLast} onChange={e => setNewStLast(e.target.value)} placeholder="นามสกุล" className="tus-input" />
                      </div>
                      <button type="submit" className="w-full btn-primary-3d">เพิ่มนักเรียน (รหัสเริ่มต้น 1234)</button>
                    </form>

                    <div className="tus-card p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading font-bold text-base">นำเข้ารายชื่อทั้งห้อง (Excel / CSV)</h3>
                        <select value={bulkClassId} onChange={e => setBulkClassId(e.target.value)} className="tus-input !w-auto">
                          {activeClasses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={4}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        placeholder={'6940501,นาย,สมชาย,ใจดี,1\n6940502,นางสาว,สมหญิง,รักเรียน,2'}
                        className="tus-input font-mono text-sm"
                      />
                      <button type="button" disabled={!bulkText.trim()} onClick={handleBulkImport} className="w-full btn-secondary-3d">
                        <Upload className="w-4 h-4" /> นำเข้ารายชื่อ
                      </button>
                    </div>
                  </div>

                  <div className="tus-card p-5 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          <th className="py-3 px-3">ห้อง</th>
                          <th className="py-3 px-3">เลขที่</th>
                          <th className="py-3 px-3">รหัส</th>
                          <th className="py-3 px-3">ชื่อ-สกุล</th>
                          <th className="py-3 px-3 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {filteredStudents.map(st => (
                          <tr key={st.studentId}>
                            <td className="py-3 px-3 font-bold text-[var(--color-primary)]">
                              {classMap.get(st.classId)?.name || 'ยังไม่เข้าคลาส'}
                            </td>
                            <td className="py-3 px-3">{st.number}</td>
                            <td className="py-3 px-3 font-mono">{st.studentId}</td>
                            <td className="py-3 px-3 font-semibold">{st.prefix}{st.firstName} {st.lastName}</td>
                            <td className="py-3 px-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setResetTargetId(st.studentId);
                                  setResetPassVal('1234');
                                }}
                                className="btn-secondary-3d btn-compact-3d"
                              >
                                <KeyRound className="w-4 h-4" /> รีเซ็ตรหัส
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(st.studentId)}
                                className="btn-danger-3d btn-compact-3d"
                              >
                                <Trash2 className="w-4 h-4" /> ลบ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* COURSE TAB 4: คะแนน & สถิติวิจัย */}
              {courseTab === 'grades' && (
                <div className="space-y-5">
                  <TeacherGradeSheetCard
                    classes={data.classes}
                    defaultSheetUrl={data.defaultGradeSheetUrl || ''}
                    defaultSheetUpdatedAt={data.defaultGradeSheetUpdatedAt}
                    selectedClassId={selectedClassId}
                    onRefresh={loadData}
                  />

                  <div className="tus-card p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-[var(--text-secondary)]">เฉลี่ยก่อนเรียน</div>
                        <div className="font-heading font-extrabold text-xl">{data.research.avgPre}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)]">เฉลี่ยหลังเรียน</div>
                        <div className="font-heading font-extrabold text-xl text-[var(--color-success)]">{data.research.avgPost}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--text-secondary)]">พัฒนาการ (D)</div>
                        <div className="font-heading font-extrabold text-xl text-[var(--color-primary)]">
                          +{data.research.avgDiff}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={handleExportCSV} className="btn-primary-3d">
                      <Download className="w-5 h-5" /> ส่งออก CSV (Excel ภาษาไทย)
                    </button>
                  </div>

                  <div className="tus-card p-5 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          <th className="py-2.5 px-2">ห้อง</th>
                          <th className="py-2.5 px-2">ชื่อ-สกุล</th>
                          {data.assignments.map(a => (
                            <th key={a.id} className="py-2.5 px-2 text-center">
                              <div>{a.code}</div>
                              <div className="text-xs opacity-70">/{a.maxScore}</div>
                            </th>
                          ))}
                          <th className="py-2.5 px-2 text-right">รวม</th>
                          <th className="py-2.5 px-2 text-center">เกรด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {filteredStudents.map(st => {
                          const totalMax = data.assignments.reduce((s, a) => s + a.maxScore, 0);
                          let total = 0;
                          for (const a of data.assignments) {
                            const sub = subByStudent.get(`${st.studentId}__${a.id}`);
                            if (typeof sub?.score === 'number') total += sub.score;
                          }
                          const pct = totalMax > 0 ? Math.round((total / totalMax) * 1000) / 10 : 0;
                          return (
                            <tr key={st.studentId}>
                              <td className="py-2 px-2 font-bold text-[var(--color-primary)]">
                                {classMap.get(st.classId)?.name || '-'}
                              </td>
                              <td className="py-2 px-2 font-semibold whitespace-nowrap">
                                {st.prefix}{st.firstName} {st.lastName}
                              </td>
                              {data.assignments.map(a => {
                                const sub = subByStudent.get(`${st.studentId}__${a.id}`);
                                const val = typeof sub?.score === 'number' ? String(sub.score) : '';
                                return (
                                  <td key={a.id} className="py-2 px-1 text-center">
                                    <input
                                      type="number"
                                      defaultValue={val}
                                      min={0}
                                      max={a.maxScore}
                                      step="0.5"
                                      onBlur={e => {
                                        if (e.target.value !== val) {
                                          void handleSaveInlineScore(st.studentId, a.id, e.target.value);
                                        }
                                      }}
                                      className="w-16 px-2 py-1.5 text-center rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-sm font-bold"
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-2 px-2 text-right font-heading font-bold">{total}</td>
                              <td className="py-2 px-2 text-center font-heading font-extrabold text-[var(--color-primary)]">
                                {calculateGrade(pct)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* COURSE TAB 5: ตรวจงาน LINE */}
              {courseTab === 'line' && (
                <TeacherLineGrading
                  submissions={data.submissions}
                  students={data.students}
                  classes={data.classes}
                  assignments={data.assignments}
                  initialClassId={selectedClassId}
                  onRefresh={loadData}
                />
              )}

              {/* COURSE TAB 5.5: รายงานปัญหาจากนักเรียน */}
              {courseTab === 'issues' && (
                <TeacherIssueReports
                  messages={data.teacherMessages || []}
                  onRefresh={loadData}
                />
              )}

              {/* COURSE TAB 6: เกม XP (พร้อมรีเซ็ตคะแนนรายคน / ห้อง / ทั้งหมด) */}
              {courseTab === 'xp' && (
                <TeacherXpManager
                  students={data.students}
                  classes={data.classes}
                  top5Items={top5Items}
                  initialClassId={selectedClassId}
                  onRefresh={loadData}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Nav (แสดงครบทุกปุ่มพอดีจอ ไม่ต้องเลื่อนแนวนอน) */}
      <nav aria-label="เมนูล่างครูผู้สอน" className="lg:hidden fixed bottom-0 inset-x-0 z-40 tus-bottom-nav pb-safe px-1 pt-1.5">
        <div className="grid grid-cols-6 gap-0.5">
          {[
            { id: 'home' as const, label: 'ชั้นเรียน', icon: Home, badge: 0, onClick: () => setSidebarView('home'), active: sidebarView === 'home' },
            { id: 'course' as const, label: 'ห้องเรียน', icon: MessageSquare, badge: 0, onClick: () => { setSidebarView('course'); setCourseTab('stream'); }, active: sidebarView === 'course' && courseTab !== 'forms' },
            { id: 'forms' as const, label: 'สอบ', icon: ClipboardCheck, badge: 0, onClick: () => { setSidebarView('course'); setCourseTab('forms'); }, active: sidebarView === 'course' && courseTab === 'forms' },
            { id: 'line' as const, label: 'LINE', icon: CheckSquare, badge: pendingLineCount, onClick: () => setSidebarView('line'), active: sidebarView === 'line' },
            { id: 'issues' as const, label: 'ปัญหา', icon: MessageSquareWarning, badge: openIssuesCount, onClick: () => setSidebarView('issues'), active: sidebarView === 'issues' },
            { id: 'xp' as const, label: 'XP', icon: Trophy, badge: 0, onClick: () => setSidebarView('xp'), active: sidebarView === 'xp' }
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onClick();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative min-h-[48px] py-1.5 px-0.5 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer transition ${
                  item.active ? 'text-[var(--color-primary)] bg-[var(--color-primary-soft)] font-bold' : 'text-[var(--text-muted)]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-heading leading-tight">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-1 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-danger)] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
