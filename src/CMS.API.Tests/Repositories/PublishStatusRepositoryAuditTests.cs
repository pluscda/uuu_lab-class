using System.Data;
using System.Security.Claims;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Repositories;
using CMS.API.Services;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Moq;
using Xunit;

namespace CMS.API.Tests.Repositories;

// Proves the audit retrofit end-to-end for one repository: the real
// PublishStatusRepository and the real RowAuditWriter run against an in-memory
// SQLite database (PublishStatus SQL is portable — no SCOPE_IDENTITY), so every
// assertion covers the actual SQL both classes execute.
public sealed class PublishStatusRepositoryAuditTests : IDisposable
{
    // Named shared-cache in-memory DB: lives as long as one connection stays open,
    // and every connection the factory hands out sees the same data.
    private sealed class SqliteConnectionFactory : IDbConnectionFactory, IDisposable
    {
        private readonly string _connectionString =
            $"Data Source={Guid.NewGuid():N};Mode=Memory;Cache=Shared";
        private readonly SqliteConnection _keepAlive;

        public SqliteConnectionFactory()
        {
            _keepAlive = new SqliteConnection(_connectionString);
            _keepAlive.Open();
        }

        public IDbConnection CreateConnection() => new SqliteConnection(_connectionString);

        public void Dispose() => _keepAlive.Dispose();
    }

    private readonly SqliteConnectionFactory _factory = new();
    private readonly PublishStatusRepository _repository;

    public PublishStatusRepositoryAuditTests()
    {
        using var connection = _factory.CreateConnection();
        connection.Execute("""
            CREATE TABLE PublishStatus (
                pkid INTEGER PRIMARY KEY,
                Description TEXT NOT NULL,
                IsDraft INTEGER NOT NULL,
                IsPublished INTEGER NOT NULL,
                IsDiscontinued INTEGER NOT NULL
            );
            CREATE TABLE RowAudit (
                Pkid INTEGER PRIMARY KEY AUTOINCREMENT,
                TableName TEXT NOT NULL,
                UserName TEXT NOT NULL,
                PrimaryKeyValues TEXT NOT NULL,
                ActionType TEXT NOT NULL,
                ActionDesc TEXT NOT NULL,
                [DateTime] TEXT NOT NULL
            );
            """);

        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("userName", "Miles")], authenticationType: "Test"))
        });
        _repository = new PublishStatusRepository(
            _factory, new RowAuditWriter(_factory, accessor.Object));
    }

    public void Dispose() => _factory.Dispose();

    private static PublishStatusRequest Request(byte pkid = 7) => new()
    {
        Pkid = pkid,
        Description = "草稿",
        IsDraft = true,
        IsPublished = false,
        IsDiscontinued = false
    };

    private void Seed(byte pkid = 7)
    {
        using var connection = _factory.CreateConnection();
        connection.Execute("""
            INSERT INTO PublishStatus (pkid, Description, IsDraft, IsPublished, IsDiscontinued)
            VALUES (@Pkid, @Description, @IsDraft, @IsPublished, @IsDiscontinued)
            """, Request(pkid));
    }

    // DateTime column skipped: SQLite stores it as TEXT and the tests assert content, not time
    private List<RowAudit> AuditRows()
    {
        using var connection = _factory.CreateConnection();
        return connection.Query<RowAudit>(
            "SELECT TableName, UserName, PrimaryKeyValues, ActionType, ActionDesc FROM RowAudit").ToList();
    }

    [Fact]
    public async Task Create_WritesInsertAuditRow_WithFirstStringColumn()
    {
        await _repository.CreateAsync(Request());

        var row = Assert.Single(AuditRows());
        Assert.Equal("PublishStatus", row.TableName);
        Assert.Equal("Insert", row.ActionType);
        Assert.Equal("7", row.PrimaryKeyValues);
        Assert.Equal("草稿", row.ActionDesc); // Description is the first string column
        Assert.Equal("Miles", row.UserName);
    }

    [Fact]
    public async Task Update_WritesUpdateAuditRow_ListingExactlyTheChangedColumns()
    {
        Seed();
        var request = Request();
        request.Description = "已發布";
        request.IsPublished = true; // IsDraft/IsDiscontinued unchanged

        var updated = await _repository.UpdateAsync(request);

        Assert.True(updated);
        var row = Assert.Single(AuditRows());
        Assert.Equal("PublishStatus", row.TableName);
        Assert.Equal("Update", row.ActionType);
        Assert.Equal("7", row.PrimaryKeyValues);
        Assert.Equal("Description, IsPublished", row.ActionDesc);
    }

    [Fact]
    public async Task Update_WithNoChanges_WritesNoAuditRow()
    {
        Seed();

        var updated = await _repository.UpdateAsync(Request());

        Assert.True(updated);
        Assert.Empty(AuditRows());
    }

    [Fact]
    public async Task Delete_WritesDeleteAuditRow_WithFirstStringColumn()
    {
        Seed();

        var deleted = await _repository.DeleteAsync(7);

        Assert.True(deleted);
        var row = Assert.Single(AuditRows());
        Assert.Equal("PublishStatus", row.TableName);
        Assert.Equal("Delete", row.ActionType);
        Assert.Equal("7", row.PrimaryKeyValues);
        Assert.Equal("草稿", row.ActionDesc);
    }

    [Fact]
    public async Task FailedCreate_DuplicatePkid_WritesNoAuditRow()
    {
        Seed();

        await Assert.ThrowsAsync<SqliteException>(() => _repository.CreateAsync(Request()));

        Assert.Empty(AuditRows());
    }

    [Fact]
    public async Task FailedUpdate_MissingRow_WritesNoAuditRow()
    {
        var updated = await _repository.UpdateAsync(Request(pkid: 99));

        Assert.False(updated);
        Assert.Empty(AuditRows());
    }

    [Fact]
    public async Task FailedDelete_MissingRow_WritesNoAuditRow()
    {
        var deleted = await _repository.DeleteAsync(99);

        Assert.False(deleted);
        Assert.Empty(AuditRows());
    }
}
