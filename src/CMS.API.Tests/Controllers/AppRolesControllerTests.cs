using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class AppRolesControllerTests
{
    private readonly Mock<IAppRoleRepository> _repository = new();
    private readonly AppRolesController _controller;

    public AppRolesControllerTests()
    {
        _controller = new AppRolesController(_repository.Object);
    }

    private static AppRole SampleRole(string roleId = "Admin") => new()
    {
        Pkid = 1,
        RoleId = roleId,
        RoleName = "Administrator",
        PermissionLevel = 1,
        Description = "系統管理員",
        UserCount = 3,
        UserIds = ["helen", "Jenny_Tsao"]
    };

    private static AppRoleRequest SampleRequest(string roleId = "Admin") => new()
    {
        RoleId = roleId,
        RoleName = "Administrator",
        PermissionLevel = 1,
        Description = "系統管理員",
        UserIds = ["helen"]
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithRoles()
    {
        var roles = new[] { SampleRole(), SampleRole("User") };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(roles);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<AppRole>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_PassesQueryToRepository()
    {
        var query = new AppRoleQuery { Keyword = "admin" };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleRole()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<AppRole>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithRole()
    {
        _repository.Setup(r => r.GetByIdAsync("Admin")).ReturnsAsync(SampleRole());

        var result = await _controller.GetById("Admin");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var role = Assert.IsType<AppRole>(ok.Value);
        Assert.Equal("Admin", role.RoleId);
        Assert.Equal(2, role.UserIds.Count);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync("Nope")).ReturnsAsync((AppRole?)null);

        var result = await _controller.GetById("Nope");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_WhenRoleIdIsNew_ReturnsCreatedWithPkid()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.RoleId)).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync(7);

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(AppRolesController.GetById), created.ActionName);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_WhenRoleIdExists_ReturnsConflict()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.RoleId)).ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<AppRoleRequest>()), Times.Never);
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
        var request = SampleRequest("Nope");
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_WhenFound_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync("Admin")).ReturnsAsync(true);

        var result = await _controller.Delete("Admin");

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync("Nope")).ReturnsAsync(false);

        var result = await _controller.Delete("Nope");

        Assert.IsType<NotFoundResult>(result);
    }
}
