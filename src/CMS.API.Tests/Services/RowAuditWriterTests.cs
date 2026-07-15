using System.Security.Claims;
using CMS.API.Data;
using CMS.API.Models;
using CMS.API.Services;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace CMS.API.Tests.Services;

public class RowAuditWriterTests
{
    // Captures the built RowAudit row instead of executing SQL, so every test
    // exercises the real reflection/claims logic with no database.
    private sealed class CapturingRowAuditWriter(IHttpContextAccessor accessor)
        : RowAuditWriter(Mock.Of<IDbConnectionFactory>(), accessor)
    {
        public List<RowAudit> Written { get; } = [];

        protected override Task InsertAsync(
            RowAudit audit, System.Data.IDbConnection? connection, System.Data.IDbTransaction? transaction)
        {
            Written.Add(audit);
            return Task.CompletedTask;
        }
    }

    // Pkid is not first and bool IsActive precedes the strings — the writer must
    // pick the FIRST string-typed property (Title), not the first property.
    private class Widget
    {
        public int Pkid { get; set; }
        public bool IsActive { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Remark { get; set; }
        public decimal Price { get; set; }
        public DateOnly? ScheduleOn { get; set; }
        public WidgetGroup? Group { get; set; }
        public List<int> TagIds { get; set; } = [];
    }

    private class WidgetGroup
    {
        public int Pkid { get; set; }
    }

    private static Widget SampleWidget() => new()
    {
        Pkid = 7,
        IsActive = true,
        Title = "資安入門",
        Remark = "remark",
        Price = 1200m,
        ScheduleOn = new DateOnly(2026, 7, 1),
        Group = new WidgetGroup { Pkid = 1 },
        TagIds = [1, 2]
    };

    private static IHttpContextAccessor Accessor(string? userName)
    {
        var accessor = new Mock<IHttpContextAccessor>();
        if (userName is not null)
        {
            accessor.Setup(a => a.HttpContext).Returns(new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim("userName", userName)], authenticationType: "Test"))
            });
        }
        return accessor.Object;
    }

    [Fact]
    public async Task LogInsert_WritesFirstStringPropertyAndPkidAndUser()
    {
        var writer = new CapturingRowAuditWriter(Accessor("Miles"));

        await writer.LogInsertAsync("Widget", SampleWidget());

        var row = Assert.Single(writer.Written);
        Assert.Equal("Widget", row.TableName);
        Assert.Equal("Insert", row.ActionType);
        Assert.Equal("7", row.PrimaryKeyValues);
        Assert.Equal("資安入門", row.ActionDesc);
        Assert.Equal("Miles", row.UserName);
        Assert.True((DateTime.Now - row.DateTime).Duration() < TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task LogDelete_WritesFirstStringPropertyAsActionDesc()
    {
        var writer = new CapturingRowAuditWriter(Accessor("Miles"));

        await writer.LogDeleteAsync("Widget", SampleWidget());

        var row = Assert.Single(writer.Written);
        Assert.Equal("Delete", row.ActionType);
        Assert.Equal("7", row.PrimaryKeyValues);
        Assert.Equal("資安入門", row.ActionDesc);
    }

    [Fact]
    public async Task LogUpdate_ListsExactlyTheChangedPropertyNames()
    {
        var writer = new CapturingRowAuditWriter(Accessor("Miles"));
        var before = SampleWidget();
        var after = SampleWidget();
        after.Title = "資安進階";
        after.Price = 1500m;
        after.ScheduleOn = new DateOnly(2026, 8, 1);
        // Different references but not part of the diff (nav object / ID list)
        after.Group = new WidgetGroup { Pkid = 1 };
        after.TagIds = [1, 2];

        await writer.LogUpdateAsync("Widget", before, after);

        var row = Assert.Single(writer.Written);
        Assert.Equal("Update", row.ActionType);
        Assert.Equal("Title, Price, ScheduleOn", row.ActionDesc);
    }

    [Fact]
    public async Task LogUpdate_NothingChanged_WritesNoRow()
    {
        var writer = new CapturingRowAuditWriter(Accessor("Miles"));

        await writer.LogUpdateAsync("Widget", SampleWidget(), SampleWidget());

        Assert.Empty(writer.Written);
    }

    [Fact]
    public async Task UserName_FallsBackToSystem_WithoutHttpContext()
    {
        var writer = new CapturingRowAuditWriter(Accessor(null));

        await writer.LogInsertAsync("Widget", SampleWidget());

        var row = Assert.Single(writer.Written);
        Assert.Equal("system", row.UserName);
    }

    [Fact]
    public async Task UserName_FallsBackToSystem_WhenUserNotAuthenticated()
    {
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(new DefaultHttpContext()); // anonymous principal
        var writer = new CapturingRowAuditWriter(accessor.Object);

        await writer.LogInsertAsync("Widget", SampleWidget());

        var row = Assert.Single(writer.Written);
        Assert.Equal("system", row.UserName);
    }

    [Fact]
    public async Task ActionDesc_TruncatesAt1000Characters()
    {
        var writer = new CapturingRowAuditWriter(Accessor("Miles"));
        var widget = SampleWidget();
        widget.Title = new string('x', 1500);

        await writer.LogInsertAsync("Widget", widget);

        var row = Assert.Single(writer.Written);
        Assert.Equal(1000, row.ActionDesc.Length);
        Assert.Equal(new string('x', 1000), row.ActionDesc);
    }
}
