namespace CMS.API.Models;

public class FeaturedPromoItemQuery
{
    // One-week board: Monday..Sunday range on ScheduleOn
    public DateOnly? ScheduleOnFrom { get; set; }
    public DateOnly? ScheduleOnTo { get; set; }
    public short? TrainingCenterPkid { get; set; }
}
