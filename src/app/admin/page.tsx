'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database,
  Users,
  History,
  Download,
  RefreshCw,
  RotateCcw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Upload,
  KeyRound,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Search,
  Mail,
  Cloud,
  X,
  GraduationCap,
  ShieldCheck,
  Pencil
} from 'lucide-react';
import { PortalHeader } from '@/components/PortalHeader';
import { useToast } from '@/components/ToastProvider';
import { copyTextSafe } from '@/lib/utils';
import type {
  AdminStaffView,
  AdminStudentView,
  AuditLog,
  ClassRoom,
  DatabaseStats,
  PrContentDoc,
  SessionUser
} from '@/types/database';

interface AdminOverviewData {
  user: SessionUser;
  stats: DatabaseStats;
  users: AdminStaffView[];
  classes: ClassRoom[];
  students: AdminStudentView[];
  prContent: PrContentDoc;
  auditLogs: AuditLog[];
}

type AdminTab = 'accounts' | 'system' | 'content';

export default function AdminPortalPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('accounts');
  const [busyAction, setBusyAction] = useState('');
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Accounts Directory (Students by room & Staff)
  const [accountScope, setAccountScope] = useState<'students' | 'staff'>('students');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [accountQuery, setAccountQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState(true);

  // Quick Reset Student Password Modal
  const [resetStudentTarget, setResetStudentTarget] = useState<AdminStudentView | null>(null);
  const [resetStudentPass, setResetStudentPass] = useState('1234');
  const [editStudentTarget, setEditStudentTarget] = useState<{
    oldStudentId: string;
    studentId: string;
    prefix: string;
    firstName: string;
    lastName: string;
    number: string;
    classId: string;
  } | null>(null);
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);

  // Staff User form
  const [staffUser, setStaffUser] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState<'teacher' | 'admin'>('teacher');
  const [staffPosition, setStaffPosition] = useState('ครูผู้สอน กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี');
  const [staffPass, setStaffPass] = useState('');

  // PR & Course form
  const [courseCode, setCourseCode] = useState('');
  const [courseNameTh, setCourseNameTh] = useState('');
  const [semester, setSemester] = useState('');
  const [fullDesc, setFullDesc] = useState('');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsCat, setNewsCat] = useState('ข่าววิชาการ');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsLink, setNewsLink] = useState('https://www.triamudomsouth.ac.th/');

  // System Connectors (Firebase, Gemini, Email SMTP)
  const [saJsonText, setSaJsonText] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [connecting, setConnecting] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้');
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'โหลดข้อมูลไม่สำเร็จ');
      setData(json);
      setCourseCode(json.prContent.courseOverview.courseCode || '');
      setCourseNameTh(json.prContent.courseOverview.courseNameTh || '');
      setSemester(json.prContent.courseOverview.semester || '');
      setFullDesc(json.prContent.courseOverview.fullDescription || '');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const classMap = useMemo(() => new Map((data?.classes || []).map(c => [c.id, c])), [data]);

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    const q = accountQuery.trim().toLowerCase();
    return data.students.filter(s => {
      if (selectedRoomId === 'UNASSIGNED') {
        if (s.classId) return false;
      } else if (selectedRoomId !== 'ALL') {
        if (s.classId !== selectedRoomId) return false;
      }
      if (!q) return true;
      const hay = `${s.studentId} ${s.prefix}${s.firstName} ${s.lastName} ${classMap.get(s.classId)?.name || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, selectedRoomId, accountQuery, classMap]);

  async function handleDbAction(action: 'seed_merge' | 'reset_seed') {
    setBusyAction(action);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.ok) {
        setConfirmResetOpen(false);
        showToast(
          action === 'reset_seed'
            ? 'รีเซ็ตฐานข้อมูลกลับเป็นค่าเริ่มต้นเรียบร้อย'
            : 'ซิงค์ข้อมูลมาตรฐานเข้าฐานข้อมูลเรียบร้อย',
          { kind: 'success' }
        );
        await loadData();
      } else {
        showToast(json.message || 'ดำเนินการไม่สำเร็จ', { kind: 'error' });
      }
    } finally {
      setBusyAction('');
    }
  }

  async function handleJsonFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSaJsonText(text);
    showToast('อ่านไฟล์ Service Account JSON แล้ว กดปุ่มเชื่อมต่อด้านล่างได้เลย', { kind: 'info' });
  }

  async function handleConnectFirebase(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch('/api/admin/firebase-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: saJsonText })
      });
      const json = await res.json();
      if (!json.ok) {
        showToast(json.message || 'เชื่อมต่อ Firebase ไม่สำเร็จ', { kind: 'error' });
        return;
      }
      setSaJsonText('');
      showToast(`เชื่อมต่อ Firebase Firestore (${json.projectId}) และซิงค์ข้อมูลสำเร็จ`, { kind: 'success' });
      await loadData();
    } catch {
      showToast('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveGeminiKey(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch('/api/admin/firebase-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: geminiKeyInput })
      });
      const json = await res.json();
      if (json.ok) {
        setGeminiKeyInput('');
        showToast('บันทึก GEMINI_API_KEY ลงฝั่งเซิร์ฟเวอร์เรียบร้อย', { kind: 'success' });
        await loadData();
      } else {
        showToast(json.message || 'บันทึกคีย์ไม่สำเร็จ', { kind: 'error' });
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await fetch('/api/admin/firebase-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass }
        })
      });
      const json = await res.json();
      if (json.ok) {
        setSmtpPass('');
        showToast('บันทึกค่าอีเมลแจ้งเตือนครู (SMTP) เรียบร้อยแล้ว', { kind: 'success' });
        await loadData();
      } else {
        showToast(json.message || 'บันทึกค่า SMTP ไม่สำเร็จ', { kind: 'error' });
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleResetStudentPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetStudentTarget || resetStudentPass.trim().length < 4) {
      showToast('กรุณากำหนดรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร', { kind: 'error' });
      return;
    }
    const res = await fetch('/api/teacher/students', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: resetStudentTarget.studentId,
        newPassword: resetStudentPass.trim()
      })
    });
    const json = await res.json();
    if (json.ok) {
      showToast(`เปลี่ยนรหัสผ่านนักเรียน ${resetStudentTarget.studentId} เป็น ${resetStudentPass.trim()} แล้ว`, {
        kind: 'success'
      });
      setResetStudentTarget(null);
      setResetStudentPass('1234');
      await loadData();
    } else {
      showToast(json.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleSaveStudentEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudentTarget) return;
    setSavingStudentEdit(true);
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_profile',
          oldStudentId: editStudentTarget.oldStudentId,
          newStudentId: editStudentTarget.studentId.trim(),
          prefix: editStudentTarget.prefix,
          firstName: editStudentTarget.firstName.trim(),
          lastName: editStudentTarget.lastName.trim(),
          number: Number(editStudentTarget.number) || 1,
          classId: editStudentTarget.classId
        })
      });
      const json = await res.json();
      if (json.ok) {
        showToast(
          json.idChanged
            ? `เปลี่ยนรหัส ${editStudentTarget.oldStudentId} → ${editStudentTarget.studentId.trim()} และอัปเดตข้อมูลแล้ว`
            : 'อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว',
          { kind: 'success' }
        );
        setEditStudentTarget(null);
        await loadData();
      } else {
        showToast(json.message || 'แก้ไขข้อมูลไม่สำเร็จ', { kind: 'error' });
      }
    } finally {
      setSavingStudentEdit(false);
    }
  }

  async function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: staffUser,
        nameTh: staffName,
        email: staffEmail,
        role: staffRole,
        position: staffPosition,
        password: staffPass
      })
    });
    const json = await res.json();
    if (json.ok) {
      setStaffUser('');
      setStaffName('');
      setStaffEmail('');
      setStaffPass('');
      showToast('บันทึกบัญชีครู/แอดมินเรียบร้อย', { kind: 'success' });
      await loadData();
    } else {
      showToast(json.message || 'บันทึกบัญชีไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleDeleteStaff(id: string) {
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) {
      showToast(`ลบบัญชีผู้ใช้ "${id}" เรียบร้อย`, { kind: 'info' });
      await loadData();
    } else {
      showToast(json.message || 'ลบบัญชีไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/pr', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseOverview: { courseCode, courseNameTh, semester, fullDescription: fullDesc }
      })
    });
    const json = await res.json();
    if (json.ok) {
      showToast('อัปเดตข้อมูลรายวิชาเรียบร้อย', { kind: 'success' });
      await loadData();
    } else {
      showToast(json.message || 'อัปเดตไม่สำเร็จ', { kind: 'error' });
    }
  }

  async function handleAddNews(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    const newItem = {
      id: `NEWS-${Date.now().toString(36).toUpperCase()}`,
      title: newsTitle,
      category: newsCat,
      date: semester || 'ปีการศึกษา 2569',
      imageUrl: '/assets/school_slide5.jpg',
      summary: newsSummary,
      linkUrl: newsLink || 'https://www.triamudomsouth.ac.th/'
    };
    const res = await fetch('/api/admin/pr', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prNewsList: [newItem, ...data.prContent.prNewsList] })
    });
    if ((await res.json()).ok) {
      setNewsTitle('');
      setNewsSummary('');
      showToast('เพิ่มข่าวประชาสัมพันธ์หน้าหลักแล้ว', { kind: 'success' });
      await loadData();
    }
  }

  async function handleDeleteNews(newsId: string) {
    if (!data) return;
    const nextList = data.prContent.prNewsList.filter(n => n.id !== newsId);
    const res = await fetch('/api/admin/pr', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prNewsList: nextList })
    });
    if ((await res.json()).ok) {
      showToast('ลบข่าวประชาสัมพันธ์เรียบร้อย', { kind: 'info' });
      await loadData();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <PortalHeader subtitle="กำลังโหลดระบบผู้ดูแล..." role="admin" />
        <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-5">
          <div className="h-24 skeleton" />
          <div className="h-72 skeleton" />
        </main>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <PortalHeader subtitle="ศูนย์ผู้ดูแลระบบ" role="admin" />
        <main className="max-w-xl w-full mx-auto px-4 py-12">
          <div className="tus-card p-8 text-center space-y-4 border-2 border-[var(--color-danger)]">
            <AlertCircle className="w-12 h-12 text-[var(--color-danger)] mx-auto" />
            <h2 className="font-heading font-bold text-xl">ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้</h2>
            <p className="text-sm text-[var(--text-secondary)]">สาเหตุ: {loadError}</p>
            <button type="button" onClick={loadData} className="btn-primary-3d">
              <RefreshCw className="w-5 h-5" /> ลองโหลดใหม่
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 3 หน้าต่างหลักที่กระชับสำหรับงานเบื้องหลังของแอดมิน
  const tabs = [
    {
      id: 'accounts' as const,
      label: 'รายชื่อ & รหัสผ่าน',
      full: `รายชื่อและรหัสผู้ใช้งาน (${data.students.length + data.users.length})`,
      icon: Users
    },
    {
      id: 'system' as const,
      label: 'ระบบ & DB',
      full: 'ฐานข้อมูล • Firebase • อีเมลแจ้งเตือน',
      icon: Database
    },
    {
      id: 'content' as const,
      label: 'ข่าว & Logs',
      full: 'ข่าวหน้าแรก & ประวัติระบบ (Logs)',
      icon: History
    }
  ];

  const activeRooms = data.classes.filter(c => !c.archived);

  return (
    <div className="min-h-screen flex flex-col pb-24 md:pb-14">
      <PortalHeader
        subtitle="ศูนย์จัดการเบื้องหลังและรหัสผู้ใช้งาน (Admin)"
        userName={data.user.nameTh}
        userMeta={`Admin: ${data.user.username || data.user.id}`}
        role="admin"
      />

      {/* Reset Student Password Modal */}
      {resetStudentTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setResetStudentTarget(null)}
        >
          <form
            onSubmit={handleResetStudentPassword}
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg">
                ตั้งรหัสผ่านใหม่: {resetStudentTarget.prefix}{resetStudentTarget.firstName} {resetStudentTarget.lastName}
              </h3>
              <button type="button" onClick={() => setResetStudentTarget(null)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              รหัสนักเรียน: <strong className="font-mono">{resetStudentTarget.studentId}</strong> • ห้อง{' '}
              <strong>{classMap.get(resetStudentTarget.classId)?.name || 'ยังไม่เข้าคลาส'}</strong>
            </p>
            <input
              type="text"
              required
              minLength={4}
              value={resetStudentPass}
              onChange={e => setResetStudentPass(e.target.value)}
              placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัว)"
              className="tus-input font-mono"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetStudentTarget(null)} className="btn-secondary-3d">
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary-3d">
                บันทึกรหัสผ่านใหม่
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Student Profile Modal (Admin) */}
      {editStudentTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="แก้ไขข้อมูลนักเรียน"
          className="fixed inset-0 z-[70] bg-black/55 flex items-center justify-center p-4"
          onClick={() => !savingStudentEdit && setEditStudentTarget(null)}
        >
          <form
            onSubmit={handleSaveStudentEdit}
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-lg w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-scale-pop"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading font-bold text-lg">แก้ไขข้อมูลนักเรียน</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  รหัสเดิม: <strong className="font-mono">{editStudentTarget.oldStudentId}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setEditStudentTarget(null)} className="p-1.5 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  รหัสนักเรียน *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={editStudentTarget.studentId}
                  onChange={e => setEditStudentTarget({ ...editStudentTarget, studentId: e.target.value })}
                  className="tus-input font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  เลขที่
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={99}
                  value={editStudentTarget.number}
                  onChange={e => setEditStudentTarget({ ...editStudentTarget, number: e.target.value })}
                  className="tus-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  คำนำหน้า
                </label>
                <select
                  value={editStudentTarget.prefix}
                  onChange={e => setEditStudentTarget({ ...editStudentTarget, prefix: e.target.value })}
                  className="tus-input"
                >
                  <option value="นาย">นาย</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="เด็กชาย">เด็กชาย</option>
                  <option value="เด็กหญิง">เด็กหญิง</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  ชื่อจริง *
                </label>
                <input
                  type="text"
                  required
                  value={editStudentTarget.firstName}
                  onChange={e => setEditStudentTarget({ ...editStudentTarget, firstName: e.target.value })}
                  className="tus-input"
                />
              </div>
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={editStudentTarget.lastName}
                  onChange={e => setEditStudentTarget({ ...editStudentTarget, lastName: e.target.value })}
                  className="tus-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                ห้องเรียน
              </label>
              <select
                value={editStudentTarget.classId}
                onChange={e => setEditStudentTarget({ ...editStudentTarget, classId: e.target.value })}
                className="tus-input"
              >
                <option value="">ยังไม่เข้าคลาส</option>
                {activeRooms.map(room => (
                  <option key={room.id} value={room.id}>
                    ห้อง {room.name} ({room.classCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={savingStudentEdit}
                onClick={() => setEditStudentTarget(null)}
                className="btn-secondary-3d"
              >
                ยกเลิก
              </button>
              <button type="submit" disabled={savingStudentEdit} className="btn-primary-3d">
                <CheckCircle2 className="w-4 h-4" />
                {savingStudentEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm DB Reset Modal */}
      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4"
          onClick={() => setConfirmResetOpen(false)}
        >
          <div
            className="tus-card max-w-md w-full p-6 space-y-4 border-2 border-[var(--color-danger)] animate-scale-pop"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-heading font-bold text-lg text-[var(--color-danger)]">ยืนยันการรีเซ็ตฐานข้อมูล</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              การรีเซ็ตจะล้างข้อมูลปัจจุบันทั้งหมดกลับเป็นข้อมูลเริ่มต้น กรุณา Backup JSON ก่อนหากต้องการเก็บข้อมูลเดิมไว้
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmResetOpen(false)} className="btn-secondary-3d">
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busyAction === 'reset_seed'}
                onClick={() => void handleDbAction('reset_seed')}
                className="btn-danger-3d"
              >
                ยืนยันรีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Desktop Top Tabs (3 หน้าต่างหลัก กระชับสำหรับแอดมินเบื้องหลัง) */}
        <nav className="hidden md:flex tus-card p-2 flex-wrap items-center justify-center gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-5 py-2 rounded-xl text-sm font-heading font-bold transition inline-flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.full}
              </button>
            );
          })}
        </nav>

        {/* Mobile Bottom Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 tus-bottom-nav pb-safe px-2 pt-1.5">
          <div className="grid grid-cols-3 gap-1.5">
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
                  className={`min-h-[48px] py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    active ? 'text-[var(--color-primary)] bg-[var(--color-primary-soft)] font-bold' : 'text-[var(--text-muted)]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-heading">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div key={activeTab} className="animate-fade-up">
          {/* ================================================================
              TAB 1: รายชื่อและรหัสผ่านผู้ใช้งานทั้งหมด (นักเรียนแยกห้อง + ครู + แอดมิน)
             ================================================================ */}
          {activeTab === 'accounts' && (
            <div className="space-y-5">
              {/* Top Switch: นักเรียนแยกห้อง vs ครู & แอดมิน */}
              <div className="tus-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountScope('students')}
                      className={`px-4 py-2.5 rounded-xl text-sm font-heading font-bold border-2 inline-flex items-center gap-2 cursor-pointer transition ${
                        accountScope === 'students'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      รายชื่อนักเรียนและรหัสผ่านแยกห้อง ({data.students.length} คน)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountScope('staff')}
                      className={`px-4 py-2.5 rounded-xl text-sm font-heading font-bold border-2 inline-flex items-center gap-2 cursor-pointer transition ${
                        accountScope === 'staff'
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      บัญชีครูและแอดมิน ({data.users.length} บัญชี)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPasswords(v => !v)}
                    className="btn-secondary-3d btn-compact-3d"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPasswords ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่านทั้งหมด'}
                  </button>
                </div>

                {accountScope === 'students' && (
                  <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                    {/* ปุ่มเลือกห้องเรียนดูรหัสนักเรียนแต่ละห้องได้ทันที */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedRoomId('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                          selectedRoomId === 'ALL'
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        ทุกห้อง ({data.students.length})
                      </button>
                      {activeRooms.map(room => {
                        const cnt = data.students.filter(s => s.classId === room.id).length;
                        return (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() => setSelectedRoomId(room.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                              selectedRoomId === room.id
                                ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]'
                                : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                            }`}
                          >
                            ห้อง {room.name} ({cnt}) • <span className="font-mono">{room.classCode}</span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setSelectedRoomId('UNASSIGNED')}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-heading font-bold border-2 cursor-pointer transition ${
                          selectedRoomId === 'UNASSIGNED'
                            ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface-muted)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        ยังไม่เข้าคลาส ({data.students.filter(s => !s.classId).length})
                      </button>
                    </div>

                    <div className="relative max-w-md">
                      <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={accountQuery}
                        onChange={e => setAccountQuery(e.target.value)}
                        placeholder="ค้นหารหัสนักเรียน ชื่อ-สกุล หรือห้อง..."
                        className="tus-input !pl-10"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Table: นักเรียนแยกห้องพร้อมรหัสผ่าน */}
              {accountScope === 'students' ? (
                <div className="tus-card p-5 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <th className="py-3 px-3">ห้อง</th>
                        <th className="py-3 px-3">เลขที่</th>
                        <th className="py-3 px-3">รหัสนักเรียน (Username)</th>
                        <th className="py-3 px-3">ชื่อ-สกุล</th>
                        <th className="py-3 px-3">รหัสผ่านปัจจุบัน</th>
                        <th className="py-3 px-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                            ไม่พบรายชื่อนักเรียนในห้องที่เลือก
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map(st => {
                          const passDisplay = st.plainPassword || '(ยังไม่ได้บันทึกรหัส — กดตั้งรหัสใหม่)';
                          return (
                            <tr key={st.studentId}>
                              <td className="py-3 px-3 font-bold text-[var(--color-primary)] whitespace-nowrap">
                                {classMap.get(st.classId)?.name || 'ยังไม่เข้าคลาส'}
                              </td>
                              <td className="py-3 px-3">{st.number}</td>
                              <td className="py-3 px-3 font-mono font-bold">{st.studentId}</td>
                              <td className="py-3 px-3 font-semibold whitespace-nowrap">
                                {st.prefix}{st.firstName} {st.lastName}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                {st.plainPassword ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-muted)] border border-[var(--border-strong)] font-mono font-bold text-[var(--text-primary)]">
                                    {showPasswords ? st.plainPassword : '••••••••'}
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await copyTextSafe(st.plainPassword || '');
                                        showToast(`คัดลอกรหัสผ่านของ ${st.studentId} แล้ว`, { kind: 'success' });
                                      }}
                                      className="text-[var(--color-primary)] hover:opacity-75 cursor-pointer"
                                      title="คัดลอกรหัสผ่าน"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </span>
                                ) : (
                                  <span className="text-xs text-[var(--text-muted)]">{passDisplay}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditStudentTarget({
                                        oldStudentId: st.studentId,
                                        studentId: st.studentId,
                                        prefix: st.prefix || 'นาย',
                                        firstName: st.firstName || '',
                                        lastName: st.lastName || '',
                                        number: String(st.number || 1),
                                        classId: st.classId || ''
                                      })
                                    }
                                    className="btn-secondary-3d btn-compact-3d"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> แก้ไข
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResetStudentTarget(st);
                                      setResetStudentPass(st.plainPassword || '1234');
                                    }}
                                    className="btn-secondary-3d btn-compact-3d"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" /> เปลี่ยนรหัส
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* View: บัญชีครูและแอดมินทั้งหมดพร้อมรหัสผ่าน */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  <form onSubmit={handleSaveStaff} className="lg:col-span-5 tus-card p-5 space-y-3">
                    <h3 className="font-heading font-bold text-lg flex items-center gap-1.5">
                      <Plus className="w-5 h-5 text-[var(--color-primary)]" /> เพิ่ม / แก้ไขบัญชีครู & แอดมิน
                    </h3>
                    <input
                      type="text"
                      required
                      value={staffUser}
                      onChange={e => setStaffUser(e.target.value)}
                      placeholder="Username (เช่น Puttanun / Apirom)"
                      className="tus-input font-mono"
                    />
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={e => setStaffName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล (เช่น ครูเนย์ พุฒินันท์)"
                      className="tus-input"
                    />
                    <input
                      type="email"
                      value={staffEmail}
                      onChange={e => setStaffEmail(e.target.value)}
                      placeholder="อีเมลแจ้งเตือนครู (ถ้ามี)"
                      className="tus-input font-mono text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <select
                        value={staffRole}
                        onChange={e => setStaffRole(e.target.value as 'teacher' | 'admin')}
                        className="tus-input"
                      >
                        <option value="teacher">ครูผู้สอน</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                      </select>
                      <input
                        type="text"
                        value={staffPass}
                        onChange={e => setStaffPass(e.target.value)}
                        placeholder="รหัสผ่าน (4+ ตัว)"
                        className="tus-input font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      value={staffPosition}
                      onChange={e => setStaffPosition(e.target.value)}
                      placeholder="ตำแหน่ง"
                      className="tus-input"
                    />
                    <button type="submit" className="w-full btn-primary-3d">
                      บันทึกบัญชีบุคลากร
                    </button>
                  </form>

                  <div className="lg:col-span-7 tus-card p-5 overflow-x-auto">
                    <h3 className="font-heading font-bold text-lg mb-3">บัญชีครูและผู้ดูแลระบบทั้งหมด</h3>
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                          <th className="py-2.5 px-2.5">Username</th>
                          <th className="py-2.5 px-2.5">ชื่อ / อีเมล</th>
                          <th className="py-2.5 px-2.5">รหัสผ่าน</th>
                          <th className="py-2.5 px-2.5 text-right">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {data.users.map(u => (
                          <tr key={u.id}>
                            <td className="py-3 px-2.5 whitespace-nowrap">
                              <div className="font-mono font-bold text-[var(--color-primary)]">{u.username}</div>
                              <div className="text-[11px] uppercase font-bold text-[var(--text-muted)]">{u.role}</div>
                            </td>
                            <td className="py-3 px-2.5">
                              <div className="font-semibold">{u.nameTh}</div>
                              {u.email && <div className="text-xs font-mono text-[var(--text-muted)]">{u.email}</div>}
                            </td>
                            <td className="py-3 px-2.5 whitespace-nowrap">
                              {u.plainPassword ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-muted)] border border-[var(--border-strong)] font-mono font-bold">
                                  {showPasswords ? u.plainPassword : '••••••••'}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await copyTextSafe(u.plainPassword || '');
                                      showToast(`คัดลอกรหัสผ่านของ ${u.username} แล้ว`, { kind: 'success' });
                                    }}
                                    className="text-[var(--color-primary)] cursor-pointer"
                                    title="คัดลอกรหัสผ่าน"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)]">ไม่ระบุ</span>
                              )}
                            </td>
                            <td className="py-3 px-2.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffUser(u.username);
                                  setStaffName(u.nameTh);
                                  setStaffEmail(u.email || '');
                                  setStaffRole(u.role);
                                  setStaffPosition(u.position || '');
                                  setStaffPass(u.plainPassword || '');
                                }}
                                className="btn-secondary-3d btn-compact-3d"
                              >
                                แก้ไข
                              </button>
                              {u.id !== data.user.id && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteStaff(u.id)}
                                  className="btn-danger-3d btn-compact-3d !px-2.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 2: ระบบ & ฐานข้อมูล (รวม DB + Firebase + Gemini + Email SMTP ไว้หน้าเดียว)
             ================================================================ */}
          {activeTab === 'system' && (
            <div className="space-y-5">
              {/* DB Status + Backup/Sync/Reset */}
              <div className="tus-card p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-heading font-bold px-3 py-1 rounded-xl border ${
                        data.stats.mode === 'firestore'
                          ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]'
                          : 'bg-[var(--color-gold-bg)] text-[var(--color-gold)] border-[var(--color-gold-border)]'
                      }`}
                    >
                      {data.stats.mode === 'firestore' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Firebase Firestore
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4" /> Local Dev DB
                        </>
                      )}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-[var(--bg-surface-muted)] font-semibold">
                      Gemini AI: {data.stats.geminiConfigured ? 'พร้อมใช้งาน ✓' : 'โหมดสำรอง'}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-[var(--bg-surface-muted)] font-semibold">
                      Email SMTP: {data.stats.smtpConfigured ? 'พร้อมส่งเมล ✓' : 'ยังไม่ตั้งค่า'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    นักเรียน {data.stats.collections.students} คน • ห้องเรียน {data.stats.collections.classes} ห้อง • รายงานปัญหา {data.stats.collections.teacher_messages || 0} รายการ
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a href="/api/admin/database" className="btn-secondary-3d btn-compact-3d">
                    <Download className="w-4 h-4" /> Backup JSON
                  </a>
                  <button
                    type="button"
                    disabled={!!busyAction}
                    onClick={() => void handleDbAction('seed_merge')}
                    className="btn-secondary-3d btn-compact-3d"
                  >
                    <RefreshCw className="w-4 h-4" /> ซิงค์ข้อมูล
                  </button>
                  <button
                    type="button"
                    disabled={!!busyAction}
                    onClick={() => setConfirmResetOpen(true)}
                    className="btn-danger-3d btn-compact-3d"
                  >
                    <RotateCcw className="w-4 h-4" /> รีเซ็ต DB
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Email SMTP Setup for Teacher Notifications */}
                <form onSubmit={handleSaveSmtp} className="lg:col-span-6 tus-card p-5 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[var(--color-primary)]" />
                    <h3 className="font-heading font-bold text-lg">ตั้งค่าส่งอีเมลแจ้งเตือนครูส่วนตัว (Gmail / SMTP)</h3>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    เมื่อนักเรียนส่งข้อความผ่านปุ่มลอย “ติดต่อครูเนย์ / ครูขวัญ” ระบบจะบันทึกขึ้นหน้าครูทันที และส่งอีเมลแจ้งเตือนอัตโนมัติไปยัง{' '}
                    <span className="font-mono">puttanun_noi@triamudomsouth.ac.th</span> และ{' '}
                    <span className="font-mono">apirom_kue@traimudomsouth.ac.th</span> (แนะนำใช้ Gmail + App Password)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={e => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="tus-input col-span-2 font-mono text-sm"
                    />
                    <input
                      type="text"
                      value={smtpPort}
                      onChange={e => setSmtpPort(e.target.value)}
                      placeholder="465"
                      className="tus-input font-mono text-sm"
                    />
                  </div>
                  <input
                    type="email"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="อีเมลผู้ส่ง เช่น school.notify@gmail.com"
                    className="tus-input font-mono text-sm"
                  />
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    placeholder="App Password 16 หลัก"
                    className="tus-input font-mono text-sm"
                  />
                  <button type="submit" disabled={connecting || !smtpUser.trim() || !smtpPass.trim()} className="w-full btn-primary-3d">
                    <Mail className="w-4 h-4" /> บันทึกค่าส่งอีเมลแจ้งเตือนครู
                  </button>
                </form>

                {/* Firebase + Gemini */}
                <div className="lg:col-span-6 space-y-5">
                  <form onSubmit={handleSaveGeminiKey} className="tus-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                      <h3 className="font-heading font-bold text-base">Google Gemini API Key</h3>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={e => setGeminiKeyInput(e.target.value)}
                        placeholder="วาง Gemini API Key"
                        className="tus-input font-mono text-sm"
                      />
                      <button type="submit" disabled={connecting || !geminiKeyInput.trim()} className="btn-secondary-3d shrink-0">
                        บันทึก
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleConnectFirebase} className="tus-card p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-[var(--color-primary)]" />
                      <h3 className="font-heading font-bold text-base">เชื่อมต่อ Firebase Firestore (Service Account JSON)</h3>
                    </div>
                    <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--bg-surface-muted)] hover:border-[var(--color-primary)] cursor-pointer text-xs font-heading font-bold text-[var(--color-primary)]">
                      <Upload className="w-4 h-4" /> เลือกไฟล์ Service Account JSON
                      <input type="file" accept=".json,application/json" onChange={handleJsonFilePick} className="hidden" />
                    </label>
                    <textarea
                      rows={3}
                      value={saJsonText}
                      onChange={e => setSaJsonText(e.target.value)}
                      placeholder="หรือวาง JSON ที่นี่..."
                      className="tus-input font-mono text-xs"
                    />
                    <button type="submit" disabled={connecting || !saJsonText.trim()} className="w-full btn-secondary-3d">
                      เชื่อมต่อ Firebase & ซิงค์ข้อมูล
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 3: ข่าวหน้าแรก & ประวัติระบบ (Audit Logs)
             ================================================================ */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <form onSubmit={handleSaveCourse} className="tus-card p-5 space-y-3">
                  <h3 className="font-heading font-bold text-lg">ข้อมูลรายวิชาหน้าแรก</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="รหัสวิชา" className="tus-input font-mono" />
                    <input type="text" value={semester} onChange={e => setSemester(e.target.value)} placeholder="ปีการศึกษา" className="tus-input" />
                  </div>
                  <input type="text" value={courseNameTh} onChange={e => setCourseNameTh(e.target.value)} placeholder="ชื่อรายวิชา" className="tus-input" />
                  <textarea rows={3} value={fullDesc} onChange={e => setFullDesc(e.target.value)} placeholder="คำอธิบายรายวิชา" className="tus-input" />
                  <button type="submit" className="w-full btn-primary-3d">บันทึกข้อมูลรายวิชา</button>
                </form>

                <div className="tus-card p-5 space-y-3">
                  <h3 className="font-heading font-bold text-lg">ข่าวประชาสัมพันธ์ ({data.prContent.prNewsList.length})</h3>
                  <form onSubmit={handleAddNews} className="space-y-2 p-3.5 rounded-2xl bg-[var(--bg-surface-muted)]">
                    <input type="text" required value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="หัวข้อข่าวใหม่" className="tus-input" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={newsCat} onChange={e => setNewsCat(e.target.value)} placeholder="หมวดหมู่" className="tus-input" />
                      <input type="url" value={newsLink} onChange={e => setNewsLink(e.target.value)} placeholder="ลิงก์" className="tus-input" />
                    </div>
                    <textarea rows={2} value={newsSummary} onChange={e => setNewsSummary(e.target.value)} placeholder="สรุปสั้นๆ" className="tus-input" />
                    <button type="submit" className="w-full btn-secondary-3d">+ เพิ่มข่าว</button>
                  </form>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {data.prContent.prNewsList.map(n => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-[var(--bg-surface-muted)] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-[var(--color-primary)]">{n.category}</span>
                          <div className="text-sm font-semibold truncate">{n.title}</div>
                        </div>
                        <button type="button" onClick={() => void handleDeleteNews(n.id)} className="btn-danger-3d btn-compact-3d !px-2.5 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tus-card p-5 space-y-3">
                <h3 className="font-heading font-bold text-lg">ประวัติการทำงานระบบล่าสุด (Audit Logs)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b-2 border-[var(--border-subtle)] text-[var(--text-secondary)]">
                        <th className="py-2.5 px-2.5">เวลา</th>
                        <th className="py-2.5 px-2.5">ผู้ดำเนินการ</th>
                        <th className="py-2.5 px-2.5">การกระทำ</th>
                        <th className="py-2.5 px-2.5">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {data.auditLogs.slice(0, 40).map(log => (
                        <tr key={log.id}>
                          <td className="py-2 px-2.5 font-mono text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('th-TH')}
                          </td>
                          <td className="py-2 px-2.5 font-semibold whitespace-nowrap">{log.actorName}</td>
                          <td className="py-2 px-2.5 font-mono text-xs font-bold text-[var(--color-primary)] whitespace-nowrap">
                            {log.action}
                          </td>
                          <td className="py-2 px-2.5 text-[var(--text-secondary)]">{log.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
