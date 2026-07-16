import { courseShowUrl } from './course-url.util';
import { Course } from '../models/course.model';

describe('courseShowUrl', () => {
  const baseCourse: Course = {
    pkid: 1412,
    title: '使用Windows PowerShell進行自動化管理',
    officialTitle: null,
    courseId: '10961',
    prodCourseId: '10961',
    friendlyUrl: '',
    displayOrder: 7,
    partnerPkid: 1,
    courseGroupPkid: null,
    publishStatusPkid: 1,
    scheduleOn: '2019-11-11',
    scheduleOff: '2021-11-11',
    hour: 35,
    listPrice: 24000,
    learningCredit: 6,
    material: null,
    objective: null,
    target: null,
    prerequisites: null,
    outline: null,
    towardCertOrExam: null,
    note: null,
    otherInfo: null,
    canRepeat: false,
    partnerName: 'Microsoft',
    courseGroupDescription: null,
    publishStatusDescription: '已下架',
    certificationPkids: [],
    jobCategoryPkids: []
  };

  it('should build the public course-show URL from pkid and courseId', () => {
    expect(courseShowUrl(baseCourse)).toBe('https://www.uuu.com.tw/Course/Show/1412/10961');
  });

  it('should URL-encode a courseId containing special characters', () => {
    const course = { ...baseCourse, courseId: '12cOCP-old' };
    expect(courseShowUrl(course)).toBe('https://www.uuu.com.tw/Course/Show/1412/12cOCP-old');
  });
});
