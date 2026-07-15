namespace CMS.API.Models;

// Internal result of a successful credential check; never serialized to clients directly
public class LoginUser
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public List<string> RoleIds { get; set; } = [];
}
