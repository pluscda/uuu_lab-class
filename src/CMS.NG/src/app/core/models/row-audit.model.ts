// One change record from GET /api/rowaudit — a row of a record's audit trail.
export interface RowAuditEntry {
  dateTime: string;
  userName: string;
  actionType: string;
  actionDesc: string;
}
