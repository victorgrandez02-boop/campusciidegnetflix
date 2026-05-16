import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';

export enum UserRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR',
  DOCENTE = 'DOCENTE',
  ALUMNO = 'ALUMNO',
}

export enum EnrollmentStatus {
  PENDING = 'PENDING',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
}

export enum MaterialType {
  PDF = 'PDF',
  LINK = 'LINK',
  DRIVE = 'DRIVE',
  YOUTUBE = 'YOUTUBE',
  HTML = 'HTML',
}

export enum CourseLevel {
  PRINCIPIANTE = 'Principiante',
  INTERMEDIO = 'Intermedio',
  AVANZADO = 'Avanzado',
}

export enum View {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  DASHBOARD = 'DASHBOARD',
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
  DOCENTE = 'DOCENTE',
  GESTOR = 'GESTOR',
  COURSE_LANDING = 'COURSE_LANDING',
}

export type DashboardTab = 'inicio' | 'mis-cursos' | 'explorar' | 'certificados';
export type SortOption = 'featured' | 'rating' | 'newest' | 'price-asc' | 'price-desc';
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar: string;
  mustChangePassword?: boolean;
  bio?: string;
  specialization?: string;
  experience?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  bio: string;
  specialization: string;
  experience: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  lessonId?: string;
  title: string;
  type: MaterialType;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  moduleId?: string;
  title: string;
  duration: string;
  youtubeId: string;
  isCompleted: boolean;
  sortOrder?: number;
  summary?: string;
  materials: Material[];
  watchedSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Module {
  id: string;
  courseId?: string;
  title: string;
  sortOrder?: number;
  description?: string;
  lessons: Lesson[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  posterImage: string;
  price: number;
  duration: string;
  level: CourseLevel;
  category: string;
  instructor: string;
  instructorId?: string;
  rating: number;
  modules: Module[];
  isFeatured?: boolean;
  enrolledStudents?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Enrollment {
  id?: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progress: number;
  enrolledAt?: string;
  updatedAt?: string;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  isCompleted: boolean;
  watchedSeconds: number;
  lastWatchedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  code: string;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  honeypot?: string;
  formStartedAt?: number;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface ProfileFormData {
  fullName?: string;
  email?: string;
  bio?: string;
  specialization?: string;
  experience?: string;
  avatar?: string;
}

export interface CourseFormData {
  title: string;
  description: string;
  coverImage: string;
  posterImage: string;
  price: number;
  duration: string;
  level: CourseLevel;
  category: string;
  instructor: string;
  instructorId?: string;
  isFeatured: boolean;
}

export interface LessonFormData {
  title: string;
  duration: string;
  youtubeId: string;
}

export interface ModuleFormData {
  title: string;
  lessons: LessonFormData[];
}

export interface MaterialFormData {
  title: string;
  type: MaterialType;
  url: string;
}

export interface EnrollmentFormData {
  userId: string;
  courseId: string;
  status?: EnrollmentStatus;
}

export interface FilterState {
  search: string;
  category: string;
  level: CourseLevel | 'all';
  sort: SortOption;
}

export interface StudentSnapshot {
  totalEnrollments: number;
  activeCourses: number;
  completedCourses: number;
  certificates: number;
  averageProgress: number;
}

export interface TeacherSnapshot {
  totalCourses: number;
  totalLessons: number;
  totalMaterials: number;
  activeStudents: number;
}

export interface AdminSnapshot {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  activeEnrollments: number;
  completedEnrollments: number;
  certificatesIssued: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: ReactNode;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: ReactNode;
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface CourseCardProps {
  course: Course;
  enrollmentStatus?: EnrollmentStatus;
  onSelect: (course: Course) => void;
}

/** Solicitud de inscripción con comprobante de pago */
export interface PaymentRequest {
  id: string;
  userId: string;
  courseId: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
  amount: number;
  voucherImage: string;   // base64 o URL
  paymentDate: string;    // ISO string — fecha que el alumno registra
  submittedAt: string;    // ISO string — fecha del envío
  status: 'pending' | 'approved' | 'rejected';
  gestorNote?: string;
}

export interface SupportRequest {
  id: string;
  email: string;
  userId?: string;
  userName?: string;
  status: 'pending' | 'attended';
  createdAt: string;
  attendedAt?: string;
  attendedBy?: string;
}

/** Configuración global del sistema (editable por ADMIN) */
export interface SystemSettings {
  logoUrl: string;
  campusName: string;
  primaryColor: string;         // hex
  secondaryColor: string;       // hex
  accentColor: string;          // hex
  currency: string;             // ej. 'S/.'
  currencyCode: string;         // ej. 'PEN'
  paymentInstructions: string;  // Markdown o texto plano
  yapeNumber: string;
  yapeName: string;
  bankName: string;
  bankAccount: string;
  bankCci: string;
  bankHolder: string;
  bankDni: string;
}
