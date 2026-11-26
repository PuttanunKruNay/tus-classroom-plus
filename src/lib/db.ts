import fs from 'fs';
import path from 'path';
import { getAdminFirestore, getFirebaseProjectId, isFirestoreConfigured } from '@/lib/firebase-admin';
import { buildSeedBundle, type SeedBundle } from '@/lib/seed-data';
import { generateId } from '@/lib/utils';
import type {
  AdminStaffView,
  AdminStudentView,
  Assignment,
  AuditLog,
  ClassRoom,
  DatabaseStats,
  Lesson,
  PrContentDoc,
  PublicStaffUser,
  PublicStudent,
  QuizBankDoc,
  StaffUser,
  StreamComment,
  StreamPost,
  StudentRecord,
  SubmissionRecord,
  TeacherMessage,
  Topic,
  UserRole
} from '@/types/database';

const LOCAL_DB_PATH = path.join(process.cwd(), 'data', 'dev-db.json');

interface LocalStoreSchema {
  seeded: boolean;
  users: Record<string, StaffUser>;
  classes: Record<string, ClassRoom>;
  students: Record<string, StudentRecord>;
  topics: Record<string, Topic>;
  lessons: Record<string, Lesson>;
  assignments: Record<string, Assignment>;
  quizzes: Record<string, QuizBankDoc>;
  submissions: Record<string, SubmissionRecord>;
  announcements: Record<string, StreamPost>;
  teacher_messages: Record<string, TeacherMessage>;
  pr_content: Record<string, PrContentDoc>;
  audit_logs: Record<string, AuditLog>;
}

type CollectionName =
  | 'users'
  | 'classes'
  | 'students'
  | 'topics'
  | 'lessons'
  | 'assignments'
  | 'quizzes'
  | 'submissions'
  | 'announcements'
  | 'teacher_messages'
  | 'pr_content'
  | 'audit_logs';

let firestoreSeedChecked = false;
let localStoreCache: LocalStoreSchema | null = null;

// In-memory TTL Cache ลดการอ่าน Firestore ซ้ำลง 95–99% (ป้องกัน Quota 50,000 reads/วัน เต็ม)
const COLLECTION_TTL_MS: Partial<Record<CollectionName, number>> = {
  pr_content: 5 * 60 * 1000, // 5 นาที
  topics: 3 * 60 * 1000, // 3 นาที
  lessons: 3 * 60 * 1000, // 3 นาที
  assignments: 3 * 60 * 1000, // 3 นาที
  quizzes: 3 * 60 * 1000, // 3 นาที
  classes: 2 * 60 * 1000, // 2 นาที
  announcements: 45 * 1000, // 45 วินาที
  teacher_messages: 20 * 1000 // 20 วินาที
};

const collectionCache = new Map<string, { data: unknown; expiresAt: number }>();
const docCache = new Map<string, { data: unknown; expiresAt: number }>();
let quotaBlockedUntil = 0;

function assertQuotaNotBlocked() {
  if (quotaBlockedUntil > Date.now()) {
    const err = new Error('8 RESOURCE_EXHAUSTED: Quota exceeded (circuit breaker)');
    (err as unknown as { code: number }).code = 8;
    throw err;
  }
}

function noteFirestoreError(err: unknown) {
  if (isQuotaExceededError(err)) {
    // ตัดวงจรรอ gRPC retry 15 วินาทีซ้ำๆ ชั่วคราว 60 วินาที แล้วจะลองเชื่อมต่อให้อัตโนมัติใหม่
    quotaBlockedUntil = Date.now() + 60 * 1000;
  }
}

function invalidateCollectionCache(col: CollectionName, docId?: string) {
  collectionCache.delete(col);
  if (col === 'students') {
    collectionCache.delete('__top5_students__');
  }
  if (docId) {
    docCache.delete(`${col}::${docId}`);
  } else {
    for (const key of docCache.keys()) {
      if (key.startsWith(`${col}::`)) docCache.delete(key);
    }
  }
}

export function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: number | string; message?: string; details?: string };
  return (
    e.code === 8 ||
    e.code === 'RESOURCE_EXHAUSTED' ||
    String(e.message || '').includes('RESOURCE_EXHAUSTED') ||
    String(e.details || '').includes('Quota exceeded')
  );
}

function ensureLocalDir() {
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function bundleToLocalStore(bundle: SeedBundle): LocalStoreSchema {
  const toRecord = <T extends Record<string, unknown>>(arr: T[], keyField: keyof T): Record<string, T> => {
    const map: Record<string, T> = {};
    for (const item of arr) {
      map[String(item[keyField])] = item;
    }
    return map;
  };

  return {
    seeded: true,
    users: toRecord(bundle.users as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, StaffUser>,
    classes: toRecord(bundle.classes as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, ClassRoom>,
    students: toRecord(bundle.students as unknown as Record<string, unknown>[], 'studentId') as unknown as Record<string, StudentRecord>,
    topics: toRecord(bundle.topics as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, Topic>,
    lessons: toRecord(bundle.lessons as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, Lesson>,
    assignments: toRecord(bundle.assignments as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, Assignment>,
    quizzes: toRecord(bundle.quizzes as unknown as Record<string, unknown>[], 'assignmentId') as unknown as Record<string, QuizBankDoc>,
    submissions: toRecord(bundle.submissions as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, SubmissionRecord>,
    announcements: toRecord(bundle.announcements as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, StreamPost>,
    teacher_messages: {},
    pr_content: { main: bundle.prContent },
    audit_logs: toRecord(bundle.auditLogs as unknown as Record<string, unknown>[], 'id') as unknown as Record<string, AuditLog>
  };
}

async function readLocalStore(): Promise<LocalStoreSchema> {
  if (localStoreCache) return localStoreCache;
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as LocalStoreSchema;
      if (parsed && parsed.seeded && parsed.users && parsed.pr_content?.main) {
        if (!parsed.teacher_messages) parsed.teacher_messages = {};
        localStoreCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[LocalDB] Could not read dev-db.json, creating fresh seed:', err);
  }
  const bundle = await buildSeedBundle();
  const fresh = bundleToLocalStore(bundle);
  writeLocalStore(fresh);
  return fresh;
}

function writeLocalStore(store: LocalStoreSchema) {
  localStoreCache = store;
  try {
    ensureLocalDir();
    const tmpPath = `${LOCAL_DB_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmpPath, LOCAL_DB_PATH);
  } catch (err) {
    console.warn('[LocalDB] Unable to write local file (read-only filesystem?):', err);
  }
}

export function resetDbSeedFlag() {
  firestoreSeedChecked = false;
}

async function ensureInitialized(): Promise<void> {
  const fsDb = getAdminFirestore();
  if (!fsDb) {
    await readLocalStore();
    return;
  }

  if (firestoreSeedChecked) return;
  firestoreSeedChecked = true;
  try {
    const prSnap = await fsDb.collection('pr_content').doc('main').get();
    if (!prSnap.exists) {
      await seedDatabase(false);
    }
  } catch (err) {
    console.error('[Firestore] Error checking seed status:', err);
  }
}

// Generic low-level collection operations (พร้อม TTL Cache + Quota Circuit Breaker ไม่ให้หน่วง 15 วิ)
async function getAllDocs<T>(col: CollectionName): Promise<T[]> {
  await ensureInitialized();
  const fsDb = getAdminFirestore();
  if (fsDb) {
    const ttl = COLLECTION_TTL_MS[col];
    if (ttl) {
      const cached = collectionCache.get(col);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T[];
      }
    }
    assertQuotaNotBlocked();
    try {
      const snap = await fsDb.collection(col).get();
      const rows = snap.docs.map(d => d.data() as T);
      if (ttl) {
        collectionCache.set(col, { data: rows, expiresAt: Date.now() + ttl });
      }
      return rows;
    } catch (err) {
      noteFirestoreError(err);
      // ถ้าเคยมีแคชเดิมอยู่ ให้คืนแคชเก่าไปก่อนแทนที่จะล่ม
      const stale = collectionCache.get(col);
      if (stale) return stale.data as T[];
      throw err;
    }
  }
  const store = await readLocalStore();
  return Object.values(store[col]) as unknown as T[];
}

async function getDocById<T>(col: CollectionName, id: string): Promise<T | null> {
  await ensureInitialized();
  const fsDb = getAdminFirestore();
  if (fsDb) {
    const ttl = COLLECTION_TTL_MS[col];
    const cacheKey = `${col}::${id}`;
    if (ttl) {
      const cached = docCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T | null;
      }
    }
    assertQuotaNotBlocked();
    try {
      const snap = await fsDb.collection(col).doc(id).get();
      const val = snap.exists ? (snap.data() as T) : null;
      if (ttl) {
        docCache.set(cacheKey, { data: val, expiresAt: Date.now() + ttl });
      }
      return val;
    } catch (err) {
      noteFirestoreError(err);
      const stale = docCache.get(cacheKey);
      if (stale) return stale.data as T | null;
      throw err;
    }
  }
  const store = await readLocalStore();
  return ((store[col] as Record<string, unknown>)[id] as T) || null;
}

async function setDocById<T>(col: CollectionName, id: string, data: T): Promise<void> {
  await ensureInitialized();
  invalidateCollectionCache(col, id);
  const fsDb = getAdminFirestore();
  if (fsDb) {
    assertQuotaNotBlocked();
    try {
      await fsDb.collection(col).doc(id).set(data as FirebaseFirestore.DocumentData, { merge: false });
      return;
    } catch (err) {
      noteFirestoreError(err);
      throw err;
    }
  }
  const store = await readLocalStore();
  (store[col] as Record<string, unknown>)[id] = data;
  writeLocalStore(store);
}

async function deleteDocById(col: CollectionName, id: string): Promise<void> {
  await ensureInitialized();
  invalidateCollectionCache(col, id);
  const fsDb = getAdminFirestore();
  if (fsDb) {
    assertQuotaNotBlocked();
    try {
      await fsDb.collection(col).doc(id).delete();
      return;
    } catch (err) {
      noteFirestoreError(err);
      throw err;
    }
  }
  const store = await readLocalStore();
  delete (store[col] as Record<string, unknown>)[id];
  writeLocalStore(store);
}

// ============================================================================
// Sanitization Helpers (ไม่ส่ง passwordHash ออกไปยังฝั่ง Client เด็ดขาด)
// ============================================================================
export function sanitizeStaff(u: StaffUser): PublicStaffUser {
  const { passwordHash: _ignored, plainPassword: _ignoredPlain, ...rest } = u;
  void _ignored;
  void _ignoredPlain;
  return rest;
}

export function sanitizeStudent(s: StudentRecord): PublicStudent {
  const { passwordHash: _ignored, plainPassword: _ignoredPlain, ...rest } = s;
  void _ignored;
  void _ignoredPlain;
  return rest;
}

// ใช้เฉพาะหน้า Admin เท่านั้น (ไม่ส่ง passwordHash แต่ส่ง plainPassword เพื่อช่วยดูแลบัญชีผู้ใช้)
export function sanitizeStaffForAdmin(u: StaffUser): AdminStaffView {
  const { passwordHash: _ignored, ...rest } = u;
  void _ignored;
  return rest;
}

export function sanitizeStudentForAdmin(s: StudentRecord): AdminStudentView {
  const { passwordHash: _ignored, ...rest } = s;
  void _ignored;
  return rest;
}

// ============================================================================
// Seed & Reset (รองรับทั้ง Firestore Admin SDK และ Local Dev Store)
// ============================================================================
export async function seedDatabase(clearExisting = false): Promise<{ mode: 'firestore' | 'local-dev'; counts: Record<string, number> }> {
  const bundle = await buildSeedBundle();
  const fsDb = getAdminFirestore();

  if (fsDb) {
    const collections: CollectionName[] = [
      'users',
      'classes',
      'students',
      'topics',
      'lessons',
      'assignments',
      'quizzes',
      'submissions',
      'announcements',
      'teacher_messages',
      'pr_content',
      'audit_logs'
    ];

    if (clearExisting) {
      for (const col of collections) {
        const snap = await fsDb.collection(col).get();
        const batch = fsDb.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        if (!snap.empty) await batch.commit();
      }
    }

    const writeBatchItems = async <T>(col: CollectionName, items: { id: string; data: T }[]) => {
      const batch = fsDb.batch();
      for (const item of items) {
        batch.set(fsDb.collection(col).doc(item.id), item.data as FirebaseFirestore.DocumentData);
      }
      if (items.length > 0) await batch.commit();
    };

    await writeBatchItems('users', bundle.users.map(u => ({ id: u.id, data: u })));
    await writeBatchItems('classes', bundle.classes.map(c => ({ id: c.id, data: c })));
    await writeBatchItems('students', bundle.students.map(s => ({ id: s.studentId, data: s })));
    await writeBatchItems('topics', bundle.topics.map(t => ({ id: t.id, data: t })));
    await writeBatchItems('lessons', bundle.lessons.map(l => ({ id: l.id, data: l })));
    await writeBatchItems('assignments', bundle.assignments.map(a => ({ id: a.id, data: a })));
    await writeBatchItems('quizzes', bundle.quizzes.map(q => ({ id: q.assignmentId, data: q })));
    await writeBatchItems('submissions', bundle.submissions.map(s => ({ id: s.id, data: s })));
    await writeBatchItems('announcements', bundle.announcements.map(p => ({ id: p.id, data: p })));
    await writeBatchItems('pr_content', [{ id: 'main', data: bundle.prContent }]);
    await writeBatchItems('audit_logs', bundle.auditLogs.map(l => ({ id: l.id, data: l })));

    return {
      mode: 'firestore',
      counts: {
        users: bundle.users.length,
        classes: bundle.classes.length,
        students: bundle.students.length,
        lessons: bundle.lessons.length,
        assignments: bundle.assignments.length,
        submissions: bundle.submissions.length
      }
    };
  }

  const fresh = bundleToLocalStore(bundle);
  writeLocalStore(fresh);
  return {
    mode: 'local-dev',
    counts: {
      users: bundle.users.length,
      classes: bundle.classes.length,
      students: bundle.students.length,
      lessons: bundle.lessons.length,
      assignments: bundle.assignments.length,
      submissions: bundle.submissions.length
    }
  };
}

// ============================================================================
// Domain Repository API
// ============================================================================
export const db = {
  // --- Staff Users (Admin & Teacher) ---
  listStaffUsers: () => getAllDocs<StaffUser>('users'),
  getStaffByUsername: async (username: string): Promise<StaffUser | null> => {
    const clean = username.trim();
    const direct = await getDocById<StaffUser>('users', clean);
    if (direct) return direct;
    const all = await getAllDocs<StaffUser>('users');
    return all.find(u => u.username.toLowerCase() === clean.toLowerCase()) || null;
  },
  upsertStaffUser: (user: StaffUser) => setDocById('users', user.id, user),
  deleteStaffUser: (id: string) => deleteDocById('users', id),

  // --- Classes ---
  listClasses: async (): Promise<ClassRoom[]> => {
    const rows = await getAllDocs<ClassRoom>('classes');
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  },
  getClassById: (id: string) => getDocById<ClassRoom>('classes', id),
  getClassByCode: async (code: string): Promise<ClassRoom | null> => {
    const upper = code.trim().toUpperCase();
    const all = await getAllDocs<ClassRoom>('classes');
    return all.find(c => c.classCode.toUpperCase() === upper) || null;
  },
  upsertClass: (cls: ClassRoom) => setDocById('classes', cls.id, cls),
  deleteClass: (id: string) => deleteDocById('classes', id),

  // --- Students ---
  listStudents: async (): Promise<StudentRecord[]> => {
    const rows = await getAllDocs<StudentRecord>('students');
    return rows.sort((a, b) => a.classId.localeCompare(b.classId) || a.number - b.number);
  },
  // ดึงเฉพาะ Top 5 XP ด้วย Query + Cache 60 วินาที (แทนการอ่านนักเรียนทั้งโรงเรียนทุกครั้ง!)
  listTop5Students: async (): Promise<StudentRecord[]> => {
    await ensureInitialized();
    const fsDb = getAdminFirestore();
    if (fsDb) {
      const cached = collectionCache.get('__top5_students__');
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as StudentRecord[];
      }
      assertQuotaNotBlocked();
      try {
        const snap = await fsDb
          .collection('students')
          .where('gameXp', '>', 0)
          .orderBy('gameXp', 'desc')
          .limit(10)
          .get();
        const rows = snap.docs
          .map(d => d.data() as StudentRecord)
          .filter(s => Boolean(s.classId))
          .slice(0, 5);
        collectionCache.set('__top5_students__', { data: rows, expiresAt: Date.now() + 60 * 1000 });
        return rows;
      } catch (err) {
        noteFirestoreError(err);
        if (cached) return cached.data as StudentRecord[];
        throw err;
      }
    }
    const all = await getAllDocs<StudentRecord>('students');
    return all
      .filter(s => s.classId && (s.gameXp || 0) > 0)
      .sort((a, b) => b.gameXp - a.gameXp || b.gameBestScore - a.gameBestScore)
      .slice(0, 5);
  },
  getStudentById: (studentId: string) => getDocById<StudentRecord>('students', studentId.trim()),
  upsertStudent: (student: StudentRecord) => setDocById('students', student.studentId, student),
  deleteStudent: async (studentId: string) => {
    await deleteDocById('students', studentId);
    // Cascade delete student's submissions
    const allSubs = await getAllDocs<SubmissionRecord>('submissions');
    for (const sub of allSubs) {
      if (sub.studentId === studentId) {
        await deleteDocById('submissions', sub.id);
      }
    }
  },

  // --- Topics ---
  listTopics: async (): Promise<Topic[]> => {
    const rows = await getAllDocs<Topic>('topics');
    return rows.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  upsertTopic: (topic: Topic) => setDocById('topics', topic.id, topic),
  deleteTopic: (id: string) => deleteDocById('topics', id),

  // --- Lessons ---
  listLessons: async (): Promise<Lesson[]> => {
    const rows = await getAllDocs<Lesson>('lessons');
    return rows.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  getLessonById: (id: string) => getDocById<Lesson>('lessons', id),
  upsertLesson: (lesson: Lesson) => setDocById('lessons', lesson.id, lesson),
  deleteLesson: (id: string) => deleteDocById('lessons', id),

  // --- Assignments ---
  listAssignments: async (): Promise<Assignment[]> => {
    const rows = await getAllDocs<Assignment>('assignments');
    return rows.sort((a, b) => (a.order || 0) - (b.order || 0));
  },
  getAssignmentById: (id: string) => getDocById<Assignment>('assignments', id),
  upsertAssignment: (asg: Assignment) => setDocById('assignments', asg.id, asg),
  deleteAssignment: (id: string) => deleteDocById('assignments', id),

  // --- Quiz Banks ---
  listQuizzes: () => getAllDocs<QuizBankDoc>('quizzes'),
  getQuizByAssignmentId: (assignmentId: string) => getDocById<QuizBankDoc>('quizzes', assignmentId),
  upsertQuiz: (quiz: QuizBankDoc) => setDocById('quizzes', quiz.assignmentId, quiz),
  deleteQuiz: (assignmentId: string) => deleteDocById('quizzes', assignmentId),

  // --- Submissions & Scores ---
  listSubmissions: async (includeDeleted = false): Promise<SubmissionRecord[]> => {
    const all = await getAllDocs<SubmissionRecord>('submissions');
    return includeDeleted ? all : all.filter(s => !s.deletedAt);
  },
  listSubmissionsByStudent: async (studentId: string): Promise<SubmissionRecord[]> => {
    const fsDb = getAdminFirestore();
    if (fsDb) {
      await ensureInitialized();
      const snap = await fsDb.collection('submissions').where('studentId', '==', studentId).get();
      return snap.docs.map(d => d.data() as SubmissionRecord).filter(s => !s.deletedAt);
    }
    const all = await getAllDocs<SubmissionRecord>('submissions');
    return all.filter(s => s.studentId === studentId && !s.deletedAt);
  },
  getSubmissionById: (id: string) => getDocById<SubmissionRecord>('submissions', id),
  getSubmission: (studentId: string, assignmentId: string) =>
    getDocById<SubmissionRecord>('submissions', `${studentId}__${assignmentId}`),
  upsertSubmission: (sub: SubmissionRecord) => setDocById('submissions', sub.id, sub),
  deleteSubmission: (id: string) => deleteDocById('submissions', id),

  // --- Stream Announcements ---
  listAnnouncements: async (): Promise<StreamPost[]> => {
    const rows = await getAllDocs<StreamPost>('announcements');
    return rows.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.id.localeCompare(a.id));
  },
  getAnnouncementById: (id: string) => getDocById<StreamPost>('announcements', id),
  upsertAnnouncement: (post: StreamPost) => setDocById('announcements', post.id, post),
  addCommentToAnnouncement: async (postId: string, comment: StreamComment): Promise<StreamPost | null> => {
    const post = await getDocById<StreamPost>('announcements', postId);
    if (!post) return null;
    post.comments = [...(post.comments || []), comment];
    await setDocById('announcements', post.id, post);
    return post;
  },
  deleteAnnouncement: (id: string) => deleteDocById('announcements', id),

  // --- Teacher Messages (รายงานปัญหา / ติดต่อครูจากนักเรียน) ---
  listTeacherMessages: async (): Promise<TeacherMessage[]> => {
    const rows = await getAllDocs<TeacherMessage>('teacher_messages');
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getTeacherMessageById: (id: string) => getDocById<TeacherMessage>('teacher_messages', id),
  upsertTeacherMessage: (msg: TeacherMessage) => setDocById('teacher_messages', msg.id, msg),
  deleteTeacherMessage: (id: string) => deleteDocById('teacher_messages', id),

  // --- PR & Course Content ---
  getPrContent: async (): Promise<PrContentDoc> => {
    const doc = await getDocById<PrContentDoc>('pr_content', 'main');
    if (doc) return doc;
    const bundle = await buildSeedBundle();
    await setDocById('pr_content', 'main', bundle.prContent);
    return bundle.prContent;
  },
  updatePrContent: (doc: PrContentDoc) => setDocById('pr_content', 'main', doc),

  // --- Audit Logs (ใช้ orderBy + limit บน Firestore ไม่โหลดทั้งหมด!) ---
  listAuditLogs: async (limitCount = 50): Promise<AuditLog[]> => {
    await ensureInitialized();
    const fsDb = getAdminFirestore();
    if (fsDb) {
      const snap = await fsDb
        .collection('audit_logs')
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      return snap.docs.map(d => d.data() as AuditLog);
    }
    const rows = await getAllDocs<AuditLog>('audit_logs');
    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limitCount);
  },
  addAuditLog: async (entry: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    action: string;
    detail: string;
  }) => {
    const log: AuditLog = {
      id: generateId('LOG'),
      ...entry,
      createdAt: new Date().toISOString()
    };
    await setDocById('audit_logs', log.id, log);
    return log;
  },

  // --- Database Admin Stats & Backup (ใช้ count() aggregation บน Firestore ลด reads ลง 100 เท่า!) ---
  getStats: async (): Promise<DatabaseStats> => {
    const fsDb = getAdminFirestore();
    const connectedFirestore = Boolean(isFirestoreConfigured() && fsDb);
    const smtpConfigured = Boolean(
      (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) ||
        process.env.RESEND_API_KEY?.trim() ||
        process.env.EMAIL_WEBHOOK_URL?.trim()
    );

    if (connectedFirestore && fsDb) {
      const cols: CollectionName[] = [
        'users',
        'classes',
        'students',
        'topics',
        'lessons',
        'assignments',
        'quizzes',
        'submissions',
        'announcements',
        'teacher_messages',
        'audit_logs'
      ];
      const countsArr = await Promise.all(
        cols.map(async c => {
          const agg = await fsDb.collection(c).count().get();
          return agg.data().count;
        })
      );
      return {
        mode: 'firestore',
        projectId: getFirebaseProjectId(),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
        smtpConfigured,
        collections: {
          users: countsArr[0],
          classes: countsArr[1],
          students: countsArr[2],
          topics: countsArr[3],
          lessons: countsArr[4],
          assignments: countsArr[5],
          quizzes: countsArr[6],
          submissions: countsArr[7],
          announcements: countsArr[8],
          teacher_messages: countsArr[9],
          audit_logs: countsArr[10]
        }
      };
    }

    const [
      users,
      classes,
      students,
      topics,
      lessons,
      assignments,
      quizzes,
      submissions,
      announcements,
      teacherMessages,
      auditLogs
    ] = await Promise.all([
      getAllDocs<StaffUser>('users'),
      getAllDocs<ClassRoom>('classes'),
      getAllDocs<StudentRecord>('students'),
      getAllDocs<Topic>('topics'),
      getAllDocs<Lesson>('lessons'),
      getAllDocs<Assignment>('assignments'),
      getAllDocs<QuizBankDoc>('quizzes'),
      getAllDocs<SubmissionRecord>('submissions'),
      getAllDocs<StreamPost>('announcements'),
      getAllDocs<TeacherMessage>('teacher_messages'),
      getAllDocs<AuditLog>('audit_logs')
    ]);

    return {
      mode: 'local-dev',
      projectId: getFirebaseProjectId(),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      smtpConfigured,
      collections: {
        users: users.length,
        classes: classes.length,
        students: students.length,
        topics: topics.length,
        lessons: lessons.length,
        assignments: assignments.length,
        quizzes: quizzes.length,
        submissions: submissions.length,
        announcements: announcements.length,
        teacher_messages: teacherMessages.length,
        audit_logs: auditLogs.length
      }
    };
  },

  exportFullBackup: async () => {
    const [users, classes, students, topics, lessons, assignments, quizzes, submissions, announcements, prContent, auditLogs] =
      await Promise.all([
        getAllDocs<StaffUser>('users'),
        getAllDocs<ClassRoom>('classes'),
        getAllDocs<StudentRecord>('students'),
        getAllDocs<Topic>('topics'),
        getAllDocs<Lesson>('lessons'),
        getAllDocs<Assignment>('assignments'),
        getAllDocs<QuizBankDoc>('quizzes'),
        getAllDocs<SubmissionRecord>('submissions'),
        getAllDocs<StreamPost>('announcements'),
        getDocById<PrContentDoc>('pr_content', 'main'),
        getAllDocs<AuditLog>('audit_logs')
      ]);

    return {
      exportedAt: new Date().toISOString(),
      mode: isFirestoreConfigured() && getAdminFirestore() ? 'firestore' : 'local-dev',
      collections: {
        users: users.map(sanitizeStaff),
        classes,
        students: students.map(sanitizeStudent),
        topics,
        lessons,
        assignments,
        quizzes,
        submissions,
        announcements,
        prContent,
        auditLogs
      }
    };
  }
};
