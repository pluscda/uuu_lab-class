using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class RowAuditRepository(IDbConnectionFactory connectionFactory) : IRowAuditRepository
{
    // PrimaryKeyValues is nvarchar — the RowAuditWriter stores the record's pkid
    // as a string, so the filter compares strings. COALESCE keeps ActionDesc
    // non-null (the column is nullable). Newest first; audit pkid breaks ties
    // between rows written in the same instant.
    private const string SelectSql = """
        SELECT a.[DateTime], a.UserName, a.ActionType, COALESCE(a.ActionDesc, '') AS ActionDesc
        FROM RowAudit a
        WHERE a.TableName = @TableName AND a.PrimaryKeyValues = @Pkid
        ORDER BY a.[DateTime] DESC, a.pkid DESC
        """;

    public async Task<IEnumerable<RowAuditEntry>> GetByRecordAsync(string tableName, string pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<RowAuditEntry>(SelectSql, new { TableName = tableName, Pkid = pkid });
    }
}
