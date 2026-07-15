using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class RowAuditControllerTests
{
    private readonly Mock<IRowAuditRepository> _repository = new();
    private readonly RowAuditController _controller;

    public RowAuditControllerTests()
    {
        _controller = new RowAuditController(_repository.Object);
    }

    [Fact]
    public async Task GetByRecord_ReturnsOkWithRepositoryRows()
    {
        var entries = new[]
        {
            new RowAuditEntry { DateTime = new DateTime(2026, 6, 2, 10, 0, 0), UserName = "alice", ActionType = "Update", ActionDesc = "Description" },
            new RowAuditEntry { DateTime = new DateTime(2026, 6, 1, 9, 0, 0), UserName = "miles", ActionType = "Insert", ActionDesc = "課程" }
        };
        _repository.Setup(r => r.GetByRecordAsync("Course", "123")).ReturnsAsync(entries);

        var result = await _controller.GetByRecord("Course", "123");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<RowAuditEntry>>(ok.Value);
        Assert.Equal(entries, value);
    }

    [Theory]
    [InlineData(null, "123")]
    [InlineData("", "123")]
    [InlineData("Course", null)]
    [InlineData("Course", " ")]
    public async Task GetByRecord_MissingTableNameOrPkid_ReturnsBadRequest(string? tableName, string? pkid)
    {
        var result = await _controller.GetByRecord(tableName, pkid);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _repository.Verify(r => r.GetByRecordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
