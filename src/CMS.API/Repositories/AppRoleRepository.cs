using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class AppRoleRepository(IDbConnectionFactory connectionFactory) : IAppRoleRepository
{
    private const string SelectSql = """
        SELECT r.pkid, r.RoleId, r.RoleName, r.PermissionLevel, r.Description,
               (SELECT COUNT(*) FROM AppUserRole ur WHERE ur.RoleId = r.RoleId) AS UserCount
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

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(AppRoleRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

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

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(string roleId)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await connection.ExecuteAsync(
            "DELETE FROM AppUserRole WHERE RoleId = @RoleId",
            new { RoleId = roleId }, transaction);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM AppRole WHERE RoleId = @RoleId",
            new { RoleId = roleId }, transaction);

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

    private static async Task InsertUserRolesAsync(
        System.Data.IDbConnection connection, System.Data.IDbTransaction transaction, AppRoleRequest request)
    {
        if (request.UserIds.Count == 0) return;
        await connection.ExecuteAsync(
            "INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId)",
            request.UserIds.Distinct().Select(userId => new { UserId = userId, request.RoleId }),
            transaction);
    }
}
