import React, { useRef, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  PlayCircle,
  TrendingUp,
} from 'lucide-react';
import { Course, EnrollmentStatus } from '../types';

interface CourseRowProps {
  title: string;
  courses: Course[];
  userEnrollments: Map<string, EnrollmentStatus>;
  progressMap?: Map<string, number>;
  onSelectCourse: (course: Course) => void;
}

const titleIcon = (title: string) => {
  switch (title) {
    case 'Continua aprendiendo':
      return <PlayCircle className="h-5 w-5 text-sky-400" />;
    case 'Mis cursos':
      return <Award className="h-5 w-5 text-amber-400" />;
    case 'Recomendados':
      return <TrendingUp className="h-5 w-5 text-emerald-400" />;
    default:
      return <Clock3 className="h-5 w-5 text-sky-400" />;
  }
};

const CourseRow: React.FC<CourseRowProps> = ({
  title,
  courses,
  userEnrollments,
  progressMap = new Map(),
  onSelectCourse,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(courses.length > 4);

  if (courses.length === 0) {
    return null;
  }

  const updateScrollState = () => {
    const node = rowRef.current;
    if (!node) {
      return;
    }

    setCanScrollLeft(node.scrollLeft > 8);
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 8);
  };

  const scrollRow = (direction: 'left' | 'right') => {
    const node = rowRef.current;
    if (!node) {
      return;
    }

    node.scrollBy({
      left: direction === 'left' ? -node.clientWidth * 0.85 : node.clientWidth * 0.85,
      behavior: 'smooth',
    });

    window.setTimeout(updateScrollState, 350);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-4 md:px-10">
        <div className="flex items-center gap-2 text-white">
          {titleIcon(title)}
          <h2 className="text-lg font-semibold md:text-2xl">{title}</h2>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
      </div>

      <div className="group relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollRow('left')}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/80 p-2 text-white shadow-lg transition hover:scale-105 md:block"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div
          ref={rowRef}
          onScroll={updateScrollState}
          className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-10"
        >
          {courses.map((course) => {
            const enrollmentStatus = userEnrollments.get(course.id) || EnrollmentStatus.LOCKED;
            const progress = progressMap.get(course.id) || 0;
            const isLocked =
              enrollmentStatus === EnrollmentStatus.LOCKED ||
              enrollmentStatus === EnrollmentStatus.EXPIRED;
            const totalLessons = course.modules.reduce(
              (accumulator, module) => accumulator + module.lessons.length,
              0,
            );

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => onSelectCourse(course)}
                className="group/card w-64 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0D1B2A] text-left shadow-lg transition hover:-translate-y-1 hover:border-sky-500/40"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="h-full w-full object-cover transition duration-500 group-hover/card:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white">
                    {course.category}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white">
                    {isLocked ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  </div>
                  {progress > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
                      <div className="h-full bg-[#003F6F]" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-2 text-base font-semibold text-white">{course.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{course.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="rounded-full bg-white/5 px-2 py-1">{course.level}</span>
                    <span>{course.duration}</span>
                    <span>{totalLessons} clases</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-green-400">{course.rating}% rating</span>
                    <span className="text-gray-400">
                      {progress > 0 ? `${progress}% progreso` : isLocked ? 'Disponible' : 'Inscrito'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollRow('right')}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/80 p-2 text-white shadow-lg transition hover:scale-105 md:block"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    </section>
  );
};

export default CourseRow;
