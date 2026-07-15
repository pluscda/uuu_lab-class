using CMS.API.Models;

namespace CMS.API.Repositories;

public interface IAppUserRepository
{
    Task<IEnumerable<AppUser>> GetAllAsync();
    Task<IEnumerable<AppUser>> QueryAsync(AppUserQuery query);
    Task<AppUser?> GetByIdAsync(string userId);
    Task<int> CreateAsync(AppUserRequest request);
    Task<bool> UpdateAsync(AppUserRequest request);
    Task<bool> DeleteAsync(string userId);
    Task<bool> ExistsAsync(string userId);

    /// <summary>Plain default password from SysConfig 'appConfig' JSON (defaultPassword).</summary>
    Task<string> GetDefaultPasswordAsync();

    /// <summary>
    /// Sets PasswordHash and PasswordUpdatedTime; false when the user does not exist.
    /// The caller supplies the hash — plain passwords never reach this method.
    /// </summary>
    Task<bool> ResetPasswordAsync(string userId, string passwordHash);
}
