export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] p-2 emblem-breath flex items-center justify-center">
        <img src="/assets/logo_phrakiao.png?v=3" alt="ตราโรงเรียนเตรียมอุดมศึกษาภาคใต้" className="w-full h-full object-contain" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-heading font-bold text-[var(--color-primary)] text-base">
          กำลังโหลด TUS Classroom Plus...
        </p>
        <p className="text-sm text-[var(--text-secondary)]">โรงเรียนเตรียมอุดมศึกษาภาคใต้</p>
      </div>
    </div>
  );
}
