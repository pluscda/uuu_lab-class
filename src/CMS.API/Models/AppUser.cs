namespace CMS.API.Models;

public class AppUser
{
    public int Pkid { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    // Backend-only PasswordHash is never exposed; this is the only password-related field returned
    public DateTime? PasswordUpdatedTime { get; set; }
    // Subquery count of AppUserRole rows for this user
    public int RoleCount { get; set; }
    // Populated on GET by id:
    public List<string> RoleIds { get; set; } = [];
}
