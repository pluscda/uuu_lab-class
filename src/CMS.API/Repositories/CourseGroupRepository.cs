using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class CourseGroupRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : ICourseGroupRepository
{
    private const string TableName = "CourseGroup";

    private const string SelectSql = """
        SELECT g.pkid, g.Description
        FROM CourseGroup g
        """;

    public async Task<IEnumerable<CourseGroup>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroup>($"{SelectSql} ORDER BY g.pkid ASC");
    }

    public async Task<IEnumerable<CourseGroup>> QueryAsync(CourseGroupQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("g.Description LIKE @Keyword");
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroup>($"{SelectSql}{where} ORDER BY g.pkid ASC", parameters);
    }

    public async Task<CourseGroup?> GetByIdAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<CourseGroup>(
            $"{SelectSql} WHERE g.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<short> CreateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var pkid = await connection.ExecuteScalarAsync<short>("""
            INSERT INTO CourseGroup (Description)
            VALUES (@Description);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request);

        var created = await GetForAuditAsync(connection, pkid);
        if (created is not null)
            await auditWriter.LogInsertAsync(TableName, created, connection);
        return pkid;
    }

    public async Task<bool> UpdateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var before = await GetForAuditAsync(connection, request.Pkid);
        var affected = await connection.ExecuteAsync("""
            UPDATE CourseGroup
            SET Description = @Description
            WHERE pkid = @Pkid
            """, request);
        if (affected == 0)
            return false;

        var after = await GetForAuditAsync(connection, request.Pkid);
        if (before is not null && after is not null)
            await auditWriter.LogUpdateAsync(TableName, before, after, connection);
        return true;
    }

    public async Task<bool> DeleteAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var row = await GetForAuditAsync(connection, pkid);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM CourseGroup WHERE pkid = @Pkid", new { Pkid = pkid });
        if (affected == 0)
            return false;

        if (row is not null)
            await auditWriter.LogDeleteAsync(TableName, row, connection);
        return true;
    }

    private static Task<CourseGroup?> GetForAuditAsync(IDbConnection connection, short pkid) =>
        connection.QuerySingleOrDefaultAsync<CourseGroup>(
            $"{SelectSql} WHERE g.pkid = @Pkid", new { Pkid = pkid });
}
