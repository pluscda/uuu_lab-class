using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class PublishStatusesControllerTests
{
    private readonly Mock<IPublishStatusRepository> _repository = new();
    private readonly PublishStatusesController _controller;

    public PublishStatusesControllerTests()
    {
        _controller = new PublishStatusesController(_repository.Object);
    }

    private static PublishStatus SampleStatus(byte pkid = 1) => new()
    {
        Pkid = pkid,
        Description = "草稿",
        IsDraft = true,
        IsPublished = false,
        IsDiscontinued = false
    };

    private static PublishStatusRequest SampleRequest(byte pkid = 1) => new()
    {
        Pkid = pkid,
        Description = "草稿",
        IsDraft = true,
        IsPublished = false,
        IsDiscontinued = false
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithStatuses()
    {
        var statuses = new[] { SampleStatus(), SampleStatus(2) };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(statuses);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<PublishStatus>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_PassesQueryToRepository()
    {
        var query = new PublishStatusQuery { IsPublished = true };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleStatus(2)]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<PublishStatus>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithStatus()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(SampleStatus());

        var result = await _controller.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var status = Assert.IsType<PublishStatus>(ok.Value);
        Assert.Equal(1, status.Pkid);
        Assert.True(status.IsDraft);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((PublishStatus?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_WhenPkidIsNew_ReturnsCreatedWithPkid()
    {
        var request = SampleRequest(5);
        _repository.Setup(r => r.ExistsAsync(request.Pkid)).ReturnsAsync(false);

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(PublishStatusesController.GetById), created.ActionName);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_WhenPkidExists_ReturnsConflict()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.Pkid)).ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<PublishStatusRequest>()), Times.Never);
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
