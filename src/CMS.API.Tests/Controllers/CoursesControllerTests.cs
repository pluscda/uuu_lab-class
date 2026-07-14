using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class CoursesControllerTests
{
    private readonly Mock<ICourseRepository> _repository = new();
    private readonly CoursesController _controller;

    public CoursesControllerTests()
    {
        _controller = new CoursesController(_repository.Object);
    }

    private static Course SampleCourse(int pkid = 1) => new()
    {
        Pkid = pkid,
        Title = "Azure 基礎課程",
        CourseId = "AZ-900",
        ProdCourseId = "PAZ900",
        FriendlyUrl = "az-900",
        DisplayOrder = 1,
        PartnerPkid = 1,
        CourseGroupPkid = 2,
        PublishStatusPkid = 2,
        ScheduleOn = new DateOnly(2026, 1, 1),
        ScheduleOff = new DateOnly(2036, 1, 1),
        Hour = 8,
        ListPrice = 12000,
        LearningCredit = 1.5m,
        CanRepeat = true,
        PartnerName = "Microsoft",
        CourseGroupDescription = "雲端運算",
        PublishStatusDescription = "已發布",
        CertificationPkids = [10, 11],
        JobCategoryPkids = [1]
    };

    private static CourseRequest SampleRequest(int pkid = 1) => new()
    {
        Pkid = pkid,
        Title = "Azure 基礎課程",
        CourseId = "AZ-900",
        ProdCourseId = "PAZ900",
        FriendlyUrl = "az-900",
        DisplayOrder = 1,
        PartnerPkid = 1,
        CourseGroupPkid = 2,
        PublishStatusPkid = 2,
        ScheduleOn = new DateOnly(2026, 1, 1),
        ScheduleOff = new DateOnly(2036, 1, 1),
        Hour = 8,
        ListPrice = 12000,
        LearningCredit = 1.5m,
        CanRepeat = true,
        CertificationPkids = [10, 11],
        JobCategoryPkids = [1]
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithCourses()
    {
        var courses = new[] { SampleCourse(), SampleCourse(2) };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(courses);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<Course>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_PassesQueryToRepository()
    {
        var query = new CourseQuery { Keyword = "azure", PartnerPkid = 1, CanRepeat = true };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleCourse()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<Course>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithCourseAndRelationLists()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(SampleCourse());

        var result = await _controller.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var course = Assert.IsType<Course>(ok.Value);
        Assert.Equal("AZ-900", course.CourseId);
        Assert.Equal(2, course.CertificationPkids.Count);
        Assert.Single(course.JobCategoryPkids);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((Course?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedWithNewPkid()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync(7);

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(CoursesController.GetById), created.ActionName);
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
