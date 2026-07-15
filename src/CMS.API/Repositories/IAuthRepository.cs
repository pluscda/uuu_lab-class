using CMS.API.Models;

namespace CMS.API.Repositories;

public interface IAuthRepository
{
    /// <summary>
    /// Returns the user (with RoleIds) when UserId matches, IsActive = 1 and
    /// PasswordHash equals the supplied hash; otherwise null.
    /// </summary>
    Task<LoginUser?> GetUserForLoginAsync(string userId, string passwordHash);

    /// <summary>JWT signing secret from SysConfig 'appConfig' JSON (symmetricSecurityKey).</summary>
    Task<string> GetSymmetricSecurityKeyAsync();

    /// <summary>Updates UserName only; false when the user does not exist.</summary>
    Task<bool> UpdateUserNameAsync(string userId, string userName);

    /// <summary>
    /// Atomically sets PasswordHash and PasswordUpdatedTime, but only when the
    /// stored PasswordHash equals <paramref name="currentPasswordHash"/> and the
    /// user is active; false (nothing changed) otherwise.
    /// </summary>
    Task<bool> ChangePasswordAsync(string userId, string currentPasswordHash, string newPasswordHash);
}
