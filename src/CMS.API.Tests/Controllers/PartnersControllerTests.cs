using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class PartnersControllerTests
{
    private readonly Mock<IPartnerRepository> _repository = new();
    private readonly PartnersController _controller;

    public PartnersControllerTests()
    {
        _controller = new PartnersController(_repository.Object);
    }

    private static Partner SamplePartner(short pkid = 1) => new()
    {
        Pkid = pkid,
        Name = "Microsoft",
        AppKey = "MS",
        NameOnPartnerMenu = "Microsoft 微軟原廠課程",
        NameOnCourseDetailPage = "Microsoft",
        DisplayOrder = 1,
        ImageFilename = "microsoft.png"
    };

    private static PartnerRequest SampleRequest(short pkid = 1) => new()
    {
        Pkid = pkid,
        Name = "Microsoft",
        AppKey = "MS",
        NameOnPartnerMenu = "Microsoft 微軟原廠課程",
        NameOnCourseDetailPage = "Microsoft",
        DisplayOrder = 1,
        ImageFilename = "microsoft.png"
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithPartners()
    {
        var partners = new[] { SamplePartner(), SamplePartner(2) };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(partners);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<Partner>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_PassesQueryToRepository()
    {
        var query = new PartnerQuery { Keyword = "micro" };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SamplePartner()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<Partner>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithPartner()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(SamplePartner());

        var result = await _controller.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var partner = Assert.IsType<Partner>(ok.Value);
        Assert.Equal(1, partner.Pkid);
        Assert.Equal("Microsoft", partner.Name);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Partner?)null);

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
        Assert.Equal(nameof(PartnersController.GetById), created.ActionName);
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
