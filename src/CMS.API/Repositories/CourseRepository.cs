using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class CourseRepository(IDbConnectionFactory connectionFactory) : ICourseRepository
{
    private const string SelectSql = """
        SELECT c.pkid, c.Title, c.OfficialTitle, c.CourseId, c.ProdCourseId, c.FriendlyUrl,
               c.DisplayOrder, c.Partner_pkid AS PartnerPkid, c.CourseGroup_pkid AS CourseGroupPkid,
               c.PublishStatus_pkid AS PublishStatusPkid, c.ScheduleOn, c.ScheduleOff,
               c.Hour, c.ListPrice, c.LearningCredit, c.Material, c.Objective, c.Target,
               c.Prerequisites, c.Outline, c.TowardCertOrExam, c.Note, c.OtherInfo, c.CanRepeat,
               p.Name AS PartnerName,
               g.Description AS CourseGroupDescription,
               s.Description AS PublishStatusDescription
        FROM Course c
        JOIN Partner p ON p.pkid = c.Partner_pkid
        LEFT JOIN CourseGroup g ON g.pkid = c.CourseGroup_pkid
        JOIN PublishStatus s ON s.pkid = c.PublishStatus_pkid
        """;

    private const string InsertColumns = """
        Title, OfficialTitle, CourseId, ProdCourseId, FriendlyUrl, DisplayOrder,
        Partner_pkid, CourseGroup_pkid, PublishStatus_pkid, ScheduleOn, ScheduleOff, Hour,
        ListPrice, LearningCredit, Material, Objective, Target, Prerequisites, Outline,
        TowardCertOrExam, Note, OtherInfo, CanRepeat
        """;

    public async Task<IEnumerable<Course>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Course>($"{SelectSql} ORDER BY c.CourseId ASC");
    }

    public async Task<IEnumerable<Course>> QueryAsync(CourseQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("""
                (c.Title LIKE @Keyword OR c.OfficialTitle LIKE @Keyword OR c.CourseId LIKE @Keyword
                 OR c.ProdCourseId LIKE @Keyword OR c.FriendlyUrl LIKE @Keyword)
                """);
            parameters.Add("Keyword", $"%{query.Keyword.Trim()}%");
        }
        if (query.PartnerPkid.HasValue)
        {
            conditions.Add("c.Partner_pkid = @PartnerPkid");
            parameters.Add("PartnerPkid", query.PartnerPkid.Value);
        }
        if (query.CourseGroupPkid.HasValue)
        {
            conditions.Add("c.CourseGroup_pkid = @CourseGroupPkid");
            parameters.Add("CourseGroupPkid", query.CourseGroupPkid.Value);
        }
        if (query.PublishStatusPkid.HasValue)
        {
            conditions.Add("c.PublishStatus_pkid = @PublishStatusPkid");
            parameters.Add("PublishStatusPkid", query.PublishStatusPkid.Value);
        }
        if (query.ScheduleOnFrom.HasValue)
        {
            conditions.Add("c.ScheduleOn >= @ScheduleOnFrom");
            parameters.Add("ScheduleOnFrom", query.ScheduleOnFrom.Value);
        }
        if (query.ScheduleOnTo.HasValue)
        {
            conditions.Add("c.ScheduleOn <= @ScheduleOnTo");
            parameters.Add("ScheduleOnTo", query.ScheduleOnTo.Value);
        }
        if (query.ScheduleOffFrom.HasValue)
        {
            conditions.Add("c.ScheduleOff >= @ScheduleOffFrom");
            parameters.Add("ScheduleOffFrom", query.ScheduleOffFrom.Value);
        }
        if (query.ScheduleOffTo.HasValue)
        {
            conditions.Add("c.ScheduleOff <= @ScheduleOffTo");
            parameters.Add("ScheduleOffTo", query.ScheduleOffTo.Value);
        }
        if (query.CanRepeat.HasValue)
        {
            conditions.Add("c.CanRepeat = @CanRepeat");
            parameters.Add("CanRepeat", query.CanRepeat.Value);
        }

        var where = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : string.Empty;

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Course>($"{SelectSql}{where} ORDER BY c.CourseId ASC", parameters);
    }

    public async Task<Course?> GetByIdAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var course = await connection.QuerySingleOrDefaultAsync<Course>(
            $"{SelectSql} WHERE c.pkid = @Pkid", new { Pkid = pkid });
        if (course is null) return null;

        var certificationPkids = await connection.QueryAsync<int>(
            "SELECT Certification_pkid FROM CourseInCertification WHERE Course_pkid = @Pkid ORDER BY Certification_pkid ASC",
            new { Pkid = pkid });
        course.CertificationPkids = certificationPkids.ToList();

        var jobCategoryPkids = await connection.QueryAsync<short>(
            "SELECT JobCategory_pkid FROM CourseJobCategories WHERE Course_pkid = @Pkid ORDER BY JobCategory_pkid ASC",
            new { Pkid = pkid });
        course.JobCategoryPkids = jobCategoryPkids.ToList();

        return course;
    }

    public async Task<int> CreateAsync(CourseRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var pkid = await connection.ExecuteScalarAsync<int>($"""
            INSERT INTO Course ({InsertColumns})
            VALUES (@Title, @OfficialTitle, @CourseId, @ProdCourseId, @FriendlyUrl, @DisplayOrder,
                @PartnerPkid, @CourseGroupPkid, @PublishStatusPkid, @ScheduleOn, @ScheduleOff, @Hour,
                @ListPrice, @LearningCredit, @Material, @Objective, @Target, @Prerequisites, @Outline,
                @TowardCertOrExam, @Note, @OtherInfo, @CanRepeat);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """, request, transaction);

        await InsertRelationsAsync(connection, transaction, pkid, request);

        transaction.Commit();
        return pkid;
    }

    public async Task<bool> UpdateAsync(CourseRequest request)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var affected = await connection.ExecuteAsync("""
            UPDATE Course
            SET Title = @Title, OfficialTitle = @OfficialTitle, CourseId = @CourseId,
                ProdCourseId = @ProdCourseId, FriendlyUrl = @FriendlyUrl, DisplayOrder = @DisplayOrder,
                Partner_pkid = @PartnerPkid, CourseGroup_pkid = @CourseGroupPkid,
                PublishStatus_pkid = @PublishStatusPkid, ScheduleOn = @ScheduleOn,
                ScheduleOff = @ScheduleOff, Hour = @Hour, ListPrice = @ListPrice,
                LearningCredit = @LearningCredit, Material = @Material, Objective = @Objective,
                Target = @Target, Prerequisites = @Prerequisites, Outline = @Outline,
                TowardCertOrExam = @TowardCertOrExam, Note = @Note, OtherInfo = @OtherInfo,
                CanRepeat = @CanRepeat
            WHERE pkid = @Pkid
            """, request, transaction);

        if (affected == 0)
        {
            transaction.Rollback();
            return false;
        }

        // n-n: delete-then-reinsert
        await DeleteRelationsAsync(connection, transaction, request.Pkid);
        await InsertRelationsAsync(connection, transaction, request.Pkid, request);

        transaction.Commit();
        return true;
    }

    public async Task<bool> DeleteAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await DeleteRelationsAsync(connection, transaction, pkid);
        var affected = await connection.ExecuteAsync(
            "DELETE FROM Course WHERE pkid = @Pkid", new { Pkid = pkid }, transaction);

        transaction.Commit();
        return affected > 0;
    }

    private static async Task DeleteRelationsAsync(
        System.Data.IDbConnection connection, System.Data.IDbTransaction transaction, int pkid)
    {
        await connection.ExecuteAsync(
            "DELETE FROM CourseInCertification WHERE Course_pkid = @Pkid",
            new { Pkid = pkid }, transaction);
        await connection.ExecuteAsync(
            "DELETE FROM CourseJobCategories WHERE Course_pkid = @Pkid",
            new { Pkid = pkid }, transaction);
    }

    private static async Task InsertRelationsAsync(
        System.Data.IDbConnection connection, System.Data.IDbTransaction transaction,
        int pkid, CourseRequest request)
    {
        if (request.CertificationPkids.Count > 0)
        {
            await connection.ExecuteAsync(
                "INSERT INTO CourseInCertification (Course_pkid, Certification_pkid) VALUES (@CoursePkid, @CertificationPkid)",
                request.CertificationPkids.Distinct()
                    .Select(id => new { CoursePkid = pkid, CertificationPkid = id }),
                transaction);
        }
        if (request.JobCategoryPkids.Count > 0)
        {
            await connection.ExecuteAsync(
                "INSERT INTO CourseJobCategories (Course_pkid, JobCategory_pkid) VALUES (@CoursePkid, @JobCategoryPkid)",
                request.JobCategoryPkids.Distinct()
                    .Select(id => new { CoursePkid = pkid, JobCategoryPkid = id }),
                transaction);
        }
    }
}
