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
}
