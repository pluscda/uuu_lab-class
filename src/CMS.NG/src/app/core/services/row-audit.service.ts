import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RowAuditEntry } from '../models/row-audit.model';

@Injectable({ providedIn: 'root' })
export class RowAuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rowaudit`;

  // The API returns the record's full trail newest first.
  getForRecord(tableName: string, pkid: number): Observable<RowAuditEntry[]> {
    return this.http.get<RowAuditEntry[]>(this.baseUrl, {
      params: { tableName, pkid }
    });
  }
}
