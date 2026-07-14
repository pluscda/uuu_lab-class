using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class PublishStatusRequest
{
    // pkid is not IDENTITY — the client assigns it on create; immutable on update
    [Required]
    public byte Pkid { get; set; }

    [Required]
    [MaxLength(50)]
    public string Description { get; set; } = string.Empty;

    public bool IsDraft { get; set; }

    public bool IsPublished { get; set; }

    public bool IsDiscontinued { get; set; }
}
