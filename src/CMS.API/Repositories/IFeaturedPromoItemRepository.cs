using CMS.API.Models;

namespace CMS.API.Repositories;

public interface IFeaturedPromoItemRepository
{
    Task<IEnumerable<FeaturedPromoItem>> GetAllAsync();
    Task<IEnumerable<FeaturedPromoItem>> QueryAsync(FeaturedPromoItemQuery query);
    Task<FeaturedPromoItem?> GetByIdAsync(int pkid);
    Task<bool> ExistsAsync(DateOnly scheduleOn, short trainingCenterPkid, byte slot);
    Task<int> CreateAsync(FeaturedPromoItemRequest request);
    Task<bool> UpdateAsync(FeaturedPromoItemRequest request);
    Task<bool> DeleteAsync(int pkid);
    /// <summary>Move an item one slot up/down; swaps with the occupant of the target slot if any.</summary>
    Task<bool> MoveSlotAsync(int pkid, int direction);
}
