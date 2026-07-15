using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class PublishStatusRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IPublishStatusRepository
{
    private const string TableName = "PublishStatus";

    private const string SelectSql = """
        SELECT s.pkid, s.Description, s.IsDraft, s.IsPublished, s.IsDiscontinued
        FROM PublishStatus s
        """;

    public async Task<IEnumerable<PublishStatus>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PublishStatus>($"{SelectSql} ORDER BY s.pkid ASC");
    }

    public async Task<IEnumerable<PublishStatus>> QueryAsync(PublishStatusQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("s.Description LIKE @Keyword");
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }
        if (query.IsDraft.HasValue)
        {
            conditions.Add("s.IsDraft = @IsDraft");
            parameters.Add("IsDraft", query.IsDraft.Value);
        }
        if (query.IsPublished.HasValue)
        {
            conditions.Add("s.IsPublished = @IsPublished");
            parameters.Add("IsPublished", query.IsPublished.Value);
        }
        if (query.IsDiscontinued.HasValue)
        {
            conditions.Add("s.IsDiscontinued = @IsDiscontinued");
            parameters.Add("IsDiscontinued", query.IsDiscontinued.Value);
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PublishStatus>($"{SelectSql}{where} ORDER BY s.pkid ASC", parameters);
    }

    public async Task<PublishStatus?> GetByIdAsync(byte pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<PublishStatus>(
            $"{SelectSql} WHERE s.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task CreateAsync(PublishStatusRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        await connection.ExecuteAsync("""
            INSERT INTO PublishStatus (pkid, Description, IsDraft, IsPublished, IsDiscontinued)
            VALUES (@Pkid, @Description, @IsDraft, @IsPublished, @IsDiscontinued)
            """, request);

        var created = await GetForAuditAsync(connection, request.Pkid);
        if (created is not null)
            await auditWriter.LogInsertAsync(TableName, created, connection);
    }

    public async Task<bool> UpdateAsync(PublishStatusRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var before = await GetForAuditAsync(connection, request.Pkid);
        var affected = await connection.ExecuteAsync("""
            UPDATE PublishStatus
            SET Description = @Description, IsDraft = @IsDraft,
                IsPublished = @IsPublished, IsDiscontinued = @IsDiscontinued
            WHERE pkid = @Pkid
            """, request);
        if (affected == 0)
            return false;

        var after = await GetForAuditAsync(connection, request.Pkid);
        if (before is not null && after is not null)
            await auditWriter.LogUpdateAsync(TableName, before, after, connection);
        return true;
    }

    public async Task<bool> DeleteAsync(byte pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var row = await GetForAuditAsync(connection, pkid);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM PublishStatus WHERE pkid = @Pkid", new { Pkid = pkid });
        if (affected == 0)
            return false;

        if (row is not null)
            await auditWriter.LogDeleteAsync(TableName, row, connection);
        return true;
    }

    public async Task<bool> ExistsAsync(byte pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM PublishStatus WHERE pkid = @Pkid", new { Pkid = pkid });
        return count > 0;
    }

    private static Task<PublishStatus?> GetForAuditAsync(IDbConnection connection, byte pkid) =>
        connection.QuerySingleOrDefaultAsync<PublishStatus>(
            $"{SelectSql} WHERE s.pkid = @Pkid", new { Pkid = pkid });
}
