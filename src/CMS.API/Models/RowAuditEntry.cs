namespace CMS.API.Models;

// Slim projection of RowAudit returned by GET /api/rowaudit — one record's
// audit trail; TableName/PrimaryKeyValues are implied by the query itself.
public class RowAuditEntry
{
    public DateTime DateTime { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string ActionDesc { get; set; } = string.Empty;
}
