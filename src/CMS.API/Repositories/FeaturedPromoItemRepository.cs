using System.Data;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Dapper;

namespace CMS.API.Repositories;

public class FeaturedPromoItemRepository(IDbConnectionFactory connectionFactory, IRowAuditWriter auditWriter) : IFeaturedPromoItemRepository
{
    private const string TableName = "FeaturedPromoItem";

    private const string SelectSql = """
        SELECT f.pkid, f.ScheduleOn, f.TrainingCenter_pkid AS TrainingCenterPkid, f.Slot,
               f.Promotion_pkid AS PromotionPkid, f.Topic, f.Description,
               p.PromoCode
        FROM FeaturedPromoItem f
        INNER JOIN Promotion2 p ON p.pkid = f.Promotion_pkid
        """;

    // Real FeaturedPromoItem columns only — no JOINed PromoCode, so a changed
    // Promotion_pkid reports just PromotionPkid and not the label pseudo-column too.
    private const string AuditSelectSql = """
        SELECT f.pkid, f.ScheduleOn, f.TrainingCenter_pkid AS TrainingCenterPkid, f.Slot,
               f.Promotion_pkid AS PromotionPkid, f.Topic, f.Description
        FROM FeaturedPromoItem f
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
        var pkid = await connection.ExecuteScalarAsync<int>("""
            INSERT INTO FeaturedPromoItem (ScheduleOn, TrainingCenter_pkid, Slot, Promotion_pkid, Topic, Description)
            VALUES (@ScheduleOn, @TrainingCenterPkid, @Slot, @PromotionPkid, @Topic, @Description);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """, request);

        var created = await GetForAuditAsync(connection, pkid);
        if (created is not null)
            await auditWriter.LogInsertAsync(TableName, created, connection);
        return pkid;
    }

    public async Task<bool> UpdateAsync(FeaturedPromoItemRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var before = await GetForAuditAsync(connection, request.Pkid);
        var affected = await connection.ExecuteAsync("""
            UPDATE FeaturedPromoItem
            SET ScheduleOn = @ScheduleOn, TrainingCenter_pkid = @TrainingCenterPkid, Slot = @Slot,
                Promotion_pkid = @PromotionPkid, Topic = @Topic, Description = @Description
            WHERE pkid = @Pkid
            """, request);
        if (affected == 0)
            return false;

        var after = await GetForAuditAsync(connection, request.Pkid);
        if (before is not null && after is not null)
            await auditWriter.LogUpdateAsync(TableName, before, after, connection);
        return true;
    }

    public async Task<bool> DeleteAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var row = await GetForAuditAsync(connection, pkid);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM FeaturedPromoItem WHERE pkid = @Pkid", new { Pkid = pkid });
        if (affected == 0)
            return false;

        if (row is not null)
            await auditWriter.LogDeleteAsync(TableName, row, connection);
        return true;
    }

    public async Task<bool> MoveSlotAsync(int pkid, int direction)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var item = await GetForAuditAsync(connection, pkid, transaction);
        if (item is null)
            return false;

        var targetSlot = item.Slot + direction;
        if (targetSlot is < 1 or > 3)
            return true; // already at the boundary — nothing to do

        var occupantPkid = await connection.ExecuteScalarAsync<int?>("""
            SELECT pkid FROM FeaturedPromoItem
            WHERE ScheduleOn = @ScheduleOn AND TrainingCenter_pkid = @TrainingCenterPkid AND Slot = @Slot
            """, new { item.ScheduleOn, item.TrainingCenterPkid, Slot = targetSlot }, transaction);

        FeaturedPromoItem? occupantBefore = null;
        if (occupantPkid.HasValue)
        {
            occupantBefore = await GetForAuditAsync(connection, occupantPkid.Value, transaction);

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

        // One Update audit row per moved item (the swap occupant gets its own)
        await LogSlotChangeAsync(connection, transaction, item);
        if (occupantBefore is not null)
            await LogSlotChangeAsync(connection, transaction, occupantBefore);

        transaction.Commit();
        return true;
    }

    private async Task LogSlotChangeAsync(
        IDbConnection connection, IDbTransaction transaction, FeaturedPromoItem before)
    {
        var after = await GetForAuditAsync(connection, before.Pkid, transaction);
        if (after is not null)
            await auditWriter.LogUpdateAsync(TableName, before, after, connection, transaction);
    }

    private static Task<FeaturedPromoItem?> GetForAuditAsync(
        IDbConnection connection, int pkid, IDbTransaction? transaction = null) =>
        connection.QuerySingleOrDefaultAsync<FeaturedPromoItem>(
            $"{AuditSelectSql} WHERE f.pkid = @Pkid", new { Pkid = pkid }, transaction);
}
