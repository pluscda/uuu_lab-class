using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class PartnerRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IPartnerRepository
{
    private const string TableName = "Partner";

    private const string SelectSql = """
        SELECT p.pkid, p.Name, p.AppKey, p.NameOnPartnerMenu, p.NameOnCourseDetailPage,
               p.DisplayOrder, p.ImageFilename
        FROM Partner p
        """;

    public async Task<IEnumerable<Partner>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Partner>($"{SelectSql} ORDER BY p.DisplayOrder ASC");
    }

    public async Task<IEnumerable<Partner>> QueryAsync(PartnerQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("""
                (p.Name LIKE @Keyword OR p.AppKey LIKE @Keyword
                 OR p.NameOnPartnerMenu LIKE @Keyword OR p.NameOnCourseDetailPage LIKE @Keyword)
                """);
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Partner>($"{SelectSql}{where} ORDER BY p.DisplayOrder ASC", parameters);
    }

    public async Task<Partner?> GetByIdAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Partner>(
            $"{SelectSql} WHERE p.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<short> CreateAsync(PartnerRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var pkid = await connection.ExecuteScalarAsync<short>("""
            INSERT INTO Partner (Name, AppKey, NameOnPartnerMenu, NameOnCourseDetailPage, DisplayOrder, ImageFilename)
            VALUES (@Name, @AppKey, @NameOnPartnerMenu, @NameOnCourseDetailPage, @DisplayOrder, @ImageFilename);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request);

        var created = await GetForAuditAsync(connection, pkid);
        if (created is not null)
            await auditWriter.LogInsertAsync(TableName, created, connection);
        return pkid;
    }

    public async Task<bool> UpdateAsync(PartnerRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var before = await GetForAuditAsync(connection, request.Pkid);
        var affected = await connection.ExecuteAsync("""
            UPDATE Partner
            SET Name = @Name, AppKey = @AppKey, NameOnPartnerMenu = @NameOnPartnerMenu,
                NameOnCourseDetailPage = @NameOnCourseDetailPage, DisplayOrder = @DisplayOrder,
                ImageFilename = @ImageFilename
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
            "DELETE FROM Partner WHERE pkid = @Pkid", new { Pkid = pkid });
        if (affected == 0)
            return false;

        if (row is not null)
            await auditWriter.LogDeleteAsync(TableName, row, connection);
        return true;
    }

    private static Task<Partner?> GetForAuditAsync(IDbConnection connection, short pkid) =>
        connection.QuerySingleOrDefaultAsync<Partner>(
            $"{SelectSql} WHERE p.pkid = @Pkid", new { Pkid = pkid });
}
