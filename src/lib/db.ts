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

// Generic low-level collection operations
async function getAllDocs<T>(col: CollectionName): Promise<T[]> {
  await ensureInitialized();
  const fsDb = getAdminFirestore();
  if (fsDb) {
    const snap = await fsDb.collection(col).get();
    return snap.docs.map(d => d.data() as T);
  }
  const store = await readLocalStore();
  return Object.values(store[col]) as unknown as T[];
}

async function getDocById<T>(col: CollectionName, id: string): Promise<T | null> {
  await ensureInitialized();
  const fsDb = getAdminFirestore();
  if (fsDb) {
    const snap = await fsDb.collection(col).doc(id).get();
    return snap.exists ? (snap.data() as T) : null;
  }
  const store = await readLocalStore();
  return ((store[col] as Record<string, unknown>)[id] as T) || null;
}

async function setDocById<T>(col: CollectionName, id: string, data: T): Promise<void> {
  await ensureInitialized();
  const fsDb = getAdminFirestore();
  if (fsDb) {
    await fsDb.collection(col).doc(id).set(data as FirebaseFirestore.DocumentData, { merge: false });
    return;
  }
  const store = await readLocalStore();
  (store[col] as Record<string, unknown>)[id] = data;
  writeLocalStore(store);
}

async function deleteDocById(col: CollectionName, id: string): Promise<void> {
  await ensureInitialized();
  const fsDb = getAdminFirestore();
  if (fsDb) {
    await fsDb.collection(col).doc(id).delete();
    return;
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

  // --- Audit Logs ---
  listAuditLogs: async (limitCount = 50): Promise<AuditLog[]> => {
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

  // --- Database Admin Stats & Backup ---
  getStats: async (): Promise<DatabaseStats> => {
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

    const connectedFirestore = Boolean(isFirestoreConfigured() && getAdminFirestore());
    const smtpConfigured = Boolean(
      (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) ||
        process.env.RESEND_API_KEY?.trim() ||
        process.env.EMAIL_WEBHOOK_URL?.trim()
    );
    return {
      mode: connectedFirestore ? 'firestore' : 'local-dev',
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
