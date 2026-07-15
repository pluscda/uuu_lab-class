using System.ComponentModel.DataAnnotations;

namespace CMS.API.Models;

public class FeaturedPromoItemMoveRequest
{
    // -1 = move up (e.g. 2 -> 1), +1 = move down (e.g. 1 -> 2)
    [Required]
    [Range(-1, 1)]
    public int Direction { get; set; }
}
