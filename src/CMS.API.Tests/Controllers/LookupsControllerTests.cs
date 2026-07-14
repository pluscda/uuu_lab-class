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
}
