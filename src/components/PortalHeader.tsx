'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Home, KeyRound, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { ThemeToggleButton } from '@/components/ThemeProvider';
import { useToast } from '@/components/ToastProvider';
import type { UserRole } from '@/types/database';

interface PortalHeaderProps {
  subtitle?: string;
  userName?: string;
  userMeta?: string;
  role?: UserRole;
  rightSlot?: React.ReactNode;
}

export function PortalHeader({
  subtitle = 'ระบบการจัดการชั้นเรียน โรงเรียนเตรียมอุดมศึกษาภาคใต้',
  userName,
  userMeta,
  role,
  rightSlot
}: PortalHeaderProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [passOpen, setPassOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร', { kind: 'error' });
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      showToast('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', { kind: 'error' });
      return;
    }
    setSavingPass(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        showToast(json.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', { kind: 'error' });
        return;
      }
      showToast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว! ใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไปได้เลย', {
        kind: 'success'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassOpen(false);
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', { kind: 'error' });
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 tus-header">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0 group">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] p-1 sm:p-1.5 flex items-center justify-center shrink-0 emblem-breath">
              <img src="/assets/logo_phrakiao.png?v=3" alt="ตราโรงเรียนเตรียมอุดมศึกษาภาคใต้" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-heading font-bold text-base sm:text-xl text-[var(--color-primary)] leading-tight truncate">
                TUS Classroom Plus
              </div>
              <p className="hidden sm:block text-xs sm:text-sm text-[var(--text-secondary)] truncate">{subtitle}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {role === 'admin' && (
              <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-surface-muted)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <Link
                  href="/admin"
                  className="text-sm px-3 py-1.5 rounded-lg font-heading font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
                >
                  แอดมิน
                </Link>
                <Link
                  href="/teacher"
                  className="text-sm px-3 py-1.5 rounded-lg font-heading font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition"
                >
                  ครูผู้สอน
                </Link>
              </div>
            )}

            {userName && (
              <div className="hidden lg:flex flex-col items-end pr-2.5 border-r border-[var(--border-subtle)]">
                <span className="text-sm font-heading font-bold text-[var(--text-primary)] leading-tight">
                  {userName}
                </span>
                {userMeta && <span className="text-xs text-[var(--text-muted)]">{userMeta}</span>}
              </div>
            )}

            {rightSlot}

            <ThemeToggleButton />

            {role && (
              <>
                <button
                  type="button"
                  onClick={() => setPassOpen(true)}
                  className="btn-secondary-3d btn-compact-3d !px-2.5 sm:!px-3"
                  aria-label="เปลี่ยนรหัสผ่าน"
                  title="เปลี่ยนรหัสผ่านของฉัน"
                >
                  <KeyRound className="w-4 h-4" />
                  <span className="hidden xl:inline">เปลี่ยนรหัส</span>
                </button>

                <Link
                  href="/"
                  className="btn-secondary-3d btn-compact-3d !px-2.5 sm:!px-3"
                  aria-label="กลับหน้าหลัก"
                  title="หน้าหลัก"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">หน้าหลัก</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-danger-3d btn-compact-3d !px-2.5 sm:!px-3"
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">ออก</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Modal เปลี่ยนรหัสผ่าน (ใช้ได้ทั้งนักเรียน ครู และแอดมิน) */}
      {passOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="เปลี่ยนรหัสผ่านของฉัน"
          className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !savingPass && setPassOpen(false)}
        >
          <form
            onSubmit={handleChangePassword}
            onClick={e => e.stopPropagation()}
            className="tus-card max-w-md w-full p-6 space-y-4 animate-scale-pop"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-[var(--text-primary)]">เปลี่ยนรหัสผ่านของฉัน</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{userName || 'บัญชีผู้ใช้งาน'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPassOpen(false)}
                className="p-2 rounded-xl hover:bg-[var(--bg-surface-muted)] cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  รหัสผ่านเดิม *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                  className="tus-input"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  รหัสผ่านใหม่ * (อย่างน้อย 4 ตัวอักษร)
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่"
                  className="tus-input"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-[var(--text-secondary)] mb-1">
                  ยืนยันรหัสผ่านใหม่ *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                  className="tus-input"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="text-xs font-heading font-semibold text-[var(--color-primary)] inline-flex items-center gap-1 cursor-pointer hover:underline"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่านที่พิมพ์'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={savingPass}
                onClick={() => setPassOpen(false)}
                className="btn-secondary-3d"
              >
                ยกเลิก
              </button>
              <button type="submit" disabled={savingPass} className="btn-primary-3d">
                <CheckCircle2 className="w-4 h-4" />
                {savingPass ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
