using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class LoginRequest
{
    [Required]
    [MaxLength(200)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
