import {
  Certificate,
  Course,
  CourseFormData,
  Enrollment,
  EnrollmentStatus,
  Lesson,
  LessonProgress,
  Material,
  MaterialType,
  Module,
  NotificationItem,
  PaymentRequest,
  SupportRequest,
  SystemSettings,
  TeacherProfile,
  User,
  UserRole,
} from '../types';
import { looksLikeRemoteHtml, sanitizeHtml } from '../utils/htmlSanitizer';
import { buildCourseHash } from '../utils/courseLinks';

const STORAGE_KEY = 'ciideg_campus_store_v1';
const SESSION_KEY = 'ciideg_campus_session_v1';
const TOKEN_KEY = 'ciideg_campus_token_v1';
// Incrementar este número fuerza re-seed completo en todos los navegadores clientes.
const STORE_VERSION = 9;
const LATENCY_MS = 120;
const RATE_LIMIT_KEY = 'ciideg_campus_rate_limits_v1';
const MAX_AUTH_FAILURES = 5;
const AUTH_BLOCK_MS = 15 * 60 * 1000;
const DEMO_COURSE_IDS = new Set([
  'course-python',
  'course-react',
  'course-marketing',
  'course-ux',
  'course-ml',
  'course-agile',
]);

type StoredUser = User & { password: string };

interface CampusStore {
  users: StoredUser[];
  courses: Course[];
  enrollments: Enrollment[];
  lessonProgress: LessonProgress[];
  teacherProfiles: TeacherProfile[];
  notifications: NotificationItem[];
  certificates: Certificate[];
  paymentRequests: PaymentRequest[];
  supportRequests: SupportRequest[];
  systemSettings: SystemSettings;
}

let memoryStore: CampusStore | null = null;
let memorySession: string | null = null;
let memoryStoreVersion: number | null = null;

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const hasWindow = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const now = () => new Date().toISOString();
const isValidPeruPhone = (phone: string) => /^9\d{8}$/.test(phone.trim());
const getClientRateId = () => 'browser-client';
const remoteApiEnabled =
  Boolean(import.meta.env?.PROD) && import.meta.env?.VITE_USE_LOCAL_STORE !== 'true';
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';
const DEFAULT_DEMO_PASSWORD = '@26Gemses1';
const demoPassword = (key: string) =>
  import.meta.env?.DEV
    ? (import.meta.env?.[key] as string | undefined) || DEFAULT_DEMO_PASSWORD
    : makeId('disabled-password');

const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
};

const makeTemporaryPassword = () => `Tmp-${makeId('key').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}!`;

const makeAvatar = (name: string, background = '0D1117') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${background.replace('#', '')}&color=ffffff&bold=true`;

const readRateLimits = (): Record<string, { failures: number; blockedUntil?: number }> => {
  if (!hasWindow()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(RATE_LIMIT_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeRateLimits = (limits: Record<string, { failures: number; blockedUntil?: number }>) => {
  if (hasWindow()) {
    window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(limits));
  }
};

const assertAuthNotBlocked = () => {
  const limits = readRateLimits();
  const entry = limits[getClientRateId()];
  if (entry?.blockedUntil && entry.blockedUntil > Date.now()) {
    throw new Error('Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.');
  }
};

const registerAuthFailure = () => {
  const limits = readRateLimits();
  const key = getClientRateId();
  const failures = (limits[key]?.failures || 0) + 1;
  const blocked = failures >= MAX_AUTH_FAILURES;
  limits[key] = {
    failures,
    blockedUntil: blocked ? Date.now() + AUTH_BLOCK_MS : undefined,
  };
  writeRateLimits(limits);
  return blocked;
};

const clearAuthFailures = () => {
  const limits = readRateLimits();
  delete limits[getClientRateId()];
  writeRateLimits(limits);
};

const publicUser = (user: StoredUser): User => {
  const { password: _password, ...rest } = user;
  return clone(rest);
};

const setSessionUserId = (userId: string | null) => {
  memorySession = userId;

  if (!hasWindow()) {
    return;
  }

  if (userId) {
    window.localStorage.setItem(SESSION_KEY, userId);
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
};

const getSessionUserId = () => {
  if (hasWindow()) {
    return window.localStorage.getItem(SESSION_KEY);
  }

  return memorySession;
};

const setAuthToken = (token: string | null) => {
  if (!hasWindow()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
};

const getAuthToken = () => (hasWindow() ? window.localStorage.getItem(TOKEN_KEY) : null);

const readRawStore = (): CampusStore | null => {
  if (hasWindow()) {
    const versionRaw = window.localStorage.getItem(STORAGE_KEY + '_ver');
    const storedVersion = versionRaw ? parseInt(versionRaw, 10) : 0;

    // Si la versión del store guardado es distinta, limpiar y re-seedear
    if (storedVersion !== STORE_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.setItem(STORAGE_KEY + '_ver', String(STORE_VERSION));
      return null;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CampusStore;
    } catch {
      return null;
    }
  }

  if (memoryStoreVersion !== STORE_VERSION) {
    memoryStore = null;
    memoryStoreVersion = STORE_VERSION;
  }

  return memoryStore ? clone(memoryStore) : null;
};

const writeRawStore = (store: CampusStore) => {
  const normalized = clone(store);

  if (hasWindow()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.localStorage.setItem(STORAGE_KEY + '_ver', String(STORE_VERSION));
  } else {
    memoryStore = normalized;
    memoryStoreVersion = STORE_VERSION;
  }
};

// El catalogo se inicializa sin cursos demo; los cursos se crean desde los paneles.

const getCourseLessons = (course: Course) => course.modules.flatMap((module) => module.lessons);

const apiUrl = (path: string) => `${API_BASE_URL.replace(/\/$/, '')}/${path}`;

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = getAuthToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') || text.trim().startsWith('<')) {
        throw new Error(
          response.status === 413
            ? 'Las imagenes son demasiado pesadas. Usa imagenes mas livianas o vuelve a intentar.'
            : 'El servidor devolvio una respuesta no valida. Intenta nuevamente.',
        );
      }
      throw new Error('El servidor devolvio una respuesta no valida. Intenta nuevamente.');
    }
  }
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'No se pudo completar la operacion.');
  }

  return payload as T;
};

const sanitizeMaterialPayload = <T extends { type: MaterialType; url: string }>(material: T): T => {
  if (material.type !== MaterialType.HTML || looksLikeRemoteHtml(material.url)) {
    return material;
  }

  return {
    ...material,
    url: sanitizeHtml(material.url),
  };
};

const toBool = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 't' || value === 'true';

const mapRemoteUser = (raw: any): User => ({
  id: String(raw.id),
  fullName: raw.fullName ?? raw.full_name ?? '',
  email: raw.email ?? '',
  phone: raw.phone ?? '',
  role: raw.role,
  avatar: raw.avatar || makeAvatar(raw.fullName ?? raw.full_name ?? 'Usuario'),
  mustChangePassword: toBool(raw.mustChangePassword ?? raw.must_change_password),
  bio: raw.bio,
  specialization: raw.specialization,
  experience: raw.experience,
  createdAt: raw.createdAt ?? raw.created_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
});

const mapRemoteMaterial = (raw: any): Material => ({
  id: String(raw.id),
  lessonId: raw.lessonId ? String(raw.lessonId) : raw.lesson_id ? String(raw.lesson_id) : undefined,
  title: raw.title ?? '',
  type: raw.type ?? MaterialType.LINK,
  url: raw.url ?? '',
  createdAt: raw.createdAt ?? raw.created_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
});

const mapRemoteLesson = (raw: any): Lesson => ({
  id: String(raw.id),
  moduleId: raw.moduleId ? String(raw.moduleId) : raw.module_id ? String(raw.module_id) : undefined,
  title: raw.title ?? '',
  duration: raw.duration ?? '',
  youtubeId: raw.youtubeId ?? raw.youtube_id ?? '',
  isCompleted: toBool(raw.isCompleted ?? raw.is_completed),
  sortOrder: raw.sortOrder ?? raw.sort_order,
  summary: raw.summary,
  materials: (raw.materials ?? []).map(mapRemoteMaterial),
  createdAt: raw.createdAt ?? raw.created_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
});

const mapRemoteModule = (raw: any): Module => ({
  id: String(raw.id),
  courseId: raw.courseId ? String(raw.courseId) : raw.course_id ? String(raw.course_id) : undefined,
  title: raw.title ?? '',
  sortOrder: raw.sortOrder ?? raw.sort_order,
  description: raw.description,
  lessons: (raw.lessons ?? []).map(mapRemoteLesson),
  createdAt: raw.createdAt ?? raw.created_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
});

const mapRemoteCourse = (raw: any): Course => ({
  id: String(raw.id),
  title: raw.title ?? '',
  description: raw.description ?? '',
  coverImage: raw.coverImage ?? raw.cover_image ?? '',
  posterImage: raw.posterImage ?? raw.poster_image ?? '',
  price: Number(raw.price || 0),
  duration: raw.duration ?? '',
  level: raw.level ?? 'Principiante',
  category: raw.category ?? '',
  instructor: raw.instructor ?? raw.instructor_name ?? '',
  instructorId:
    raw.instructorId !== undefined
      ? String(raw.instructorId)
      : raw.instructor_id !== undefined && raw.instructor_id !== null
        ? String(raw.instructor_id)
        : undefined,
  rating: Number(raw.rating || 0),
  modules: (raw.modules ?? []).map(mapRemoteModule),
  isFeatured: toBool(raw.isFeatured ?? raw.is_featured),
  enrolledStudents: Number(raw.enrolledStudents ?? raw.enrolled_students ?? 0),
  createdAt: raw.createdAt ?? raw.created_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
});

const mapRemoteEnrollment = (raw: any): Enrollment => ({
  id: raw.id !== undefined ? String(raw.id) : undefined,
  userId: raw.userId ? String(raw.userId) : String(raw.user_id),
  courseId: raw.courseId ? String(raw.courseId) : String(raw.course_id),
  status: raw.status,
  progress: Number(raw.progress || 0),
  enrolledAt: raw.enrolledAt ?? raw.enrolled_at,
  updatedAt: raw.updatedAt ?? raw.updated_at,
  course: raw.course
    ? mapRemoteCourse(raw.course)
    : raw.course_title
      ? ({
          id: raw.courseId ? String(raw.courseId) : String(raw.course_id),
          title: raw.course_title,
          coverImage: raw.cover_image ?? '',
          posterImage: raw.poster_image ?? raw.cover_image ?? '',
          description: '',
          price: 0,
          duration: '',
          level: 'Principiante',
          category: raw.category ?? '',
          instructor: '',
          rating: 0,
          modules: [],
        } as Course)
      : undefined,
});

const mapRemotePaymentRequest = (raw: any): PaymentRequest => ({
  id: String(raw.id),
  userId: raw.userId ? String(raw.userId) : String(raw.user_id),
  courseId: raw.courseId ? String(raw.courseId) : String(raw.course_id),
  userName: raw.userName ?? raw.user_name ?? '',
  userEmail: raw.userEmail ?? raw.user_email ?? '',
  courseTitle: raw.courseTitle ?? raw.course_title ?? '',
  amount: Number(raw.amount || 0),
  voucherImage: raw.voucherImage ?? raw.voucher_image ?? '',
  paymentDate: raw.paymentDate ?? raw.payment_date,
  submittedAt: raw.submittedAt ?? raw.submitted_at,
  status: raw.status,
  gestorNote: raw.gestorNote ?? raw.gestor_note,
});

const coursePayload = (courseData: CourseFormData) => ({
  title: courseData.title,
  description: courseData.description,
  cover_image: courseData.coverImage,
  poster_image: courseData.posterImage,
  price: courseData.price,
  duration: courseData.duration,
  level: courseData.level,
  category: courseData.category,
  instructor: courseData.instructor,
  instructor_id: courseData.instructorId,
  is_featured: courseData.isFeatured,
});

const pushNotification = (
  store: CampusStore,
  userId: string,
  title: string,
  message: string,
  type: NotificationItem['type'] = 'info',
) => {
  store.notifications.unshift({
    id: makeId('notification'),
    userId,
    title,
    message,
    type,
    isRead: false,
    createdAt: now(),
  });
};

const syncDerivedData = (store: CampusStore) => {
  const next = clone(store);

  next.courses = next.courses.map((course) => ({
    ...course,
    enrolledStudents: next.enrollments.filter((enrollment) => enrollment.courseId === course.id).length,
  }));

  next.enrollments = next.enrollments.map((enrollment) => {
    const course = next.courses.find((item) => item.id === enrollment.courseId);

    if (!course) {
      return enrollment;
    }

    const lessons = getCourseLessons(course);
    const totalLessons = lessons.length;
    const completedLessons = next.lessonProgress.filter(
      (progress) =>
        progress.userId === enrollment.userId &&
        lessons.some((lesson) => lesson.id === progress.lessonId) &&
        progress.isCompleted,
    ).length;

    const progress = totalLessons === 0 ? enrollment.progress : Math.round((completedLessons / totalLessons) * 100);
    const status =
      enrollment.status === EnrollmentStatus.PENDING ||
      enrollment.status === EnrollmentStatus.PENDING_PAYMENT ||
      enrollment.status === EnrollmentStatus.LOCKED ||
      enrollment.status === EnrollmentStatus.EXPIRED
        ? enrollment.status
        : progress >= 100
          ? EnrollmentStatus.COMPLETED
          : EnrollmentStatus.ACTIVE;

    return {
      ...enrollment,
      progress,
      status,
      updatedAt: now(),
    };
  });

  for (const enrollment of next.enrollments) {
    if (enrollment.status !== EnrollmentStatus.COMPLETED) {
      continue;
    }

    const course = next.courses.find((item) => item.id === enrollment.courseId);
    if (!course) {
      continue;
    }

    const certificateExists = next.certificates.some(
      (certificate) => certificate.userId === enrollment.userId && certificate.courseId === enrollment.courseId,
    );

    if (!certificateExists) {
      next.certificates.push({
        id: makeId('certificate'),
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        courseTitle: course.title,
        issuedAt: now(),
        code: `CERT-${course.id.toUpperCase()}-${enrollment.userId.toUpperCase().slice(-6)}`,
      });

      pushNotification(
        next,
        enrollment.userId,
        'Curso completado',
        `Has completado "${course.title}" y tu certificado ya esta disponible.`,
        'success',
      );
    }
  }

  return next;
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  logoUrl: '',
  campusName: 'Campus Virtual CIIDEG',
  primaryColor: '#003F6F',
  secondaryColor: '#075B98',
  accentColor: '#38BDF8',
  currency: 'S/.',
  currencyCode: 'PEN',
  paymentInstructions:
    'Realiza tu pago mediante Yape o transferencia bancaria a los datos indicados a continuación.',
  yapeNumber: '979722218',
  yapeName: 'Elisa Marisol Tafur',
  bankName: 'BCP',
  bankAccount: '191-70736804-0-15',
  bankCci: '00219117073680401559',
  bankHolder: 'Elisa Marisol Tafur Mendoza',
  bankDni: '40322144',
};

const seedStore = (): CampusStore => {
  const courses: Course[] = [];

  const store: CampusStore = {
    users: [
      {
        id: 'user-admin',
        fullName: 'Admin Principal',
        email: 'admin@ciideg.edu.pe',
        phone: '936220771',
        password: demoPassword('VITE_DEMO_ADMIN_PASSWORD'),
        role: UserRole.ADMIN,
        avatar: 'https://ui-avatars.com/api/?name=Admin+Principal&background=random',
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'user-gestor',
        fullName: 'Gestor CIIDEG',
        email: 'gestor@ciideg.edu.pe',
        phone: '936220771',
        password: demoPassword('VITE_DEMO_GESTOR_PASSWORD'),
        role: UserRole.GESTOR,
        avatar: 'https://ui-avatars.com/api/?name=Gestor+CIIDEG&background=random',
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'user-teacher-tech',
        fullName: 'Docente CIIDEG',
        email: 'docente@ciideg.edu.pe',
        phone: '936220771',
        password: demoPassword('VITE_DEMO_DOCENTE_PASSWORD'),
        role: UserRole.DOCENTE,
        avatar: 'https://ui-avatars.com/api/?name=Docente+CIIDEG&background=random',
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: 'user-student',
        fullName: 'Alumno CIIDEG',
        email: 'alumno@ciideg.edu.pe',
        phone: '936220771',
        password: demoPassword('VITE_DEMO_STUDENT_PASSWORD'),
        role: UserRole.ALUMNO,
        avatar: 'https://ui-avatars.com/api/?name=Alumno+CIIDEG&background=random',
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    courses,
    enrollments: [],
    lessonProgress: [],
    teacherProfiles: [],
    notifications: [],
    certificates: [],
    paymentRequests: [],
    supportRequests: [],
    systemSettings: { ...DEFAULT_SYSTEM_SETTINGS },
  };

  return syncDerivedData(store);
};

const SEED_USER_IDS = ['user-admin', 'user-gestor', 'user-teacher-tech', 'user-student'] as const;

/**
 * Lee el store. Si no existe o la versión es diferente, re-seedea.
 * Migra stores antiguos que no tienen paymentRequests/systemSettings.
 */
const readStore = () => {
  const raw = readRawStore();

  if (!raw) {
    const initialStore = seedStore();
    writeRawStore(initialStore);
    return initialStore;
  }

  const store = syncDerivedData(raw);
  const seed = seedStore();
  let dirty = false;

  const courseCountBeforeCleanup = store.courses.length;
  store.courses = store.courses.filter((course) => !DEMO_COURSE_IDS.has(course.id));
  if (store.courses.length !== courseCountBeforeCleanup) {
    const validCourseIds = new Set(store.courses.map((course) => course.id));
    store.enrollments = store.enrollments.filter((enrollment) => validCourseIds.has(enrollment.courseId));
    store.certificates = store.certificates.filter((certificate) => validCourseIds.has(certificate.courseId));
    const validLessonIds = new Set(
      store.courses.flatMap((course) =>
        course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)),
      ),
    );
    store.lessonProgress = store.lessonProgress.filter((progress) => validLessonIds.has(progress.lessonId));
    dirty = true;
  }

  // Reinsertar usuarios del seed si faltan
  for (const seedUser of seed.users) {
    const exists = store.users.some((u) => u.id === seedUser.id);
    if (!exists) {
      store.users.push(seedUser);
      dirty = true;
    }
  }

  // Migrar campos nuevos del store si no existen
  if (!store.paymentRequests) {
    (store as CampusStore).paymentRequests = [];
    dirty = true;
  }
  if (!store.supportRequests) {
    (store as CampusStore).supportRequests = [];
    dirty = true;
  }
  if (!store.systemSettings) {
    (store as CampusStore).systemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
    dirty = true;
  }
  for (const user of store.users) {
    if (!user.phone) {
      user.phone = user.id === 'user-admin' || user.id === 'user-gestor' ? '936220771' : '900000000';
      dirty = true;
    }
    if (typeof user.mustChangePassword !== 'boolean') {
      user.mustChangePassword = false;
      dirty = true;
    }
  }

  if (dirty) {
    writeRawStore(store);
  }

  return store;
};

const writeStore = (store: CampusStore) => {
  const normalized = syncDerivedData(store);
  writeRawStore(normalized);
  return normalized;
};

const updateStore = (updater: (store: CampusStore) => CampusStore | void) => {
  const current = readStore();
  const draft = clone(current);
  const maybeNext = updater(draft);
  return writeStore(maybeNext ?? draft);
};

const normalizeModules = (courseId: string, modules: Module[]): Module[] =>
  modules.map((module, moduleIndex) => {
    const moduleId = module.id || makeId('module');

    return {
      ...module,
      id: moduleId,
      courseId,
      sortOrder: moduleIndex + 1,
      lessons: module.lessons.map((lesson, lessonIndex) => {
        const lessonId = lesson.id || makeId('lesson');

        return {
          ...lesson,
          id: lessonId,
          moduleId,
          sortOrder: lessonIndex + 1,
          materials: (lesson.materials ?? []).map((material) => ({
            ...sanitizeMaterialPayload(material),
            id: material.id || makeId('material'),
            lessonId,
            updatedAt: now(),
            createdAt: material.createdAt ?? now(),
          })),
          updatedAt: now(),
          createdAt: lesson.createdAt ?? now(),
        };
      }),
      updatedAt: now(),
      createdAt: module.createdAt ?? now(),
    };
  });

const getCourseProgress = (store: CampusStore, userId: string, courseId: string) => {
  const enrollment = store.enrollments.find(
    (item) => item.userId === userId && item.courseId === courseId,
  );
  return enrollment?.progress ?? 0;
};

export const api = {
  loginWithCredentials: async (email: string, password: string): Promise<User> => {
    await wait();
    assertAuthNotBlocked();
    if (remoteApiEnabled) {
      try {
        const response = await requestJson<{ user: any; token?: string }>('login.php', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        const user = mapRemoteUser(response.user);
        clearAuthFailures();
        setSessionUserId(user.id);
        setAuthToken(response.token ?? null);
        return user;
      } catch (error) {
        registerAuthFailure();
        throw error;
      }
    }

    const store = readStore();
    const normalizedEmail = email.trim().toLowerCase();

    const user = store.users.find(
      (item) => item.email.toLowerCase() === normalizedEmail && item.password === password,
    );

    if (!user) {
      if (registerAuthFailure()) {
        throw new Error('Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.');
      }
      throw new Error('Correo o contrasena invalidos.');
    }

    clearAuthFailures();
    setSessionUserId(user.id);
    return publicUser(user);
  },

  register: async (userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    honeypot?: string;
    formStartedAt?: number;
  }): Promise<User> => {
    await wait();
    assertAuthNotBlocked();

    if (userData.honeypot?.trim()) {
      throw new Error('No fue posible crear la cuenta.');
    }

    if (!userData.formStartedAt || Date.now() - userData.formStartedAt < 4000) {
      if (registerAuthFailure()) {
        throw new Error('Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.');
      }
      throw new Error('El registro fue enviado demasiado rapido. Intenta nuevamente.');
    }

    if (!isValidPeruPhone(userData.phone)) {
      if (registerAuthFailure()) {
        throw new Error('Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.');
      }
      throw new Error('Ingresa un telefono peruano valido de 9 digitos.');
    }

    if (remoteApiEnabled) {
      const response = await requestJson<{ user: any; token?: string }>('register.php', {
        method: 'POST',
        body: JSON.stringify({
          full_name: userData.fullName,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
          website: userData.honeypot || '',
          form_started_at: userData.formStartedAt,
        }),
      });
      const user = mapRemoteUser(response.user);
      clearAuthFailures();
      setSessionUserId(user.id);
      setAuthToken(response.token ?? null);
      return user;
    }

    const store = updateStore((draft) => {
      const normalizedEmail = userData.email.trim().toLowerCase();

      if (draft.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
        throw new Error('Ya existe una cuenta con ese correo.');
      }

      const newUser: StoredUser = {
        id: makeId('user'),
        fullName: userData.fullName.trim(),
        email: normalizedEmail,
        phone: userData.phone.trim(),
        password: userData.password,
        role: userData.role,
        avatar: makeAvatar(userData.fullName),
        mustChangePassword: false,
        createdAt: now(),
        updatedAt: now(),
      };

      draft.users.push(newUser);

      if (newUser.role === UserRole.DOCENTE || newUser.role === UserRole.GESTOR) {
        draft.teacherProfiles.push({
          id: makeId('teacher-profile'),
          userId: newUser.id,
          bio: '',
          specialization: '',
          experience: '',
          socialLinks: {},
          createdAt: now(),
          updatedAt: now(),
        });
      }

      pushNotification(
        draft,
        newUser.id,
        'Cuenta creada',
        'Tu perfil esta listo. Ya puedes empezar a usar el campus.',
        'success',
      );
      pushNotification(
        draft,
        'user-admin',
        'Nuevo registro',
        `${newUser.fullName} acaba de registrarse como ${newUser.role.toLowerCase()}.`,
        'info',
      );
    });

    const newUser = store.users[store.users.length - 1];
    clearAuthFailures();
    setSessionUserId(newUser.id);
    return publicUser(newUser);
  },

  getCurrentSessionUser: async (): Promise<User | null> => {
    await wait(40);
    const sessionUserId = getSessionUserId();
    if (!sessionUserId) {
      return null;
    }

    if (remoteApiEnabled) {
      try {
        return mapRemoteUser(await requestJson<any>('users.php?action=me'));
      } catch {
        setSessionUserId(null);
        setAuthToken(null);
        return null;
      }
    }

    const store = readStore();
    const user = store.users.find((item) => item.id === sessionUserId);
    return user ? publicUser(user) : null;
  },

  logout: async (): Promise<void> => {
    await wait(40);
    setSessionUserId(null);
    setAuthToken(null);
  },

  getUsers: async (): Promise<User[]> => {
    await wait();
    if (remoteApiEnabled) {
      const users = await requestJson<any[]>('users.php');
      return users.map(mapRemoteUser);
    }
    return readStore().users.map(publicUser).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  getUserById: async (id: string): Promise<User> => {
    await wait();
    if (remoteApiEnabled) {
      const users = await api.getUsers();
      const user = users.find((item) => item.id === id);
      if (!user) {
        throw new Error('Usuario no encontrado.');
      }
      return user;
    }

    const user = readStore().users.find((item) => item.id === id);
    if (!user) {
      throw new Error('Usuario no encontrado.');
    }

    return publicUser(user);
  },

  createUser: async (payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role: UserRole;
  }): Promise<User> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('users.php', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const users = await api.getUsers();
      const created = users.find((user) => user.email.toLowerCase() === payload.email.trim().toLowerCase());
      if (!created) throw new Error('Usuario creado, pero no se pudo recargar.');
      return created;
    }

    const store = updateStore((draft) => {
      const normalizedEmail = payload.email.trim().toLowerCase();

      if (draft.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
        throw new Error('El correo ya esta registrado.');
      }

      if (payload.password.length < 6) {
        throw new Error('La contrasena debe tener al menos 6 caracteres.');
      }
      if (payload.phone && !isValidPeruPhone(payload.phone)) {
        throw new Error('Ingresa un telefono peruano valido de 9 digitos.');
      }

      const createdUser: StoredUser = {
        id: makeId('user'),
        fullName: payload.fullName.trim(),
        email: normalizedEmail,
        phone: payload.phone?.trim() || '900000000',
        password: payload.password,
        role: payload.role,
        avatar: makeAvatar(payload.fullName),
        mustChangePassword: false,
        createdAt: now(),
        updatedAt: now(),
      };

      draft.users.push(createdUser);

      if (createdUser.role === UserRole.DOCENTE || createdUser.role === UserRole.GESTOR) {
        draft.teacherProfiles.push({
          id: makeId('teacher-profile'),
          userId: createdUser.id,
          bio: '',
          specialization: '',
          experience: '',
          socialLinks: {},
          createdAt: now(),
          updatedAt: now(),
        });
      }
    });

    return publicUser(store.users[store.users.length - 1]);
  },

  updateUser: async (
    id: string,
    userData: Partial<User> & { password?: string },
  ): Promise<User> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson(`users.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
      return api.getUserById(id);
    }

    const store = updateStore((draft) => {
      const user = draft.users.find((item) => item.id === id);
      if (!user) {
        throw new Error('Usuario no encontrado.');
      }

      if (userData.email) {
        const normalizedEmail = userData.email.trim().toLowerCase();
        const duplicated = draft.users.find(
          (item) => item.id !== id && item.email.toLowerCase() === normalizedEmail,
        );

        if (duplicated) {
          throw new Error('Ese correo ya pertenece a otro usuario.');
        }

        user.email = normalizedEmail;
      }

      user.fullName = userData.fullName?.trim() || user.fullName;
      if (userData.phone !== undefined) {
        if (!isValidPeruPhone(userData.phone)) {
          throw new Error('Ingresa un telefono peruano valido de 9 digitos.');
        }
        user.phone = userData.phone.trim();
      }
      user.role = userData.role || user.role;
      user.avatar = userData.avatar || user.avatar;
      user.bio = userData.bio ?? user.bio;
      user.specialization = userData.specialization ?? user.specialization;
      user.experience = userData.experience ?? user.experience;
      user.password = userData.password || user.password;
      if (userData.password) {
        user.mustChangePassword = userData.mustChangePassword ?? user.mustChangePassword;
      }
      if (typeof userData.mustChangePassword === 'boolean') {
        user.mustChangePassword = userData.mustChangePassword;
      }
      user.updatedAt = now();

      const profile = draft.teacherProfiles.find((item) => item.userId === id);
      if ((user.role === UserRole.DOCENTE || user.role === UserRole.GESTOR) && !profile) {
        draft.teacherProfiles.push({
          id: makeId('teacher-profile'),
          userId: id,
          bio: user.bio || '',
          specialization: user.specialization || '',
          experience: user.experience || '',
          socialLinks: {},
          createdAt: now(),
          updatedAt: now(),
        });
      }

      if (user.role !== UserRole.DOCENTE && user.role !== UserRole.GESTOR) {
        draft.teacherProfiles = draft.teacherProfiles.filter((item) => item.userId !== id);
      }
    });

    const updatedUser = store.users.find((item) => item.id === id);
    if (!updatedUser) {
      throw new Error('Usuario no encontrado.');
    }

    return publicUser(updatedUser);
  },

  deleteUser: async (id: string): Promise<void> => {
    await wait();

    updateStore((draft) => {
      if (id === 'user-admin') {
        throw new Error('No es posible eliminar al administrador principal.');
      }

      draft.users = draft.users.filter((user) => user.id !== id);
      draft.teacherProfiles = draft.teacherProfiles.filter((profile) => profile.userId !== id);
      draft.enrollments = draft.enrollments.filter((enrollment) => enrollment.userId !== id);
      draft.lessonProgress = draft.lessonProgress.filter((progress) => progress.userId !== id);
      draft.notifications = draft.notifications.filter((notification) => notification.userId !== id);
      draft.certificates = draft.certificates.filter((certificate) => certificate.userId !== id);
    });

    if (getSessionUserId() === id) {
      setSessionUserId(null);
    }
  },

  resetStudentPassword: async (userId: string, temporaryPassword = makeTemporaryPassword()): Promise<string> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('users.php?action=reset-password', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, temporary_password: temporaryPassword }),
      });
      return temporaryPassword;
    }

    updateStore((draft) => {
      const user = draft.users.find((item) => item.id === userId && item.role === UserRole.ALUMNO);
      if (!user) {
        throw new Error('Alumno no encontrado.');
      }
      user.password = temporaryPassword;
      user.mustChangePassword = true;
      user.updatedAt = now();
      pushNotification(
        draft,
        user.id,
        'Contrasena restablecida',
        `Ingresa con la clave temporal ${temporaryPassword} y cambia tu contrasena al acceder.`,
        'warning',
      );
    });
    return temporaryPassword;
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<User> => {
    await wait();
    if (newPassword.length < 6) {
      throw new Error('La nueva contrasena debe tener al menos 6 caracteres.');
    }

    if (remoteApiEnabled) {
      await requestJson('users.php?action=change-password', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      return api.getUserById(userId);
    }

    const store = updateStore((draft) => {
      const user = draft.users.find((item) => item.id === userId);
      if (!user) {
        throw new Error('Usuario no encontrado.');
      }
      if (user.password !== currentPassword) {
        throw new Error('La contrasena actual no es correcta.');
      }
      user.password = newPassword;
      user.mustChangePassword = false;
      user.updatedAt = now();
    });

    const user = store.users.find((item) => item.id === userId);
    if (!user) throw new Error('Usuario no encontrado.');
    return publicUser(user);
  },

  getCourses: async (): Promise<Course[]> => {
    await wait();
    if (remoteApiEnabled) {
      const courses = await requestJson<any[]>('courses.php');
      return courses.map(mapRemoteCourse).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }
    return readStore().courses.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  getCourse: async (id: string): Promise<Course> => {
    await wait();
    if (remoteApiEnabled) {
      return mapRemoteCourse(await requestJson<any>(`courses.php?id=${encodeURIComponent(id)}`));
    }

    const course = readStore().courses.find((item) => item.id === id);
    if (!course) {
      throw new Error('Curso no encontrado.');
    }

    return clone(course);
  },

  getCoursesByInstructor: async (instructorId: string): Promise<Course[]> => {
    await wait();
    if (remoteApiEnabled) {
      const courses = await api.getCourses();
      return courses.filter((course) => course.instructorId === instructorId);
    }
    return readStore().courses.filter((course) => course.instructorId === instructorId);
  },

  getCoursesByCategory: async (category: string, excludeId?: string): Promise<Course[]> => {
    await wait();
    if (remoteApiEnabled) {
      const courses = await api.getCourses();
      return courses.filter((course) => course.category === category && course.id !== excludeId);
    }
    return readStore().courses.filter(
      (course) => course.category === category && course.id !== excludeId,
    );
  },

  getFeaturedCourses: async (): Promise<Course[]> => {
    await wait();
    if (remoteApiEnabled) {
      return (await api.getCourses()).filter((course) => course.isFeatured);
    }
    return readStore().courses.filter((course) => course.isFeatured);
  },

  createCourse: async (courseData: CourseFormData): Promise<Course> => {
    await wait();
    if (remoteApiEnabled) {
      const response = await requestJson<{ course_id?: string; id?: string }>('courses.php', {
        method: 'POST',
        body: JSON.stringify(coursePayload(courseData)),
      });
      const id = response.course_id ?? response.id;
      if (!id) {
        const courses = await api.getCourses();
        return courses[0];
      }
      return api.getCourse(String(id));
    }

    const store = updateStore((draft) => {
      if (courseData.isFeatured) {
        draft.courses.forEach((course) => {
          course.isFeatured = false;
        });
      }

      const newCourse: Course = {
        id: makeId('course'),
        title: courseData.title.trim(),
        description: courseData.description.trim(),
        coverImage: courseData.coverImage.trim(),
        posterImage: courseData.posterImage.trim(),
        price: Number(courseData.price || 0),
        duration: courseData.duration.trim(),
        level: courseData.level,
        category: courseData.category.trim(),
        instructor: courseData.instructor.trim(),
        instructorId: courseData.instructorId,
        rating: 0,
        modules: [],
        isFeatured: courseData.isFeatured,
        enrolledStudents: 0,
        createdAt: now(),
        updatedAt: now(),
      };

      draft.courses.unshift(newCourse);

      pushNotification(
        draft,
        'user-admin',
        'Nuevo curso publicado',
        `${newCourse.instructor} creo el curso "${newCourse.title}".`,
        'info',
      );
    });

    return clone(store.courses[0]);
  },

  updateCourse: async (id: string, courseData: CourseFormData): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson(`courses.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(coursePayload(courseData)),
      });
      return;
    }

    updateStore((draft) => {
      const course = draft.courses.find((item) => item.id === id);
      if (!course) {
        throw new Error('Curso no encontrado.');
      }

      course.title = courseData.title.trim();
      course.description = courseData.description.trim();
      course.coverImage = courseData.coverImage.trim();
      course.posterImage = courseData.posterImage.trim();
      course.price = Number(courseData.price || 0);
      course.duration = courseData.duration.trim();
      course.level = courseData.level;
      course.category = courseData.category.trim();
      course.instructor = courseData.instructor.trim();
      course.instructorId = courseData.instructorId;
      course.isFeatured = courseData.isFeatured;
      if (courseData.isFeatured) {
        draft.courses.forEach((item) => {
          if (item.id !== id) {
            item.isFeatured = false;
          }
        });
      }
      course.updatedAt = now();
    });
  },

  updateCourseModules: async (id: string, modules: Module[]): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson(`courses.php?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ modules }),
      });
      return;
    }

    updateStore((draft) => {
      const course = draft.courses.find((item) => item.id === id);
      if (!course) {
        throw new Error('Curso no encontrado.');
      }

      course.modules = normalizeModules(id, modules);
      course.updatedAt = now();
    });
  },
  deleteCourse: async (id: string): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson(`courses.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }

    updateStore((draft) => {
      draft.courses = draft.courses.filter((course) => course.id !== id);
      draft.enrollments = draft.enrollments.filter((enrollment) => enrollment.courseId !== id);
      draft.certificates = draft.certificates.filter((certificate) => certificate.courseId !== id);

      const lessonIds = draft.courses
        .flatMap((course) => course.modules)
        .flatMap((module) => module.lessons)
        .map((lesson) => lesson.id);
      draft.lessonProgress = draft.lessonProgress.filter((progress) => lessonIds.includes(progress.lessonId));
    });
  },

  getEnrollments: async (userId: string): Promise<Enrollment[]> => {
    await wait();
    if (remoteApiEnabled) {
      const enrollments = await requestJson<any[]>(`enrollments.php?user_id=${encodeURIComponent(userId)}`);
      const courses = await api.getCourses();
      return enrollments.map((enrollment) => {
        const mapped = mapRemoteEnrollment(enrollment);
        return {
          ...mapped,
          course: courses.find((course) => course.id === mapped.courseId) ?? mapped.course,
        };
      });
    }

    const store = readStore();
    return store.enrollments
      .filter((enrollment) => enrollment.userId === userId)
      .map((enrollment) => ({
        ...enrollment,
        course: store.courses.find((course) => course.id === enrollment.courseId),
      }));
  },

  getAllEnrollments: async (): Promise<Enrollment[]> => {
    await wait();
    if (remoteApiEnabled) {
      const enrollments = await requestJson<any[]>('enrollments.php');
      const courses = await api.getCourses();
      return enrollments.map((enrollment) => {
        const mapped = mapRemoteEnrollment(enrollment);
        return {
          ...mapped,
          course: courses.find((course) => course.id === mapped.courseId) ?? mapped.course,
        };
      });
    }

    const store = readStore();
    return store.enrollments.map((enrollment) => ({
      ...enrollment,
      course: store.courses.find((course) => course.id === enrollment.courseId),
    }));
  },

  enroll: async (userId: string, courseId: string): Promise<Enrollment> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('enrollments.php', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, course_id: courseId }),
      });
      const enrollments = await api.getEnrollments(userId);
      const enrollment = enrollments.find((item) => item.courseId === courseId);
      if (!enrollment) {
        throw new Error('No fue posible crear la inscripcion.');
      }
      return enrollment;
    }

    const store = updateStore((draft) => {
      const course = draft.courses.find((item) => item.id === courseId);
      const user = draft.users.find((item) => item.id === userId);

      if (!course || !user) {
        throw new Error('No fue posible registrar la inscripcion.');
      }

      const existing = draft.enrollments.find(
        (enrollment) => enrollment.userId === userId && enrollment.courseId === courseId,
      );

      if (existing) {
        return draft;
      }

      draft.enrollments.push({
        id: makeId('enrollment'),
        userId,
        courseId,
        status: EnrollmentStatus.PENDING,
        progress: 0,
        enrolledAt: now(),
        updatedAt: now(),
      });

      pushNotification(
        draft,
        userId,
        'Solicitud enviada',
        `Tu acceso a "${course.title}" quedo pendiente de aprobacion.`,
        'info',
      );

      for (const manager of draft.users.filter((item) => item.role === UserRole.ADMIN || item.role === UserRole.GESTOR)) {
        pushNotification(
          draft,
          manager.id,
          'Nueva solicitud de acceso',
          `${user.fullName} solicito acceso a "${course.title}".`,
          'info',
        );
      }
    });

    const enrollment = store.enrollments.find(
      (item) => item.userId === userId && item.courseId === courseId,
    );

    if (!enrollment) {
      throw new Error('No fue posible crear la inscripcion.');
    }

    return clone(enrollment);
  },

  updateEnrollmentStatus: async (
    enrollmentId: string,
    status: EnrollmentStatus,
  ): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson(`enrollments.php?id=${encodeURIComponent(enrollmentId)}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return;
    }

    updateStore((draft) => {
      const enrollment = draft.enrollments.find((item) => item.id === enrollmentId);
      if (!enrollment) {
        throw new Error('Inscripcion no encontrada.');
      }
      enrollment.status = status;
      enrollment.updatedAt = now();
      const course = draft.courses.find((item) => item.id === enrollment.courseId);
      pushNotification(
        draft,
        enrollment.userId,
        status === EnrollmentStatus.ACTIVE ? 'Acceso aprobado' : 'Acceso actualizado',
        status === EnrollmentStatus.ACTIVE
          ? `Ya puedes acceder a "${course?.title || 'tu curso'}".`
          : `El estado de tu solicitud para "${course?.title || 'tu curso'}" fue actualizado.`,
        status === EnrollmentStatus.ACTIVE ? 'success' : 'info',
      );
    });
  },

  getEnrollment: async (userId: string, courseId: string): Promise<Enrollment> => {
    await wait();
    if (remoteApiEnabled) {
      const enrollment = (await api.getEnrollments(userId)).find((item) => item.courseId === courseId);
      if (!enrollment) {
        throw new Error('Inscripcion no encontrada.');
      }
      return enrollment;
    }

    const enrollment = readStore().enrollments.find(
      (item) => item.userId === userId && item.courseId === courseId,
    );

    if (!enrollment) {
      throw new Error('Inscripcion no encontrada.');
    }

    return clone(enrollment);
  },

  updateEnrollmentProgress: async (
    userId: string,
    courseId: string,
    progress: number,
  ): Promise<void> => {
    await wait();

    updateStore((draft) => {
      const enrollment = draft.enrollments.find(
        (item) => item.userId === userId && item.courseId === courseId,
      );

      if (!enrollment) {
        throw new Error('Inscripcion no encontrada.');
      }

      enrollment.progress = Math.max(0, Math.min(100, Math.round(progress)));
      enrollment.status =
        enrollment.progress >= 100 ? EnrollmentStatus.COMPLETED : EnrollmentStatus.ACTIVE;
      enrollment.updatedAt = now();
    });
  },

  getLessonProgress: async (userId: string, lessonId: string): Promise<LessonProgress> => {
    await wait(50);
    const progress = readStore().lessonProgress.find(
      (item) => item.userId === userId && item.lessonId === lessonId,
    );

    if (progress) {
      return clone(progress);
    }

    return {
      id: makeId('lesson-progress'),
      userId,
      lessonId,
      isCompleted: false,
      watchedSeconds: 0,
    };
  },

  getLessonProgressForCourse: async (
    userId: string,
    courseId: string,
  ): Promise<LessonProgress[]> => {
    await wait(50);
    if (remoteApiEnabled) {
      const progress = await requestJson<any[]>(
        `progress.php?user_id=${encodeURIComponent(userId)}&course_id=${encodeURIComponent(courseId)}`,
      );
      return progress.map((item) => ({
        id: String(item.id),
        userId: String(item.user_id ?? item.userId),
        lessonId: String(item.lesson_id ?? item.lessonId),
        isCompleted: toBool(item.is_completed ?? item.isCompleted),
        watchedSeconds: Number(item.watched_seconds ?? item.watchedSeconds ?? 0),
        lastWatchedAt: item.last_watched_at ?? item.lastWatchedAt,
      }));
    }

    const course = readStore().courses.find((item) => item.id === courseId);
    if (!course) {
      return [];
    }

    const lessonIds = getCourseLessons(course).map((lesson) => lesson.id);
    return readStore().lessonProgress.filter(
      (item) => item.userId === userId && lessonIds.includes(item.lessonId),
    );
  },

  updateProgress: async (
    userId: string,
    lessonId: string,
    isCompleted: boolean,
    watchedSeconds = 0,
  ): Promise<void> => {
    await wait(60);
    if (remoteApiEnabled) {
      await requestJson('progress.php', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          lesson_id: lessonId,
          is_completed: isCompleted,
          watched_seconds: watchedSeconds,
        }),
      });
      return;
    }

    updateStore((draft) => {
      const existing = draft.lessonProgress.find(
        (item) => item.userId === userId && item.lessonId === lessonId,
      );

      if (existing) {
        existing.isCompleted = isCompleted;
        existing.watchedSeconds = watchedSeconds;
        existing.lastWatchedAt = now();
      } else {
        draft.lessonProgress.push({
          id: makeId('lesson-progress'),
          userId,
          lessonId,
          isCompleted,
          watchedSeconds,
          lastWatchedAt: now(),
        });
      }
    });
  },

  getTeacherProfile: async (userId: string): Promise<TeacherProfile | null> => {
    await wait();
    if (remoteApiEnabled) {
      try {
        const response = await requestJson<any>(`teacher_profiles.php?user_id=${encodeURIComponent(userId)}`);
        const raw = response.profile ?? response;
        return {
          id: String(raw.id ?? raw.user_id ?? userId),
          userId: String(raw.user_id ?? userId),
          bio: raw.bio ?? '',
          specialization: raw.specialization ?? '',
          experience: raw.experience ?? '',
          socialLinks: {
            linkedin: raw.linkedin_url ?? '',
            twitter: raw.twitter_url ?? '',
            website: raw.website_url ?? '',
          },
        };
      } catch {
        return null;
      }
    }

    const profile = readStore().teacherProfiles.find((item) => item.userId === userId);
    return profile ? clone(profile) : null;
  },

  updateTeacherProfile: async (
    userId: string,
    profile: {
      bio: string;
      specialization: string;
      experience: string;
      socialLinks?: {
        linkedin?: string;
        twitter?: string;
        website?: string;
      };
    },
  ): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('teacher_profiles.php', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          ...profile,
        }),
      });
      return;
    }

    updateStore((draft) => {
      const user = draft.users.find((item) => item.id === userId);
      if (!user) {
        throw new Error('Docente no encontrado.');
      }

      let teacherProfile = draft.teacherProfiles.find((item) => item.userId === userId);
      if (!teacherProfile) {
        teacherProfile = {
          id: makeId('teacher-profile'),
          userId,
          bio: '',
          specialization: '',
          experience: '',
          socialLinks: {},
          createdAt: now(),
          updatedAt: now(),
        };
        draft.teacherProfiles.push(teacherProfile);
      }

      teacherProfile.bio = profile.bio;
      teacherProfile.specialization = profile.specialization;
      teacherProfile.experience = profile.experience;
      teacherProfile.socialLinks = profile.socialLinks || {};
      teacherProfile.updatedAt = now();

      user.bio = profile.bio;
      user.specialization = profile.specialization;
      user.experience = profile.experience;
      user.updatedAt = now();
    });
  },

  addMaterial: async (
    lessonId: string,
    material: { title: string; type: MaterialType; url: string },
  ): Promise<Material> => {
    await wait();

    let createdMaterial: Material | null = null;

    updateStore((draft) => {
      for (const course of draft.courses) {
        for (const module of course.modules) {
          const lesson = module.lessons.find((item) => item.id === lessonId);
          if (!lesson) {
            continue;
          }

          createdMaterial = {
            id: makeId('material'),
            lessonId,
            title: material.title,
            type: material.type,
            url: sanitizeMaterialPayload(material).url,
            createdAt: now(),
            updatedAt: now(),
          };
          lesson.materials.push(createdMaterial);
          lesson.updatedAt = now();
          module.updatedAt = now();
          course.updatedAt = now();
          return;
        }
      }

      throw new Error('Leccion no encontrada.');
    });

    if (!createdMaterial) {
      throw new Error('No fue posible crear el material.');
    }

    return clone(createdMaterial);
  },

  getMaterial: async (id: string): Promise<Material> => {
    await wait();

    const material = readStore()
      .courses.flatMap((course) => course.modules)
      .flatMap((module) => module.lessons)
      .flatMap((lesson) => lesson.materials)
      .find((item) => item.id === id);

    if (!material) {
      throw new Error('Material no encontrado.');
    }

    return clone(material);
  },

  deleteMaterial: async (id: string): Promise<void> => {
    await wait();

    updateStore((draft) => {
      for (const course of draft.courses) {
        for (const module of course.modules) {
          for (const lesson of module.lessons) {
            const previousLength = lesson.materials.length;
            lesson.materials = lesson.materials.filter((material) => material.id !== id);

            if (lesson.materials.length !== previousLength) {
              lesson.updatedAt = now();
              module.updatedAt = now();
              course.updatedAt = now();
              return;
            }
          }
        }
      }
    });
  },

  getNotifications: async (userId: string): Promise<NotificationItem[]> => {
    await wait(50);
    return readStore().notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    await wait(40);

    updateStore((draft) => {
      const notification = draft.notifications.find((item) => item.id === notificationId);
      if (notification) {
        notification.isRead = true;
      }
    });
  },

  getCertificates: async (userId: string): Promise<Certificate[]> => {
    await wait(40);
    return readStore().certificates
      .filter((certificate) => certificate.userId === userId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  getStudentProgressForCourse: async (
    userId: string,
    courseId: string,
  ): Promise<number> => {
    await wait(40);
    return getCourseProgress(readStore(), userId, courseId);
  },

  // ── PAYMENT REQUESTS ────────────────────────────────────────────────────

  submitPaymentRequest: async (
    payload: Omit<PaymentRequest, 'id' | 'submittedAt' | 'status'>,
  ): Promise<PaymentRequest> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('payment_requests.php', {
        method: 'POST',
        body: JSON.stringify({
          user_id: payload.userId,
          course_id: payload.courseId,
          user_name: payload.userName,
          user_email: payload.userEmail,
          course_title: payload.courseTitle,
          amount: payload.amount,
          voucher_image: payload.voucherImage,
          payment_date: payload.paymentDate,
        }),
      });
      const requests = await api.getAllPaymentRequests();
      const created = requests.find(
        (request) =>
          request.userId === payload.userId &&
          request.courseId === payload.courseId &&
          request.status === 'pending',
      );
      if (!created) throw new Error('Comprobante registrado, pero no se pudo recargar.');
      return created;
    }

    const request: PaymentRequest = {
      ...payload,
      id: makeId('payment'),
      submittedAt: now(),
      status: 'pending',
    };

    updateStore((draft) => {
      draft.paymentRequests.push(request);

      // Crear enrollment en estado PENDING_PAYMENT si no existe
      const alreadyEnrolled = draft.enrollments.some(
        (e) => e.userId === payload.userId && e.courseId === payload.courseId,
      );
      if (!alreadyEnrolled) {
        draft.enrollments.push({
          id: makeId('enrollment'),
          userId: payload.userId,
          courseId: payload.courseId,
          status: EnrollmentStatus.PENDING_PAYMENT,
          progress: 0,
          enrolledAt: now(),
          updatedAt: now(),
        });
      }

      // Notificar a todos los gestores
      const gestores = draft.users.filter(
        (u) => u.role === UserRole.GESTOR || u.role === UserRole.ADMIN,
      );
      for (const gestor of gestores) {
        pushNotification(
          draft,
          gestor.id,
          'Nuevo comprobante de pago',
          `${payload.userName} envió su comprobante para "${payload.courseTitle}". Revisa y aprueba el acceso.`,
          'info',
        );
      }
    });

    return request;
  },

  getPendingPaymentRequests: async (): Promise<PaymentRequest[]> => {
    await wait(60);
    if (remoteApiEnabled) {
      return (await requestJson<any[]>('payment_requests.php?status=pending')).map(mapRemotePaymentRequest);
    }

    return readStore().paymentRequests
      .filter((r) => r.status === 'pending')
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  getAllPaymentRequests: async (): Promise<PaymentRequest[]> => {
    await wait(60);
    if (remoteApiEnabled) {
      return (await requestJson<any[]>('payment_requests.php')).map(mapRemotePaymentRequest);
    }

    return [...readStore().paymentRequests].sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
  },

  approvePaymentRequest: async (requestId: string, note?: string): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('payment_requests.php?action=approve', {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, note }),
      });
      return;
    }

    updateStore((draft) => {
      const request = draft.paymentRequests.find((r) => r.id === requestId);
      if (!request) return;

      request.status = 'approved';
      if (note) request.gestorNote = note;

      // Activar la inscripción
      const enrollment = draft.enrollments.find(
        (e) => e.userId === request.userId && e.courseId === request.courseId,
      );
      if (enrollment) {
        enrollment.status = EnrollmentStatus.ACTIVE;
        enrollment.updatedAt = now();
      } else {
        draft.enrollments.push({
          id: makeId('enrollment'),
          userId: request.userId,
          courseId: request.courseId,
          status: EnrollmentStatus.ACTIVE,
          progress: 0,
          enrolledAt: now(),
          updatedAt: now(),
        });
      }

      // Notificar al alumno
      pushNotification(
        draft,
        request.userId,
        '¡Inscripción aprobada!',
        `Tu pago para "${request.courseTitle}" fue verificado. Ya puedes acceder al curso.`,
        'success',
      );
    });
  },

  rejectPaymentRequest: async (requestId: string, note?: string): Promise<void> => {
    await wait();
    if (remoteApiEnabled) {
      await requestJson('payment_requests.php?action=reject', {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, note }),
      });
      return;
    }

    updateStore((draft) => {
      const request = draft.paymentRequests.find((r) => r.id === requestId);
      if (!request) return;

      request.status = 'rejected';
      if (note) request.gestorNote = note;

      // Quitar enrollment PENDING_PAYMENT
      const idx = draft.enrollments.findIndex(
        (e) =>
          e.userId === request.userId &&
          e.courseId === request.courseId &&
          e.status === EnrollmentStatus.PENDING_PAYMENT,
      );
      if (idx !== -1) draft.enrollments.splice(idx, 1);

      // Notificar al alumno
      pushNotification(
        draft,
        request.userId,
        'Pago no verificado',
        `Tu comprobante para "${request.courseTitle}" no pudo ser verificado. ${note ? note : 'Contáctate con el gestor para más información.'}`,
        'warning',
      );
    });
  },

  // ── SYSTEM SETTINGS ─────────────────────────────────────────────────────

  createSupportRequest: async (email: string): Promise<SupportRequest> => {
    await wait();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Ingresa tu correo para crear la solicitud.');
    }

    if (remoteApiEnabled) {
      await requestJson('support_requests.php', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const requests = await api.getSupportRequests();
      return requests[0];
    }

    let created: SupportRequest | null = null;
    updateStore((draft) => {
      const user = draft.users.find((item) => item.email.toLowerCase() === normalizedEmail);
      created = {
        id: makeId('support'),
        email: normalizedEmail,
        userId: user?.id,
        userName: user?.fullName,
        status: 'pending',
        createdAt: now(),
      };
      draft.supportRequests.unshift(created);

      for (const manager of draft.users.filter((item) => item.role === UserRole.ADMIN || item.role === UserRole.GESTOR)) {
        pushNotification(
          draft,
          manager.id,
          'Solicitud de soporte',
          `${user?.fullName || normalizedEmail} solicito recuperar su contrasena.`,
          'warning',
        );
      }
    });

    if (!created) throw new Error('No se pudo registrar la solicitud.');
    return clone(created);
  },

  getSupportRequests: async (): Promise<SupportRequest[]> => {
    await wait(60);
    if (remoteApiEnabled) {
      const requests = await requestJson<any[]>('support_requests.php');
      return requests.map((request) => ({
        id: String(request.id),
        email: request.email,
        userId: request.user_id ? String(request.user_id) : undefined,
        userName: request.user_name,
        status: request.status,
        createdAt: request.created_at,
        attendedAt: request.attended_at,
        attendedBy: request.attended_by ? String(request.attended_by) : undefined,
      }));
    }

    return [...readStore().supportRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  resetSupportRequestPassword: async (requestId: string, attendedBy: string): Promise<string> => {
    await wait();
    const temporaryPassword = makeTemporaryPassword();
    if (remoteApiEnabled) {
      const response = await requestJson<{ temporary_password?: string }>('support_requests.php?action=reset-temporary', {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId, attended_by: attendedBy, temporary_password: temporaryPassword }),
      });
      return response.temporary_password ?? temporaryPassword;
    }

    updateStore((draft) => {
      const request = draft.supportRequests.find((item) => item.id === requestId);
      if (!request) {
        throw new Error('Solicitud no encontrada.');
      }
      const user = draft.users.find(
        (item) =>
          (request.userId && item.id === request.userId) ||
          item.email.toLowerCase() === request.email.toLowerCase(),
      );
      if (!user || user.role !== UserRole.ALUMNO) {
        throw new Error('No se encontro un alumno con ese correo.');
      }
      user.password = temporaryPassword;
      user.mustChangePassword = true;
      user.updatedAt = now();
      request.userId = user.id;
      request.userName = user.fullName;
      request.status = 'attended';
      request.attendedAt = now();
      request.attendedBy = attendedBy;
      pushNotification(
        draft,
        user.id,
        'Clave temporal asignada',
        `Tu clave temporal es ${temporaryPassword}. Cambiala al iniciar sesion.`,
        'warning',
      );
    });
    return temporaryPassword;
  },

  getSystemSettings: async (): Promise<SystemSettings> => {
    await wait(30);
    return clone(readStore().systemSettings ?? DEFAULT_SYSTEM_SETTINGS);
  },

  updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    await wait();
    let updated: SystemSettings = DEFAULT_SYSTEM_SETTINGS;

    updateStore((draft) => {
      draft.systemSettings = { ...draft.systemSettings, ...settings };
      updated = draft.systemSettings;
    });

    return updated;
  },

  // ── COURSE PUBLIC LINK ───────────────────────────────────────────────────

  getCoursePublicLink: (courseId: string, title?: string): string => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/${buildCourseHash(courseId, title)}`;
  },

};
