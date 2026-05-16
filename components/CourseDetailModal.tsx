import React from 'react';
import {
  BookOpen,
  Clock3,
  Lock,
  Play,
  Star,
  Users,
  X,
} from 'lucide-react';
import { Course, EnrollmentStatus, SystemSettings } from '../types';

interface CourseDetailModalProps {
  course: Course;
  enrollmentStatus: EnrollmentStatus;
  progress?: number;
  settings?: SystemSettings | null;
  onClose: () => void;
  onPlay: (courseId: string) => void;
  onRequestAccess: (course: Course) => void;
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  enrollmentStatus,
  progress = 0,
  settings,
  onClose,
  onPlay,
  onRequestAccess,
}) => {
  const isLocked =
    enrollmentStatus === EnrollmentStatus.LOCKED ||
    enrollmentStatus === EnrollmentStatus.EXPIRED;
  const isPending =
    enrollmentStatus === EnrollmentStatus.PENDING ||
    enrollmentStatus === EnrollmentStatus.PENDING_PAYMENT;
  const totalLessons = course.modules.reduce(
    (accumulator, module) => accumulator + module.lessons.length,
    0,
  );

  const currency = settings?.currency || 'S/.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#151515] text-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-black/60 p-2 text-white transition hover:bg-black"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative h-[280px] overflow-hidden md:h-[360px]">
          <img
            src={course.coverImage}
            alt={course.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-black/20" />

          <div className="absolute bottom-0 left-0 right-0 space-y-5 px-6 pb-8 md:px-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#003F6F]/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              <Star className="h-3.5 w-3.5" />
              {course.category}
            </div>

            <div className="max-w-3xl space-y-4">
              <h2 className="text-3xl font-bold md:text-5xl">{course.title}</h2>
              <p className="max-w-2xl text-sm text-gray-200 md:text-base">{course.description}</p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
                <span className="rounded-full bg-white/10 px-3 py-1">{course.level}</span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-gray-300" />
                  {course.duration}
                </span>
                <span className="inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-300" />
                  {totalLessons} clases
                </span>
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-300" />
                  {course.enrolledStudents || 0} inscritos
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isLocked ? (
                  <button
                    type="button"
                    onClick={() => onRequestAccess(course)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#003F6F] px-5 py-3 font-semibold text-white transition hover:bg-[#075B98]"
                  >
                    <Lock className="h-5 w-5" />
                    {course.price > 0 ? `Inscribirme por ${currency} ${course.price}` : 'Inscribirme ahora'}
                  </button>
                ) : isPending ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 font-semibold text-amber-100"
                  >
                    <Lock className="h-5 w-5" />
                    Pendiente de aprobacion
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPlay(course.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    {progress > 0 ? 'Continuar curso' : 'Comenzar curso'}
                  </button>
                )}

                {!isLocked && (
                  <div className="min-w-[180px] rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Progreso</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-white">{progress}% completado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.5fr_0.9fr] md:px-10">
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-semibold">Ruta de aprendizaje</h3>
              <div className="mt-4 space-y-4">
                {course.modules.map((module, moduleIndex) => (
                  <article
                    key={module.id}
                    className="rounded-2xl border border-white/10 bg-[#1C1C1C] p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
                          Modulo {moduleIndex + 1}
                        </p>
                        <h4 className="text-lg font-semibold">{module.title}</h4>
                        {module.description && (
                          <p className="mt-1 text-sm text-gray-400">{module.description}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-gray-300">
                        {module.lessons.length} lecciones
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-medium text-white">
                                {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
                              </p>
                              {lesson.summary && (
                                <p className="mt-1 text-sm text-gray-400">{lesson.summary}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>{lesson.duration}</span>
                              <span>{lesson.materials.length} materiales</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#1C1C1C] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Instructor</p>
              <p className="mt-2 text-xl font-semibold text-white">{course.instructor}</p>
              <p className="mt-2 text-sm text-gray-400">
                Curso orientado a resultados y aplicacion en contexto profesional.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1C1C1C] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Lo que obtendras</p>
              <ul className="mt-4 space-y-3 text-sm text-gray-300">
                <li>Acceso a todas las clases y materiales del curso.</li>
                <li>Seguimiento de avance con progreso por leccion.</li>
                <li>Certificado al completar el 100% del contenido.</li>
                <li>Ruta organizada por modulos y objetivos claros.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1C1C1C] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Inversion</p>
              <p className="mt-3 text-3xl font-bold text-white">
                {course.price > 0 ? `${currency} ${course.price}` : 'Gratis'}
              </p>
              <p className="mt-2 text-sm text-gray-400">
                Acceso inmediato y registro de avance incluido.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailModal;
