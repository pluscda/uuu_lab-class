using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class AppUsersControllerTests
{
    private readonly Mock<IAppUserRepository> _repository = new();
    private readonly AppUsersController _controller;

    public AppUsersControllerTests()
    {
        _controller = new AppUsersController(_repository.Object);
    }

    private static AppUser SampleUser(string userId = "helen") => new()
    {
        Pkid = 1,
        UserId = userId,
        UserName = "Helen Chen",
        IsActive = true,
        PasswordUpdatedTime = null,
        RoleCount = 2,
        RoleIds = ["Admin", "User"]
    };

    private static AppUserRequest SampleRequest(string userId = "helen") => new()
    {
        UserId = userId,
        UserName = "Helen Chen",
        IsActive = true,
        RoleIds = ["Admin"]
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithUsers()
    {
        var users = new[] { SampleUser(), SampleUser("miles@uuu.com.tw") };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(users);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<AppUser>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_PassesQueryToRepository()
    {
        var query = new AppUserQuery { Keyword = "helen", IsActive = true };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleUser()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<AppUser>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(query), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithUser()
    {
        _repository.Setup(r => r.GetByIdAsync("helen")).ReturnsAsync(SampleUser());

        var result = await _controller.GetById("helen");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var user = Assert.IsType<AppUser>(ok.Value);
        Assert.Equal("helen", user.UserId);
        Assert.Equal(2, user.RoleIds.Count);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync("nope")).ReturnsAsync((AppUser?)null);

        var result = await _controller.GetById("nope");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_WhenUserIdIsNew_ReturnsCreatedWithPkid()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.UserId)).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync(7);

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(AppUsersController.GetById), created.ActionName);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_WhenUserIdExists_ReturnsConflict()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.UserId)).ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<AppUserRequest>()), Times.Never);
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
        var request = SampleRequest("nope");
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_WhenFound_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync("helen")).ReturnsAsync(true);

        var result = await _controller.Delete("helen");

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync("nope")).ReturnsAsync(false);

        var result = await _controller.Delete("nope");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ResetPassword_WhenFound_ReturnsNoContent()
    {
        _repository.Setup(r => r.ResetPasswordAsync("helen")).ReturnsAsync(true);

        var result = await _controller.ResetPassword("helen");

        Assert.IsType<NoContentResult>(result);
        _repository.Verify(r => r.ResetPasswordAsync("helen"), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.ResetPasswordAsync("nope")).ReturnsAsync(false);

        var result = await _controller.ResetPassword("nope");

        Assert.IsType<NotFoundResult>(result);
    }
}
