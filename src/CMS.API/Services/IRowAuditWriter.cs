using System.Data;

namespace CMS.API.Services;

public interface IRowAuditWriter
{
    // Repositories pass their own connection/transaction so the audit row commits
    // and rolls back together with the change it describes; when omitted the writer
    // opens its own connection.
    Task LogInsertAsync<T>(string tableName, T entity,
        IDbConnection? connection = null, IDbTransaction? transaction = null) where T : class;

    Task LogUpdateAsync<T>(string tableName, T before, T after,
        IDbConnection? connection = null, IDbTransaction? transaction = null) where T : class;

    Task LogDeleteAsync<T>(string tableName, T entity,
        IDbConnection? connection = null, IDbTransaction? transaction = null) where T : class;
}
