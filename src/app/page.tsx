'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Lock,
  User,
  UserPlus,
  LogIn,
  ArrowRight,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { PortalHeader } from '@/components/PortalHeader';
import { BannerCarousel } from '@/components/BannerCarousel';
import { Top5Leaderboard, type Top5Item } from '@/components/Top5Leaderboard';
import { useToast } from '@/components/ToastProvider';
import type { PrContentDoc, SessionUser } from '@/types/database';

export default function HomePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [prContent, setPrContent] = useState<PrContentDoc | null>(null);
  const [top5, setTop5] = useState<Top5Item[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  // Auth state
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginRole, setLoginRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Register state
  const [regId, setRegId] = useState('');
  const [regPrefix, setRegPrefix] = useState('นาย');
  const [regFirst, setRegFirst] = useState('');
  const [regLast, setRegLast] = useState('');
  const [regNumber, setRegNumber] = useState('1');
  const [regPass, setRegPass] = useState('');
  const [regClassCode, setRegClassCode] = useState('');

  const loadHome = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [homeRes, meRes] = await Promise.all([
        fetch('/api/public/home'),
        fetch('/api/auth/me')
      ]);
      if (!homeRes.ok) throw new Error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูลได้');
      const homeData = await homeRes.json();
      const meData = await meRes.json();
      if (!homeData.ok) throw new Error(homeData.message || 'โหลดข้อมูลหน้าแรกไม่สำเร็จ');

      setPrContent(homeData.prContent);
      setTop5(homeData.top5Leaderboard || []);
      if (meData.ok && meData.user) {
        setSessionUser(meData.user);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: loginRole, identifier, password })
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', { kind: 'error' });
        return;
      }
      showToast(`ยินดีต้อนรับ ${data.user.nameTh}`, { kind: 'success' });
      router.push(data.redirectTo || '/');
      router.refresh();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', { kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: regId,
          prefix: regPrefix,
          firstName: regFirst,
          lastName: regLast,
          number: Number(regNumber) || 1,
          password: regPass,
          classCode: regClassCode
        })
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.message || 'ไม่สามารถสมัครสมาชิกได้', { kind: 'error' });
        return;
      }
      showToast('สมัครสมาชิกเรียบร้อย กำลังเข้าสู่ห้องเรียน', { kind: 'success' });
      router.push('/student');
      router.refresh();
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', { kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const newsList = prContent?.prNewsList || [];
  const categories = ['ทั้งหมด', ...Array.from(new Set(newsList.map(n => n.category)))];
  const filteredNews =
    selectedCategory === 'ทั้งหมด'
      ? newsList
      : newsList.filter(n => n.category === selectedCategory);

  const resumeHref = sessionUser
    ? sessionUser.role === 'admin'
      ? '/admin'
      : sessionUser.role === 'teacher'
        ? '/teacher'
        : '/student'
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <PortalHeader
        subtitle="ระบบการจัดการชั้นเรียน โรงเรียนเตรียมอุดมศึกษาภาคใต้"
        rightSlot={
          resumeHref ? (
            <Link href={resumeHref} className="btn-primary-3d btn-compact-3d">
              <span>เข้าสู่ระบบของฉัน</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <a
              href="https://www.triamudomsouth.ac.th/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex btn-secondary-3d btn-compact-3d"
            >
              <Globe className="w-4 h-4" />
              <span>เว็บโรงเรียน</span>
            </a>
          )
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error State */}
        {loadError && (
          <div className="tus-card p-6 border-2 border-[var(--color-danger)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-[var(--color-danger)] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-heading font-bold text-base text-[var(--color-danger)]">
                  ไม่สามารถโหลดข้อมูลหน้าแรกได้
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  สาเหตุ: {loadError} — กรุณาตรวจสอบการเชื่อมต่อแล้วกดลองใหม่
                </p>
              </div>
            </div>
            <button type="button" onClick={loadHome} className="btn-secondary-3d btn-compact-3d">
              <RefreshCw className="w-4 h-4" /> ลองโหลดใหม่
            </button>
          </div>
        )}

        {/* 1. แบนเนอร์ประชาสัมพันธ์เต็มความกว้าง (21:9 บนคอม / 16:9 บนมือถือ, รูปไม่ขาด) */}
        <BannerCarousel banners={prContent?.prBanners || []} loading={loading} />

        {/* 2. เนื้อหาหลัก 2 คอลัมน์: ซ้าย (Top 5 + ข่าวโรงเรียน) / ขวา (ล็อกอิน & สมัครสมาชิก) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (7 cols) */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
            {/* ตารางอันดับ XP Top 5 */}
            <Top5Leaderboard items={top5} loading={loading} />

            {/* ข่าวสารโรงเรียน */}
            <section className="tus-card p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-[var(--text-primary)]">
                    ข่าวสารและแผนการเรียน โรงเรียนเตรียมอุดมศึกษาภาคใต้
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    ประกาศรับสมัคร กิจกรรม และข่าววิชาการล่าสุด
                  </p>
                </div>
                <a
                  href="https://www.triamudomsouth.ac.th/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary-3d btn-compact-3d"
                >
                  ดูทั้งหมด <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-56 skeleton" />
                  ))}
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[var(--bg-surface-muted)] text-[var(--text-secondary)]">
                  ยังไม่มีข่าวสารในหมวดหมู่นี้
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-heading font-semibold whitespace-nowrap shrink-0 border-2 transition cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredNews.map(news => (
                      <a
                        key={news.id}
                        href={news.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tus-card tus-card-hover overflow-hidden flex flex-col"
                      >
                        <div className="aspect-[16/10] bg-[var(--bg-surface-muted)] overflow-hidden">
                          <img
                            src={news.imageUrl}
                            alt={news.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 space-y-1.5 flex-1 flex flex-col">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-heading font-bold">
                              {news.category}
                            </span>
                            <span className="text-[var(--text-muted)]">{news.date}</span>
                          </div>
                          <h3 className="font-heading font-bold text-base text-[var(--text-primary)] leading-snug">
                            {news.title}
                          </h3>
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{news.summary}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (5 cols): Login & Register */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 order-1 lg:order-2">
            <section className="tus-card p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h2 className="font-heading font-bold text-xl text-[var(--text-primary)]">
                    เข้าสู่ระบบห้องเรียน
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">เลือกบทบาทเพื่อเริ่มใช้งาน</p>
                </div>

                <div className="flex bg-[var(--bg-surface-muted)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setAuthTab('login')}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-heading font-bold transition cursor-pointer ${
                      authTab === 'login'
                        ? 'bg-[var(--bg-surface)] text-[var(--color-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab('register')}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-heading font-bold transition cursor-pointer ${
                      authTab === 'register'
                        ? 'bg-[var(--bg-surface)] text-[var(--color-primary)] shadow-xs'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    สมัครนักเรียน
                  </button>
                </div>
              </div>

              {authTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="เลือกบทบาทผู้ใช้งาน">
                    {[
                      { id: 'student' as const, label: 'นักเรียน', icon: GraduationCap },
                      { id: 'teacher' as const, label: 'ครูผู้สอน', icon: BookOpen },
                      { id: 'admin' as const, label: 'ผู้ดูแลระบบ', icon: ShieldCheck }
                    ].map(r => {
                      const Icon = r.icon;
                      const isActive = loginRole === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => setLoginRole(r.id)}
                          className={`p-3 rounded-2xl border-2 text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                            isActive
                              ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-heading font-bold">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label htmlFor="login-id" className="block text-sm font-heading font-semibold text-[var(--text-primary)] mb-1.5">
                      {loginRole === 'student' ? 'รหัสนักเรียน' : 'ชื่อผู้ใช้ (Username)'}
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-id"
                        type="text"
                        required
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder={loginRole === 'student' ? 'กรอกรหัสนักเรียน' : 'กรอกชื่อผู้ใช้'}
                        className="tus-input !pl-11"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-pass" className="block text-sm font-heading font-semibold text-[var(--text-primary)] mb-1.5">
                      รหัสผ่าน
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-pass"
                        type={showPass ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="กรอกรหัสผ่าน"
                        className="tus-input !pl-11 !pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        aria-label={showPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--color-primary)] cursor-pointer"
                      >
                        {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* ปุ่มหลักสีเต็ม 1 ปุ่มเดียวในหน้านี้ */}
                  <button type="submit" disabled={submitting} className="w-full btn-primary-3d">
                    <LogIn className="w-5 h-5" />
                    {submitting ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-id" className="block text-sm font-heading font-semibold mb-1">
                        รหัสนักเรียน *
                      </label>
                      <input
                        id="reg-id"
                        type="text"
                        required
                        value={regId}
                        onChange={e => setRegId(e.target.value)}
                        placeholder="เช่น 6940310"
                        className="tus-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-num" className="block text-sm font-heading font-semibold mb-1">
                        เลขที่
                      </label>
                      <input
                        id="reg-num"
                        type="number"
                        min={1}
                        value={regNumber}
                        onChange={e => setRegNumber(e.target.value)}
                        className="tus-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label htmlFor="reg-prefix" className="block text-sm font-heading font-semibold mb-1">
                        คำนำหน้า
                      </label>
                      <select
                        id="reg-prefix"
                        value={regPrefix}
                        onChange={e => setRegPrefix(e.target.value)}
                        className="tus-input"
                      >
                        <option value="นาย">นาย</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="เด็กชาย">เด็กชาย</option>
                        <option value="เด็กหญิง">เด็กหญิง</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="reg-first" className="block text-sm font-heading font-semibold mb-1">
                        ชื่อ *
                      </label>
                      <input
                        id="reg-first"
                        type="text"
                        required
                        value={regFirst}
                        onChange={e => setRegFirst(e.target.value)}
                        className="tus-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-last" className="block text-sm font-heading font-semibold mb-1">
                        นามสกุล *
                      </label>
                      <input
                        id="reg-last"
                        type="text"
                        required
                        value={regLast}
                        onChange={e => setRegLast(e.target.value)}
                        className="tus-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-pass" className="block text-sm font-heading font-semibold mb-1">
                        ตั้งรหัสผ่าน *
                      </label>
                      <input
                        id="reg-pass"
                        type="password"
                        required
                        minLength={4}
                        value={regPass}
                        onChange={e => setRegPass(e.target.value)}
                        placeholder="อย่างน้อย 4 ตัว"
                        className="tus-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-code" className="block text-sm font-heading font-semibold mb-1">
                        รหัสคลาส (ถ้ามี)
                      </label>
                      <input
                        id="reg-code"
                        type="text"
                        value={regClassCode}
                        onChange={e => setRegClassCode(e.target.value.toUpperCase())}
                        placeholder="เช่น TUS-4A8K"
                        className="tus-input font-mono"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="w-full btn-primary-3d">
                    <UserPlus className="w-5 h-5" />
                    {submitting ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิกนักเรียน'}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="mt-10 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
          <div className="font-heading font-semibold text-[var(--text-primary)]">
            โรงเรียนเตรียมอุดมศึกษาภาคใต้ • ความเป็นเลิศทางคุณธรรมและวิชาการ
          </div>
          <div>TUS Classroom Plus</div>
        </div>
      </footer>
    </div>
  );
}
