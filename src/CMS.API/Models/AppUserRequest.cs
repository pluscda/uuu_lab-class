using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class AppUserRequest
{
    [Required]
    [MaxLength(200)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string UserName { get; set; } = string.Empty;

    [Required]
    public bool IsActive { get; set; } = true;

    public List<string> RoleIds { get; set; } = [];
}
