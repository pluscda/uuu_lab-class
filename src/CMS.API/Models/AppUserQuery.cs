namespace CMS.API.Models;

public class AppUserQuery
{
    public string? Keyword { get; set; }
    public bool? IsActive { get; set; }
    public DateOnly? PasswordUpdatedTimeFrom { get; set; }
    public DateOnly? PasswordUpdatedTimeTo { get; set; }
}
