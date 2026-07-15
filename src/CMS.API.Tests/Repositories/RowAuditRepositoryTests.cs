using System.Data;
using CMS.API.Data;
using CMS.API.Repositories;
using Dapper;
using Microsoft.Data.Sqlite;
using Xunit;

namespace CMS.API.Tests.Repositories;

// Runs the real RowAuditRepository SQL against in-memory SQLite: proves the
// TableName + PrimaryKeyValues filter and the newest-first ordering.
public sealed class RowAuditRepositoryTests : IDisposable
{
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
    private readonly RowAuditRepository _repository;

    public RowAuditRepositoryTests()
    {
        using var connection = _factory.CreateConnection();
        connection.Execute("""
            CREATE TABLE RowAudit (
                Pkid INTEGER PRIMARY KEY AUTOINCREMENT,
                TableName TEXT NOT NULL,
                UserName TEXT NOT NULL,
                PrimaryKeyValues TEXT NOT NULL,
                ActionType TEXT NOT NULL,
                ActionDesc TEXT NULL,
                [DateTime] TEXT NOT NULL
            );
            """);
        _repository = new RowAuditRepository(_factory);
    }

    public void Dispose() => _factory.Dispose();

    private void Seed(string tableName, string pkid, string actionType, string dateTime,
        string userName = "Miles", string? actionDesc = "desc")
    {
        using var connection = _factory.CreateConnection();
        connection.Execute("""
            INSERT INTO RowAudit (TableName, UserName, PrimaryKeyValues, ActionType, ActionDesc, [DateTime])
            VALUES (@tableName, @userName, @pkid, @actionType, @actionDesc, @dateTime)
            """, new { tableName, userName, pkid, actionType, actionDesc, dateTime });
    }

    [Fact]
    public async Task GetByRecord_ReturnsOnlyRowsMatchingTableNameAndPkid()
    {
        Seed("Course", "123", "Insert", "2026-06-01 09:00:00");
        Seed("Course", "123", "Update", "2026-06-02 10:00:00");
        Seed("Course", "456", "Insert", "2026-06-03 11:00:00"); // other record
        Seed("Partner", "123", "Insert", "2026-06-04 12:00:00"); // other table, same pkid

        var rows = (await _repository.GetByRecordAsync("Course", "123")).ToList();

        Assert.Equal(2, rows.Count);
        Assert.All(rows, r => Assert.Equal("Miles", r.UserName));
        Assert.Equal(["Update", "Insert"], rows.Select(r => r.ActionType));
    }

    [Fact]
    public async Task GetByRecord_ReturnsRowsNewestFirst_RegardlessOfInsertOrder()
    {
        Seed("Course", "123", "Update", "2026-06-02 10:00:00");
        Seed("Course", "123", "Delete", "2026-06-05 08:30:00");
        Seed("Course", "123", "Insert", "2026-06-01 09:00:00");

        var rows = (await _repository.GetByRecordAsync("Course", "123")).ToList();

        Assert.Equal(["Delete", "Update", "Insert"], rows.Select(r => r.ActionType));
        Assert.Equal(new DateTime(2026, 6, 5, 8, 30, 0), rows[0].DateTime);
    }

    [Fact]
    public async Task GetByRecord_SameDateTime_NewestAuditRowFirst()
    {
        Seed("Course", "123", "Insert", "2026-06-01 09:00:00");
        Seed("Course", "123", "Update", "2026-06-01 09:00:00"); // same instant, later audit pkid

        var rows = (await _repository.GetByRecordAsync("Course", "123")).ToList();

        Assert.Equal(["Update", "Insert"], rows.Select(r => r.ActionType));
    }

    [Fact]
    public async Task GetByRecord_NullActionDesc_ReturnedAsEmptyString()
    {
        Seed("Course", "123", "Insert", "2026-06-01 09:00:00", actionDesc: null);

        var row = Assert.Single(await _repository.GetByRecordAsync("Course", "123"));

        Assert.Equal(string.Empty, row.ActionDesc);
    }

    [Fact]
    public async Task GetByRecord_NoHistory_ReturnsEmptyList()
    {
        Seed("Course", "456", "Insert", "2026-06-01 09:00:00");

        var rows = await _repository.GetByRecordAsync("Course", "123");

        Assert.Empty(rows);
    }
}
