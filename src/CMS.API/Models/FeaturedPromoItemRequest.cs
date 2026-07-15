using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class FeaturedPromoItemRequest
{
    // IDENTITY — ignored on create; identifies the row on update
    public int Pkid { get; set; }

    [Required]
    public DateOnly ScheduleOn { get; set; }

    [Required]
    public short TrainingCenterPkid { get; set; }

    [Required]
    [Range(1, 3)]
    public byte Slot { get; set; }

    [Required]
    public int PromotionPkid { get; set; }

    [Required]
    [MaxLength(100)]
    public string Topic { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string Description { get; set; } = string.Empty;
}
