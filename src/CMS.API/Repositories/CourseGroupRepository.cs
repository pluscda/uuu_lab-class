using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class CourseGroupRepository(IDbConnectionFactory connectionFactory) : ICourseGroupRepository
{
    private const string SelectSql = """
        SELECT g.pkid, g.Description
        FROM CourseGroup g
        """;

    public async Task<IEnumerable<CourseGroup>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroup>($"{SelectSql} ORDER BY g.pkid ASC");
    }

    public async Task<IEnumerable<CourseGroup>> QueryAsync(CourseGroupQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("g.Description LIKE @Keyword");
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroup>($"{SelectSql}{where} ORDER BY g.pkid ASC", parameters);
    }

    public async Task<CourseGroup?> GetByIdAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<CourseGroup>(
            $"{SelectSql} WHERE g.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<short> CreateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.ExecuteScalarAsync<short>("""
            INSERT INTO CourseGroup (Description)
            VALUES (@Description);
            SELECT CAST(SCOPE_IDENTITY() AS smallint);
            """, request);
    }

    public async Task<bool> UpdateAsync(CourseGroupRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync("""
            UPDATE CourseGroup
            SET Description = @Description
            WHERE pkid = @Pkid
            """, request);
        return affected > 0;
    }

    public async Task<bool> DeleteAsync(short pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var affected = await connection.ExecuteAsync(
            "DELETE FROM CourseGroup WHERE pkid = @Pkid", new { Pkid = pkid });
        return affected > 0;
    }
}
