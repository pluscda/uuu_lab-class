using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class AppRoleRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IAppRoleRepository
{
    private const string TableName = "AppRole";

    private const string SelectSql = """
        SELECT r.pkid, r.RoleId, r.RoleName, r.PermissionLevel, r.Description,
               (SELECT COUNT(*) FROM AppUserRole ur WHERE ur.RoleId = r.RoleId) AS UserCount
        FROM AppRole r
        """;

    // Real AppRole columns only — no UserCount subquery, so the update diff never
    // reports a pseudo-column when only role assignments changed.
    private const string AuditSelectSql = """
        SELECT r.pkid, r.RoleId, r.RoleName, r.PermissionLevel, r.Description
        FROM AppRole r
        """;

    public async Task<IEnumerable<AppRole>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppRole>($"{SelectSql} ORDER BY r.pkid ASC");
    }

    public async Task<IEnumerable<AppRole>> QueryAsync(AppRoleQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("(r.RoleId LIKE @Keyword OR r.RoleName LIKE @Keyword OR r.Description LIKE @Keyword)");
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }
        if (query.PermissionLevelFrom.HasValue)
        {
            conditions.Add("r.PermissionLevel >= @PermissionLevelFrom");
            parameters.Add("PermissionLevelFrom", query.PermissionLevelFrom.Value);
        }
        if (query.PermissionLevelTo.HasValue)
        {
            conditions.Add("r.PermissionLevel <= @PermissionLevelTo");
            parameters.Add("PermissionLevelTo", query.PermissionLevelTo.Value);
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppRole>($"{SelectSql}{where} ORDER BY r.pkid ASC", parameters);
    }

    public async Task<AppRole?> GetByIdAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();
        var role = await connection.QuerySingleOrDefaultAsync<AppRole>(
            $"{SelectSql} WHERE r.RoleId = @RoleId", new { RoleId = roleId });
        if (role is null) return null;

        var userIds = await connection.QueryAsync<string>(
            "SELECT UserId FROM AppUserRole WHERE RoleId = @RoleId ORDER BY UserId ASC",
            new { RoleId = roleId });
        role.UserIds = userIds.ToList();
        return role;
    }

    public async Task<int> CreateAsync(AppRoleRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var pkid = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO AppRole (RoleId, RoleName, PermissionLevel, Description)
            VALUES (@RoleId, @RoleName, @PermissionLevel, @Description);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """, request, transaction);

        await InsertUserRolesAsync(connection, transaction, request);

        var created = await GetForAuditAsync(connection, transaction, request.RoleId);
        if (created is not null)
            await auditWriter.LogInsertAsync(TableName, created, connection, transaction);

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(AppRoleRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var before = await GetForAuditAsync(connection, transaction, request.RoleId);

        var affected = await connection.ExecuteAsync("""
            UPDATE AppRole
            SET RoleName = @RoleName, PermissionLevel = @PermissionLevel, Description = @Description
            WHERE RoleId = @RoleId
            """, request, transaction);

        if (affected == 0)
        {
            transaction.Rollback();
            return false;
        }

        // n-n: delete-then-reinsert
        await connection.ExecuteAsync(
            "DELETE FROM AppUserRole WHERE RoleId = @RoleId",
            new { request.RoleId }, transaction);
        await InsertUserRolesAsync(connection, transaction, request);

        var after = await GetForAuditAsync(connection, transaction, request.RoleId);
        if (before is not null && after is not null)
            await auditWriter.LogUpdateAsync(TableName, before, after, connection, transaction);

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var row = await GetForAuditAsync(connection, transaction, roleId);

        await connection.ExecuteAsync(
            "DELETE FROM AppUserRole WHERE RoleId = @RoleId",
            new { RoleId = roleId }, transaction);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM AppRole WHERE RoleId = @RoleId",
            new { RoleId = roleId }, transaction);

        if (affected > 0 && row is not null)
            await auditWriter.LogDeleteAsync(TableName, row, connection, transaction);

        transaction.Commit();
        return affected > 0;
    }

    public async Task<bool> ExistsAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM AppRole WHERE RoleId = @RoleId", new { RoleId = roleId });
        return count > 0;
    }

    private static Task<AppRole?> GetForAuditAsync(
        IDbConnection connection, IDbTransaction transaction, string roleId) =>
        connection.QuerySingleOrDefaultAsync<AppRole>(
            $"{AuditSelectSql} WHERE r.RoleId = @RoleId", new { RoleId = roleId }, transaction);

    private static async Task InsertUserRolesAsync(
        IDbConnection connection, IDbTransaction transaction, AppRoleRequest request)
    {
        if (request.UserIds.Count == 0) return;
        await connection.ExecuteAsync(
            "INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId)",
            request.UserIds.Distinct().Select(userId => new { UserId = userId, request.RoleId }),
            transaction);
    }
}
