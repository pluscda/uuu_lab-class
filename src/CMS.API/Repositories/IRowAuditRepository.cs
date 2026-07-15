using CMS.API.Models;

namespace CMS.API.Repositories;

public interface IRowAuditRepository
{
    Task<IEnumerable<RowAuditEntry>> GetByRecordAsync(string tableName, string pkid);
}
