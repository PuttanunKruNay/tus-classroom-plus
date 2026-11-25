const CACHE_NAME = 'tus-classroom-v3';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/logo_phrakiao.png?v=3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // API และข้อมูลแบบเรียลไทม์ต้องดึงจากเซิร์ฟเวอร์เสมอ ไม่แคชข้อมูลคะแนน/ล็อกอิน
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack')) {
    return;
  }

  // รูปภาพและไฟล์ Static ใน /assets: Cache-first เพื่อโหลดไวบนมือถือ 4G/5G
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        cached =>
          cached ||
          fetch(request).then(res => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // หน้าเว็บทั่วไป: Network-first ถ้าเน็ตหลุดค่อยแสดงจากแคช
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then(r => r || caches.match('/')))
  );
});
