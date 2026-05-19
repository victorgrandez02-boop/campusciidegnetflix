import type { Course } from '../types';

export const slugifyCourseTitle = (title: string) => {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

  return normalized || 'curso';
};

export const buildCourseHash = (courseId: string, title?: string) =>
  `#curso-${title ? `${slugifyCourseTitle(title)}-` : ''}${courseId}`;

export const resolveCourseIdFromHash = (hash: string, courses: Course[] = []) => {
  if (!hash.startsWith('#curso-')) {
    return null;
  }

  const value = decodeURIComponent(hash.replace('#curso-', '')).trim();
  if (!value) {
    return null;
  }

  const exact = courses.find((course) => course.id === value);
  if (exact) {
    return exact.id;
  }

  const bySlugWithId = courses.find((course) => value === `${slugifyCourseTitle(course.title)}-${course.id}`);
  if (bySlugWithId) {
    return bySlugWithId.id;
  }

  const byIdSuffix = courses.find((course) => value.endsWith(`-${course.id}`));
  if (byIdSuffix) {
    return byIdSuffix.id;
  }

  const byTitleOnly = courses.find((course) => value === slugifyCourseTitle(course.title));
  if (byTitleOnly) {
    return byTitleOnly.id;
  }

  return value;
};
