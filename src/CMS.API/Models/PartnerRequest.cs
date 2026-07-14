using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class PartnerRequest
{
    // IDENTITY — ignored on create; identifies the row on update
    public short Pkid { get; set; }

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string AppKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string NameOnPartnerMenu { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string NameOnCourseDetailPage { get; set; } = string.Empty;

    [Required]
    public int DisplayOrder { get; set; }

    [MaxLength(50)]
    public string? ImageFilename { get; set; }
}
