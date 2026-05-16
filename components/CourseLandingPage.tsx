import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Lock,
  LogIn,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { Course, EnrollmentStatus, SystemSettings, User } from '../types';

interface CourseLandingPageProps {
  course: Course;
  currentUser: User | null;
  enrollmentStatus?: EnrollmentStatus;
  settings: SystemSettings;
  onLogin: () => void;
  onRegister: () => void;
  onEnroll: (course: Course) => void;
  onPlay: (courseId: string) => void;
  onBack: () => void;
}

const CourseLandingPage: React.FC<CourseLandingPageProps> = ({
  course,
  currentUser,
  enrollmentStatus,
  settings,
  onLogin,
  onRegister,
  onEnroll,
  onPlay,
  onBack,
}) => {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const currency = settings.currency || 'S/.';

  const totalLessons = course.modules.reduce(
    (sum, module) => sum + module.lessons.length,
    0,
  );

  const isEnrolled =
    enrollmentStatus === EnrollmentStatus.ACTIVE ||
    enrollmentStatus === EnrollmentStatus.COMPLETED;

  const isPendingPayment = enrollmentStatus === EnrollmentStatus.PENDING_PAYMENT;

  return (
    <div className="min-h-screen bg-[#07121D] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#07121D]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 md:px-10">
          <BrandLogo className="w-40" />
          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al campus
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onLogin}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
                >
                  <LogIn className="h-4 w-4" />
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={onRegister}
                  className="flex items-center gap-2 rounded-xl bg-[#003F6F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#075B98] transition"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${course.coverImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07121D] via-[#07121D]/85 to-[#07121D]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07121D] via-transparent to-black/30" />

        <div className="relative mx-auto max-w-[1400px] px-4 py-16 md:px-10 md:py-24">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#003F6F]/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              <Star className="h-3.5 w-3.5" />
              {course.category}
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-6xl">{course.title}</h1>
            <p className="text-lg text-gray-300 leading-relaxed">{course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              <span className="rounded-full bg-white/10 px-3 py-1">{course.level}</span>
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" /> {course.duration}
              </span>
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> {totalLessons} clases
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" /> {course.enrolledStudents || 0} inscritos
              </span>
            </div>

            <p className="text-sm text-gray-400">
              Instructor: <span className="font-semibold text-white">{course.instructor}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1400px] grid gap-8 px-4 py-10 md:grid-cols-[1fr_380px] md:px-10">
        {/* Left: modules */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Ruta de aprendizaje</h2>
          <div className="space-y-3">
            {course.modules.map((module, moduleIndex) => (
              <article key={module.id} className="rounded-2xl border border-white/10 bg-[#161616]">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedModule(expandedModule === module.id ? null : module.id)
                  }
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <div>
                    <p className="text-xs uppercase tracking-widest text-sky-300">
                      Módulo {moduleIndex + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{module.title}</h3>
                    {module.description && (
                      <p className="mt-1 text-sm text-gray-400">{module.description}</p>
                    )}
                  </div>
                  <span className="ml-4 shrink-0 rounded-full bg-white/5 px-3 py-1 text-sm text-gray-300">
                    {module.lessons.length} clases
                  </span>
                </button>

                {expandedModule === module.id && (
                  <div className="border-t border-white/10 px-5 pb-5 pt-3 space-y-2">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                          </p>
                          {lesson.summary && (
                            <p className="mt-1 text-xs text-gray-500">{lesson.summary}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-gray-400 ml-4">{lesson.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* What you'll get */}
          <div className="rounded-2xl border border-white/10 bg-[#161616] p-6">
            <h3 className="text-lg font-semibold mb-4">Lo que obtendrás</h3>
            <ul className="space-y-3">
              {[
                'Acceso a todas las clases y materiales del curso.',
                'Seguimiento de avance con progreso por lección.',
                'Certificado al completar el 100% del contenido.',
                'Ruta organizada por módulos y objetivos claros.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: CTA sticky card */}
        <aside className="space-y-4">
          <div className="sticky top-24 rounded-3xl border border-white/10 bg-[#0D1B2A] p-6 space-y-5 shadow-xl">
            {/* Price */}
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400">Inversión</p>
              <p className="mt-2 text-5xl font-bold">
                {course.price > 0 ? (
                  <>
                    <span className="text-2xl text-gray-400">{currency} </span>
                    {course.price.toFixed(2)}
                  </>
                ) : (
                  <span className="text-emerald-400">Gratis</span>
                )}
              </p>
              <p className="mt-2 text-sm text-gray-400">Acceso completo al contenido del curso.</p>
            </div>

            <div className="border-t border-white/10" />

            {/* CTA based on status */}
            {!currentUser && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onRegister}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003F6F] py-4 font-bold text-white hover:bg-[#075B98] transition"
                >
                  <UserPlus className="h-5 w-5" />
                  Crear cuenta y acceder
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 font-semibold text-white hover:bg-white/10 transition"
                >
                  <LogIn className="h-5 w-5" />
                  Ya tengo cuenta
                </button>
                <p className="text-center text-xs text-gray-500">
                  Crea tu cuenta para solicitar la inscripción al curso.
                </p>
              </div>
            )}

            {currentUser && isEnrolled && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Ya estás inscrito en este curso.
                </div>
                <button
                  type="button"
                  onClick={() => onPlay(course.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 font-bold text-black hover:bg-gray-100 transition"
                >
                  <GraduationCap className="h-5 w-5" />
                  Ir al curso
                </button>
              </div>
            )}

            {currentUser && isPendingPayment && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  Tu comprobante está en revisión. Te notificaremos cuando sea aprobado.
                </div>
              </div>
            )}

            {currentUser && !isEnrolled && !isPendingPayment && (
              <button
                type="button"
                onClick={() => onEnroll(course)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003F6F] py-4 font-bold text-white hover:bg-[#075B98] transition"
              >
                <Lock className="h-5 w-5" />
                {course.price > 0
                  ? `Inscribirme por ${currency} ${course.price.toFixed(2)}`
                  : 'Inscribirme ahora'}
              </button>
            )}

            {/* Details */}
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Nivel</span>
                <span className="text-white">{course.level}</span>
              </div>
              <div className="flex justify-between">
                <span>Duración</span>
                <span className="text-white">{course.duration}</span>
              </div>
              <div className="flex justify-between">
                <span>Clases</span>
                <span className="text-white">{totalLessons}</span>
              </div>
              <div className="flex justify-between">
                <span>Módulos</span>
                <span className="text-white">{course.modules.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Valoración</span>
                <span className="text-white">{course.rating}%</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CourseLandingPage;
