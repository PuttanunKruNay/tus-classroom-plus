export function nowThaiString(): string {
  try {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString();
  }
}

export function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TUS-${suffix}`;
}

export function normalizeEmbedUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const u = String(rawUrl).trim();
  if (!u) return '';

  const driveMatch = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  const slideMatch = u.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch && !u.includes('/embed')) {
    return `https://docs.google.com/presentation/d/${slideMatch[1]}/embed?start=false&loop=false`;
  }

  if (u.includes('canva.com/design/') && !u.includes('embed')) {
    const base = u.split('?')[0].replace(/\/edit$/, '/view');
    return `${base}?embed`;
  }

  if (u.includes('docs.google.com/forms/') && !u.includes('embedded=true')) {
    return `${u}${u.includes('?') ? '&' : '?'}embedded=true`;
  }

  return u;
}

export function calculateGrade(percent: number): string {
  if (percent >= 80) return '4';
  if (percent >= 75) return '3.5';
  if (percent >= 70) return '3';
  if (percent >= 65) return '2.5';
  if (percent >= 60) return '2';
  if (percent >= 55) return '1.5';
  if (percent >= 50) return '1';
  return '0';
}

export function todayBangkokDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function isPublishedVisible(item: {
  publishStatus?: 'published' | 'scheduled' | 'draft';
  scheduledAt?: string;
}): boolean {
  const status = item.publishStatus || 'published';
  if (status === 'draft') return false;
  if (status === 'scheduled') {
    if (!item.scheduledAt) return false;
    const targetMs = Date.parse(item.scheduledAt);
    if (Number.isNaN(targetMs)) return false;
    return targetMs <= Date.now();
  }
  return true;
}

export async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
