import { Course } from '../models/course.model';

const COURSE_SHOW_URL_BASE = 'https://www.uuu.com.tw/Course/Show';

export function courseShowUrl(course: Course): string {
  return `${COURSE_SHOW_URL_BASE}/${course.pkid}/${encodeURIComponent(course.courseId)}`;
}
