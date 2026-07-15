namespace CMS.API.Models;

// POST /api/auth/change-password body. Plain passwords only — hashing happens
// server-side, and the target user always comes from the validated JWT, so a
// userId in the JSON body has no property to bind to and is ignored.
public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmNewPassword { get; set; } = string.Empty;
}
