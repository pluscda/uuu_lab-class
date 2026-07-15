using System.Text.Json;
using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class AuthRepository(IDbConnectionFactory connectionFactory) : IAuthRepository
{
    public async Task<LoginUser?> GetUserForLoginAsync(string userId, string passwordHash)
    {
        using var connection = connectionFactory.CreateConnection();
        var user = await connection.QuerySingleOrDefaultAsync<LoginUser>("""
            SELECT UserId, UserName
            FROM AppUser
            WHERE UserId = @UserId AND IsActive = 1 AND PasswordHash = @PasswordHash
            """, new { UserId = userId, PasswordHash = passwordHash });
        if (user is null) return null;

        var roleIds = await connection.QueryAsync<string>(
            "SELECT RoleId FROM AppUserRole WHERE UserId = @UserId ORDER BY RoleId ASC",
            new { UserId = userId });
        user.RoleIds = roleIds.ToList();
        return user;
    }

    public async Task<bool> UpdateUserNameAsync(string userId, string userName)
    {
        using var connection = connectionFactory.CreateConnection();
        var rows = await connection.ExecuteAsync(
            "UPDATE AppUser SET UserName = @UserName WHERE UserId = @UserId",
            new { UserId = userId, UserName = userName });
        return rows > 0;
    }

    public async Task<bool> ChangePasswordAsync(string userId, string currentPasswordHash, string newPasswordHash)
    {
        using var connection = connectionFactory.CreateConnection();
        // The current-password check lives in the WHERE clause so verify + update
        // is one atomic statement: a wrong current password changes nothing.
        var rows = await connection.ExecuteAsync("""
            UPDATE AppUser
            SET PasswordHash = @NewPasswordHash, PasswordUpdatedTime = GETUTCDATE()
            WHERE UserId = @UserId AND IsActive = 1 AND PasswordHash = @CurrentPasswordHash
            """, new { UserId = userId, NewPasswordHash = newPasswordHash, CurrentPasswordHash = currentPasswordHash });
        return rows > 0;
    }

    public async Task<string> GetSymmetricSecurityKeyAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        var configValue = await connection.ExecuteScalarAsync<string?>(
            "SELECT configValue FROM SysConfig WHERE configKey = 'appConfig'");
        if (string.IsNullOrWhiteSpace(configValue))
            throw new InvalidOperationException("SysConfig 'appConfig' not found — cannot sign access tokens.");

        using var json = JsonDocument.Parse(configValue);
        if (!json.RootElement.TryGetProperty("symmetricSecurityKey", out var key)
            || key.ValueKind != JsonValueKind.String)
            throw new InvalidOperationException("SysConfig 'appConfig' has no 'symmetricSecurityKey' property.");

        return key.GetString()!;
    }
}
