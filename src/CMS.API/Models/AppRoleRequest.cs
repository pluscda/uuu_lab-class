using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class AppRoleRequest
{
    [Required]
    [MaxLength(200)]
    public string RoleId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string RoleName { get; set; } = string.Empty;

    [Required]
    public int PermissionLevel { get; set; } = 100;

    [MaxLength(400)]
    public string? Description { get; set; }

    public List<string> UserIds { get; set; } = [];
}
