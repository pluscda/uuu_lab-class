using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class CourseGroupsControllerTests
{
    private readonly Mock<ICourseGroupRepository> _repository = new();
    private readonly CourseGroupsController _controller;

    public CourseGroupsControllerTests()
    {
        _controller = new CourseGroupsController(_repository.Object);
    }

    private static CourseGroup SampleGroup(short pkid = 1) => new()
    {
        Pkid = pkid,
        Description = "雲端運算"
    };

    private static CourseGroupRequest SampleRequest(short pkid = 1) => new()
    {
        Pkid = pkid,
        Description = "雲端運算"
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithGroups()
    {
        var groups = new[] { SampleGroup(), SampleGroup(2) };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(groups);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<CourseGroup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_PassesQueryToRepository()
    {
        var query = new CourseGroupQuery { Keyword = "雲端" };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleGroup()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<CourseGroup>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithGroup()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(SampleGroup());

        var result = await _controller.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var group = Assert.IsType<CourseGroup>(ok.Value);
        Assert.Equal(1, group.Pkid);
        Assert.Equal("雲端運算", group.Description);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((CourseGroup?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedWithNewPkid()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync((short)7);

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(CourseGroupsController.GetById), created.ActionName);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Update_WhenFound_ReturnsNoContent()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);

        var result = await _controller.Update(request);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Update_WhenNotFound_ReturnsNotFound()
    {
        var request = SampleRequest(99);
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_WhenFound_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync(99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }
}
