using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class AppUserRepository(IDbConnectionFactory connectionFactory) : IAppUserRepository
{
    // PasswordHash is backend-only and never selected
    private const string SelectSql = """
        SELECT u.pkid, u.UserId, u.UserName, u.IsActive, u.PasswordUpdatedTime,
               (SELECT COUNT(*) FROM AppUserRole ur WHERE ur.UserId = u.UserId) AS RoleCount
        FROM AppUser u
        """;

    public async Task<IEnumerable<AppUser>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppUser>($"{SelectSql} ORDER BY u.pkid ASC");
    }

    public async Task<IEnumerable<AppUser>> QueryAsync(AppUserQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("(u.UserId LIKE @Keyword OR u.UserName LIKE @Keyword)");
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }
        if (query.IsActive.HasValue)
        {
            conditions.Add("u.IsActive = @IsActive");
            parameters.Add("IsActive", query.IsActive.Value);
        }
        if (query.PasswordUpdatedTimeFrom.HasValue)
        {
            conditions.Add("u.PasswordUpdatedTime >= @PasswordUpdatedTimeFrom");
            parameters.Add("PasswordUpdatedTimeFrom", query.PasswordUpdatedTimeFrom.Value.ToDateTime(TimeOnly.MinValue));
        }
        if (query.PasswordUpdatedTimeTo.HasValue)
        {
            // datetime column: To is inclusive, so compare against the next day's midnight
            conditions.Add("u.PasswordUpdatedTime < @PasswordUpdatedTimeTo");
            parameters.Add("PasswordUpdatedTimeTo", query.PasswordUpdatedTimeTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppUser>($"{SelectSql}{where} ORDER BY u.pkid ASC", parameters);
    }

    public async Task<AppUser?> GetByIdAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();
        var user = await connection.QuerySingleOrDefaultAsync<AppUser>(
            $"{SelectSql} WHERE u.UserId = @UserId", new { UserId = userId });
        if (user is null) return null;

        var roleIds = await connection.QueryAsync<string>(
            "SELECT RoleId FROM AppUserRole WHERE UserId = @UserId ORDER BY RoleId ASC",
            new { UserId = userId });
        user.RoleIds = roleIds.ToList();
        return user;
    }

    public async Task<int> CreateAsync(AppUserRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var passwordHash = Sha256Hex(await GetDefaultPasswordAsync(connection, transaction));

        var pkid = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO AppUser (UserId, UserName, IsActive, PasswordHash)
            VALUES (@UserId, @UserName, @IsActive, @PasswordHash);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """,
            new { request.UserId, request.UserName, request.IsActive, PasswordHash = passwordHash },
            transaction);

        await InsertUserRolesAsync(connection, transaction, request);

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(AppUserRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        // PasswordHash / PasswordUpdatedTime are never touched here
        var affected = await connection.ExecuteAsync("""
            UPDATE AppUser
            SET UserName = @UserName, IsActive = @IsActive
            WHERE UserId = @UserId
            """, request, transaction);

        if (affected == 0)
        {
            transaction.Rollback();
            return false;
        }

        // n-n: delete-then-reinsert
        await connection.ExecuteAsync(
            "DELETE FROM AppUserRole WHERE UserId = @UserId",
            new { request.UserId }, transaction);
        await InsertUserRolesAsync(connection, transaction, request);

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await connection.ExecuteAsync(
            "DELETE FROM AppUserRole WHERE UserId = @UserId",
            new { UserId = userId }, transaction);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM AppUser WHERE UserId = @UserId",
            new { UserId = userId }, transaction);

        transaction.Commit();
        return affected > 0;
    }

    public async Task<bool> ExistsAsync(string userId)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM AppUser WHERE UserId = @UserId", new { UserId = userId });
        return count > 0;
    }

    public async Task<string> GetDefaultPasswordAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await GetDefaultPasswordAsync(connection, transaction: null);
    }

    public async Task<bool> ResetPasswordAsync(string userId, string passwordHash)
    {
        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync("""
            UPDATE AppUser
            SET PasswordHash = @PasswordHash, PasswordUpdatedTime = GETUTCDATE()
            WHERE UserId = @UserId
            """, new { UserId = userId, PasswordHash = passwordHash });
        return affected > 0;
    }

    // Default password comes from SysConfig 'appConfig' (JSON: { "defaultPassword": "..." })
    private static async Task<string> GetDefaultPasswordAsync(IDbConnection connection, IDbTransaction? transaction)
    {
        var configValue = await connection.ExecuteScalarAsync<string?>(
            "SELECT configValue FROM SysConfig WHERE configKey = 'appConfig'",
            transaction: transaction);
        if (string.IsNullOrWhiteSpace(configValue))
            throw new InvalidOperationException("SysConfig 'appConfig' not found — cannot derive the default password.");

        using var json = JsonDocument.Parse(configValue);
        if (!json.RootElement.TryGetProperty("defaultPassword", out var defaultPassword)
            || defaultPassword.ValueKind != JsonValueKind.String)
            throw new InvalidOperationException("SysConfig 'appConfig' has no 'defaultPassword' property.");

        return defaultPassword.GetString()!;
    }

    // Login hash convention: SHA-256 of the UTF-8 bytes, uppercase hex
    private static string Sha256Hex(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static async Task InsertUserRolesAsync(
        IDbConnection connection, IDbTransaction transaction, AppUserRequest request)
    {
        if (request.RoleIds.Count == 0) return;
        await connection.ExecuteAsync(
            "INSERT INTO AppUserRole (UserId, RoleId) VALUES (@UserId, @RoleId)",
            request.RoleIds.Distinct().Select(roleId => new { request.UserId, RoleId = roleId }),
            transaction);
    }
}
