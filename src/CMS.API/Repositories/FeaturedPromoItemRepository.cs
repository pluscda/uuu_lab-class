using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class FeaturedPromoItemRepository(IDbConnectionFactory connectionFactory) : IFeaturedPromoItemRepository
{
    private const string SelectSql = """
        SELECT f.pkid, f.ScheduleOn, f.TrainingCenter_pkid AS TrainingCenterPkid, f.Slot,
               f.Promotion_pkid AS PromotionPkid, f.Topic, f.Description,
               p.PromoCode
        FROM FeaturedPromoItem f
        INNER JOIN Promotion2 p ON p.pkid = f.Promotion_pkid
        """;

    private const string OrderBySql = " ORDER BY f.ScheduleOn ASC, f.TrainingCenter_pkid ASC, f.Slot ASC";

    public async Task<IEnumerable<FeaturedPromoItem>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<FeaturedPromoItem>($"{SelectSql}{OrderBySql}");
    }

    public async Task<IEnumerable<FeaturedPromoItem>> QueryAsync(FeaturedPromoItemQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (query.ScheduleOnFrom.HasValue)
        {
            conditions.Add("f.ScheduleOn >= @ScheduleOnFrom");
            parameters.Add("ScheduleOnFrom", query.ScheduleOnFrom.Value);
        }

        if (query.ScheduleOnTo.HasValue)
        {
            conditions.Add("f.ScheduleOn <= @ScheduleOnTo");
            parameters.Add("ScheduleOnTo", query.ScheduleOnTo.Value);
        }

        if (query.TrainingCenterPkid.HasValue)
        {
            conditions.Add("f.TrainingCenter_pkid = @TrainingCenterPkid");
            parameters.Add("TrainingCenterPkid", query.TrainingCenterPkid.Value);
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<FeaturedPromoItem>($"{SelectSql}{where}{OrderBySql}", parameters);
    }

    public async Task<FeaturedPromoItem?> GetByIdAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<FeaturedPromoItem>(
            $"{SelectSql} WHERE f.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<bool> ExistsAsync(DateOnly scheduleOn, short trainingCenterPkid, byte slot)
    {
        using var connection = connectionFactory.CreateConnection();
        var count = await connection.ExecuteScalarAsync<int>("""
            SELECT COUNT(1) FROM FeaturedPromoItem
            WHERE ScheduleOn = @ScheduleOn AND TrainingCenter_pkid = @TrainingCenterPkid AND Slot = @Slot
            """, new { ScheduleOn = scheduleOn, TrainingCenterPkid = trainingCenterPkid, Slot = slot });
        return count > 0;
    }

    public async Task<int> CreateAsync(FeaturedPromoItemRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<int>("""
            INSERT INTO FeaturedPromoItem (ScheduleOn, TrainingCenter_pkid, Slot, Promotion_pkid, Topic, Description)
            VALUES (@ScheduleOn, @TrainingCenterPkid, @Slot, @PromotionPkid, @Topic, @Description);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """, request);
    }

    public async Task<bool> UpdateAsync(FeaturedPromoItemRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync("""
            UPDATE FeaturedPromoItem
            SET ScheduleOn = @ScheduleOn, TrainingCenter_pkid = @TrainingCenterPkid, Slot = @Slot,
                Promotion_pkid = @PromotionPkid, Topic = @Topic, Description = @Description
            WHERE pkid = @Pkid
            """, request);
        return affected > 0;
    }

    public async Task<bool> DeleteAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync(
            "DELETE FROM FeaturedPromoItem WHERE pkid = @Pkid", new { Pkid = pkid });
        return affected > 0;
    }

    public async Task<bool> MoveSlotAsync(int pkid, int direction)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var item = await connection.QuerySingleOrDefaultAsync<FeaturedPromoItem>("""
            SELECT pkid, ScheduleOn, TrainingCenter_pkid AS TrainingCenterPkid, Slot
            FROM FeaturedPromoItem WHERE pkid = @Pkid
            """, new { Pkid = pkid }, transaction);
        if (item is null)
            return false;

        var targetSlot = item.Slot + direction;
        if (targetSlot is < 1 or > 3)
            return true; // already at the boundary — nothing to do

        var occupantPkid = await connection.ExecuteScalarAsync<int?>("""
            SELECT pkid FROM FeaturedPromoItem
            WHERE ScheduleOn = @ScheduleOn AND TrainingCenter_pkid = @TrainingCenterPkid AND Slot = @Slot
            """, new { item.ScheduleOn, item.TrainingCenterPkid, Slot = targetSlot }, transaction);

        if (occupantPkid.HasValue)
        {
            // Swap via temp slot 0 so IX_FeaturedPromoItem_UniqueDateLocSlot never fires
            await connection.ExecuteAsync(
                "UPDATE FeaturedPromoItem SET Slot = 0 WHERE pkid = @Pkid",
                new { Pkid = pkid }, transaction);
            await connection.ExecuteAsync(
                "UPDATE FeaturedPromoItem SET Slot = @Slot WHERE pkid = @Pkid",
                new { Slot = item.Slot, Pkid = occupantPkid.Value }, transaction);
        }

        await connection.ExecuteAsync(
            "UPDATE FeaturedPromoItem SET Slot = @Slot WHERE pkid = @Pkid",
            new { Slot = targetSlot, Pkid = pkid }, transaction);

        transaction.Commit();
        return true;
    }
}
