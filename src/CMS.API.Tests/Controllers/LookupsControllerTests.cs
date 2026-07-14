using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class LookupsControllerTests
{
    private readonly Mock<ILookupRepository> _repository = new();

    [Fact]
    public async Task GetAppUsers_ReturnsOkWithUsers()
    {
        var users = new[]
        {
            new AppUserLookup { UserId = "helen", UserName = "helen", IsActive = true },
            new AppUserLookup { UserId = "miles@uuu.com.tw", UserName = "Miles Sun", IsActive = true }
        };
        _repository.Setup(r => r.GetAppUsersAsync()).ReturnsAsync(users);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetAppUsers();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<AppUserLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetAppRoles_ReturnsOkWithRoles()
    {
        var roles = new[]
        {
            new AppRoleLookup { RoleId = "Admin", RoleName = "Administrator" },
            new AppRoleLookup { RoleId = "User", RoleName = "General User" }
        };
        _repository.Setup(r => r.GetAppRolesAsync()).ReturnsAsync(roles);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetAppRoles();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<AppRoleLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetPublishStatuses_ReturnsOkWithStatuses()
    {
        var statuses = new[]
        {
            new PublishStatusLookup { Pkid = 1, Description = "草稿" },
            new PublishStatusLookup { Pkid = 2, Description = "已發布" }
        };
        _repository.Setup(r => r.GetPublishStatusesAsync()).ReturnsAsync(statuses);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetPublishStatuses();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<PublishStatusLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetPartners_ReturnsOkWithPartners()
    {
        var partners = new[]
        {
            new PartnerLookup { Pkid = 1, Name = "Microsoft" },
            new PartnerLookup { Pkid = 2, Name = "Cisco" }
        };
        _repository.Setup(r => r.GetPartnersAsync()).ReturnsAsync(partners);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetPartners();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<PartnerLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetCourseGroups_ReturnsOkWithGroups()
    {
        var groups = new[]
        {
            new CourseGroupLookup { Pkid = 1, Description = "雲端運算" },
            new CourseGroupLookup { Pkid = 2, Description = "資訊安全" }
        };
        _repository.Setup(r => r.GetCourseGroupsAsync()).ReturnsAsync(groups);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetCourseGroups();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<CourseGroupLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetCertifications_ReturnsOkWithCertifications()
    {
        var certifications = new[]
        {
            new CertificationLookup { Pkid = 10, PartnerPkid = 1, Title = "Azure Fundamentals" },
            new CertificationLookup { Pkid = 11, PartnerPkid = 1, Title = "Azure Administrator" }
        };
        _repository.Setup(r => r.GetCertificationsAsync()).ReturnsAsync(certifications);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetCertifications();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<CertificationLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetJobCategories_ReturnsOkWithJobCategories()
    {
        var jobCategories = new[]
        {
            new JobCategoryLookup { Pkid = 1, Description = "系統工程師" },
            new JobCategoryLookup { Pkid = 2, Description = "資料庫管理師" }
        };
        _repository.Setup(r => r.GetJobCategoriesAsync()).ReturnsAsync(jobCategories);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetJobCategories();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<JobCategoryLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task GetCourses_ReturnsOkWithCourses()
    {
        var courses = new[]
        {
            new CourseLookup { Pkid = 1, CourseId = "AZ-900", Title = "Azure 基礎課程" },
            new CourseLookup { Pkid = 2, CourseId = "AZ-104", Title = "Azure 管理課程" }
        };
        _repository.Setup(r => r.GetCoursesAsync()).ReturnsAsync(courses);
        var controller = new LookupsController(_repository.Object);

        var result = await controller.GetCourses();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<CourseLookup>>(ok.Value);
        Assert.Equal(2, value.Count());
    }
}
