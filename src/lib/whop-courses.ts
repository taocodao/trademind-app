/**
 * Whop Course Helpers
 * ====================
 * Utility wrappers around the Whop SDK Courses API.
 * Use scripts/seed-whop-courses.ts to seed initial content.
 */

import { whop } from '@/lib/whop';

export async function createCourse(params: {
    experienceId: string;
    title:        string;
    tagline?:     string;
    sequential?:  boolean;
}) {
    const course = await whop.courses.create({
        experience_id:                        params.experienceId,
        title:                                params.title,
        tagline:                              params.tagline,
        require_completing_lessons_in_order:  params.sequential ?? false,
        certificate_after_completion_enabled: true,
        visibility:                           'visible',
    });
    return course;
}

export async function addChapter(params: {
    courseId: string;
    title:    string;
}) {
    return whop.courseChapters.create({
        course_id: params.courseId,
        title:     params.title,
    });
}

export async function addLesson(params: {
    chapterId: string;
    title:     string;
    content?:  string;
}) {
    return whop.courseLessons.create({
        chapter_id:  params.chapterId,
        lesson_type: 'text',
        title:       params.title,
        content:     params.content,
    });
}
