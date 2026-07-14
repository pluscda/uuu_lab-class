using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class CourseRequest
{
    // IDENTITY — ignored on create; identifies the row on update
    public int Pkid { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? OfficialTitle { get; set; }

    [Required]
    [MaxLength(50)]
    public string CourseId { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ProdCourseId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FriendlyUrl { get; set; } = string.Empty;

    [Required]
    public int DisplayOrder { get; set; }

    [Required]
    public short PartnerPkid { get; set; }

    public short? CourseGroupPkid { get; set; }

    [Required]
    public byte PublishStatusPkid { get; set; }

    [Required]
    public DateOnly ScheduleOn { get; set; }

    [Required]
    public DateOnly ScheduleOff { get; set; }

    [Required]
    public short Hour { get; set; }

    [Required]
    public decimal ListPrice { get; set; }

    [Required]
    public decimal LearningCredit { get; set; }

    [MaxLength(500)]
    public string? Material { get; set; }

    [MaxLength(4000)]
    public string? Objective { get; set; }

    [MaxLength(500)]
    public string? Target { get; set; }

    [MaxLength(4000)]
    public string? Prerequisites { get; set; }

    public string? Outline { get; set; }

    public string? TowardCertOrExam { get; set; }

    [MaxLength(4000)]
    public string? Note { get; set; }

    [MaxLength(4000)]
    public string? OtherInfo { get; set; }

    public bool CanRepeat { get; set; }

    public List<int> CertificationPkids { get; set; } = [];
    public List<short> JobCategoryPkids { get; set; } = [];
}
