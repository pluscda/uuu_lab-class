namespace CMS.API.Models;

// PUT /api/auth/profile body. Deliberately carries ONLY UserName: the target
// user always comes from the validated JWT, so a userId (or roles) in the JSON
// body has no property to bind to and is ignored.
public class UpdateProfileRequest
{
    public string UserName { get; set; } = string.Empty;
}
