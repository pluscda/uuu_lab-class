import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUserLookup } from '../models/app-role.model';
import { AppRoleLookup } from '../models/app-user.model';
import { PublishStatusLookup } from '../models/publish-status.model';
import { PartnerLookup } from '../models/partner.model';
import { CourseGroupLookup } from '../models/course-group.model';
import {
  CertificationLookup,
  CourseLookup,
  JobCategoryLookup
} from '../models/course.model';
import {
  PromotionLookup,
  TrainingCenterLookup
} from '../models/featured-promo-item.model';

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);

  getAppUsers(): Observable<AppUserLookup[]> {
    return this.http.get<AppUserLookup[]>(`${environment.apiUrl}/lookups/app-users`);
  }

  getAppRoles(): Observable<AppRoleLookup[]> {
    return this.http.get<AppRoleLookup[]>(`${environment.apiUrl}/lookups/app-roles`);
  }

  getPublishStatuses(): Observable<PublishStatusLookup[]> {
    return this.http.get<PublishStatusLookup[]>(`${environment.apiUrl}/lookups/publish-statuses`);
  }

  getPartners(): Observable<PartnerLookup[]> {
    return this.http.get<PartnerLookup[]>(`${environment.apiUrl}/lookups/partners`);
  }

  getCourseGroups(): Observable<CourseGroupLookup[]> {
    return this.http.get<CourseGroupLookup[]>(`${environment.apiUrl}/lookups/course-groups`);
  }

  getCertifications(): Observable<CertificationLookup[]> {
    return this.http.get<CertificationLookup[]>(`${environment.apiUrl}/lookups/certifications`);
  }

  getJobCategories(): Observable<JobCategoryLookup[]> {
    return this.http.get<JobCategoryLookup[]>(`${environment.apiUrl}/lookups/job-categories`);
  }

  getCourses(): Observable<CourseLookup[]> {
    return this.http.get<CourseLookup[]>(`${environment.apiUrl}/lookups/courses`);
  }

  getTrainingCenters(): Observable<TrainingCenterLookup[]> {
    return this.http.get<TrainingCenterLookup[]>(`${environment.apiUrl}/lookups/training-centers`);
  }

  getPromotions(keyword?: string): Observable<PromotionLookup[]> {
    return this.http.get<PromotionLookup[]>(`${environment.apiUrl}/lookups/promotions`, {
      params: keyword ? { keyword } : {}
    });
  }
}
