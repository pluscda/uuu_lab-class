namespace CMS.API.Models;

public class AppRoleQuery
{
    public string? Keyword { get; set; }
    public int? PermissionLevelFrom { get; set; }
    public int? PermissionLevelTo { get; set; }
}
