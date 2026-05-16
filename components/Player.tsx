import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock3,
  Code2,
  FileText,
  PlayCircle,
} from 'lucide-react';
import HtmlPreviewModal from './HtmlPreviewModal';
import { Course, Lesson, LessonProgress, Material, MaterialType, User } from '../types';

interface PlayerProps {
  course: Course;
  user: User;
  progressEntries: LessonProgress[];
  onBack: () => void;
  onProgressUpdate: (lessonId: string, isCompleted: boolean, watchedSeconds: number) => Promise<void>;
}

const Player: React.FC<PlayerProps> = ({
  course,
  user,
  progressEntries,
  onBack,
  onProgressUpdate,
}) => {
  const lessons = course.modules.flatMap((module) => module.lessons);
  const progressMap = new Map(progressEntries.map((entry) => [entry.lessonId, entry]));
  const firstPendingLesson =
    lessons.find((lesson) => !progressMap.get(lesson.id)?.isCompleted) || lessons[0];

  const [currentLesson, setCurrentLesson] = useState<Lesson>(firstPendingLesson);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(course.modules[0]?.id || null);
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<Material | null>(null);

  useEffect(() => {
    setCurrentLesson(firstPendingLesson);
    setExpandedModuleId(course.modules[0]?.id || null);
  }, [course, firstPendingLesson]);

  if (lessons.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] px-6 text-white">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-[#171717] p-8 text-center">
          <p className="text-2xl font-semibold">Este curso aun no tiene clases publicadas.</p>
          <p className="mt-3 text-sm text-gray-400">
            Vuelve mas tarde o revisa otros cursos disponibles en el campus.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Volver al campus
          </button>
        </div>
      </div>
    );
  }

  const completedLessons = lessons.filter((lesson) => progressMap.get(lesson.id)?.isCompleted).length;
  const courseProgress = Math.round((completedLessons / lessons.length) * 100);
  const currentProgress = progressMap.get(currentLesson.id);
  const currentLessonCompleted = currentProgress?.isCompleted || false;

  const markCurrentLesson = async (completed: boolean) => {
    setSavingLessonId(currentLesson.id);
    try {
      await onProgressUpdate(currentLesson.id, completed, completed ? 900 : 0);
    } finally {
      setSavingLessonId(null);
    }
  };

  const goToNextLesson = () => {
    const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLesson.id);
    const nextLesson = lessons[currentIndex + 1];
    if (nextLesson) {
      setCurrentLesson(nextLesson);
      const module = course.modules.find((item) =>
        item.lessons.some((lesson) => lesson.id === nextLesson.id),
      );
      if (module) {
        setExpandedModuleId(module.id);
      }
    }
  };

  return (
    <>
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-[#07121D]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Campus player</p>
              <h1 className="truncate text-lg font-semibold md:text-2xl">{course.title}</h1>
              <p className="truncate text-sm text-gray-400">
                {user.fullName} · {courseProgress}% completado
              </p>
            </div>
          </div>

          <div className="hidden min-w-[220px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:block">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-emerald-500" style={{ width: `${courseProgress}%` }} />
            </div>
            <p className="mt-2 text-sm text-gray-300">
              {completedLessons} de {lessons.length} lecciones completadas
            </p>
          </div>
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-88px)] gap-0 md:grid-cols-[1.55fr_0.85fr]">
        <div className="flex flex-col border-r border-white/10 bg-[#0A1624]">
          <div className="aspect-video w-full bg-black">
            <iframe
              title={currentLesson.title}
              src={`https://www.youtube.com/embed/${currentLesson.youtubeId}?rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>

          <div className="space-y-6 px-4 py-6 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Leccion activa</p>
                <h2 className="mt-2 text-2xl font-semibold">{currentLesson.title}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {currentLesson.duration}
                  </span>
                  <span>{currentLesson.materials.length} materiales</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => markCurrentLesson(!currentLessonCompleted)}
                  disabled={savingLessonId === currentLesson.id}
                  className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {savingLessonId === currentLesson.id
                    ? 'Guardando...'
                    : currentLessonCompleted
                      ? 'Marcar como pendiente'
                      : 'Marcar como completada'}
                </button>
                <button
                  type="button"
                  onClick={goToNextLesson}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Siguiente leccion
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#171717] p-5">
              <p className="text-sm font-medium text-gray-300">Resumen de la clase</p>
              <p className="mt-3 text-sm leading-7 text-gray-400">
                {currentLesson.summary ||
                  'Esta clase forma parte de la ruta profesional del curso y suma a tu avance general.'}
              </p>
            </div>

              <div className="rounded-2xl border border-white/10 bg-[#171717] p-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-sky-300" />
                  <h3 className="text-lg font-semibold">Materiales de apoyo</h3>
                </div>
                {currentLesson.materials.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-400">
                    Esta leccion no tiene materiales adicionales por ahora.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {currentLesson.materials.map((material) =>
                      material.type === MaterialType.HTML ? (
                        /* Material HTML → abre popup de preview */
                        <button
                          key={material.id}
                          type="button"
                          onClick={() => setHtmlPreview(material)}
                          className="flex w-full items-center justify-between rounded-2xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-left text-sm text-gray-200 transition hover:border-sky-500/60 hover:bg-sky-500/10"
                        >
                          <span className="flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-sky-400" />
                            {material.title}
                          </span>
                          <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs uppercase text-sky-300">
                            HTML
                          </span>
                        </button>
                      ) : (
                        /* Otros materiales → enlace externo */
                        <a
                          key={material.id}
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-200 transition hover:border-sky-500/40 hover:bg-black/30"
                        >
                          <span>{material.title}</span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-gray-300">
                            {material.type}
                          </span>
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>
          </div>
        </div>

        <aside className="bg-[#0D1B2A]">
          <div className="border-b border-white/10 px-4 py-5 md:px-6">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Temario del curso</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {completedLessons} / {lessons.length} lecciones completadas
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#003F6F]" style={{ width: `${courseProgress}%` }} />
            </div>
          </div>

          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
            {course.modules.map((module, moduleIndex) => {
              const isExpanded = expandedModuleId === module.id;
              const moduleCompletedLessons = module.lessons.filter(
                (lesson) => progressMap.get(lesson.id)?.isCompleted,
              ).length;

              return (
                <div key={module.id} className="border-b border-white/5">
                  <button
                    type="button"
                    onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                    className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-white/5 md:px-6"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                        Modulo {moduleIndex + 1}
                      </p>
                      <p className="mt-1 text-base font-semibold text-white">{module.title}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {moduleCompletedLessons}/{module.lessons.length} completadas
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 px-3 pb-4 md:px-4">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const isCurrentLesson = currentLesson.id === lesson.id;
                        const isCompleted = progressMap.get(lesson.id)?.isCompleted || false;

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => setCurrentLesson(lesson)}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                              isCurrentLesson
                                ? 'border-sky-500/40 bg-sky-500/10'
                                : 'border-white/5 bg-black/20 hover:border-white/10 hover:bg-black/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 text-sky-300">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : isCurrentLesson ? (
                                  <PlayCircle className="h-5 w-5" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                                  {moduleIndex + 1}.{lessonIndex + 1}
                                </p>
                                <p className="mt-1 text-sm font-medium text-white">{lesson.title}</p>
                                <p className="mt-1 text-xs text-gray-400">{lesson.duration}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>

      {/* Modal HTML Preview */}
      {htmlPreview && (
        <HtmlPreviewModal
          title={htmlPreview.title}
          htmlContent={htmlPreview.url}
          onClose={() => setHtmlPreview(null)}
        />
      )}
    </>
  );
};

export default Player;
