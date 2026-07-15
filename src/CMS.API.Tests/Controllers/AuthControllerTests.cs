using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class AuthControllerTests
{
    // HS256 needs a >= 256-bit key
    private const string Secret = "unit-test-symmetric-security-key-0123456789ABCDEF0123456789ABCDEF";
    private const string Password = "P@ssw0rd!";

    private readonly Mock<IAuthRepository> _repository = new();
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _controller = new AuthController(_repository.Object);
    }

    private static string Hash(string password)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));

    private static LoginUser SampleUser() => new()
    {
        UserId = "helen",
        UserName = "Helen Chen",
        RoleIds = ["Admin", "Editor"]
    };

    // Repository only matches the exact (userId, correct hash) pair — any other
    // combination (wrong password, unknown user, inactive user) returns null,
    // mirroring the SQL WHERE clause.
    private void SetupValidLogin(LoginUser user)
    {
        _repository.Setup(r => r.GetUserForLoginAsync(user.UserId, Hash(Password))).ReturnsAsync(user);
        _repository.Setup(r => r.GetSymmetricSecurityKeyAsync()).ReturnsAsync(Secret);
    }

    private async Task<LoginResponse> LoginOkAsync(string userId = "helen", string password = Password)
    {
        var result = await _controller.Login(new LoginRequest { UserId = userId, Password = password });
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        return Assert.IsType<LoginResponse>(ok.Value);
    }

    [Fact]
    public async Task Login_WithValidActiveUser_ReturnsProfileWithToken()
    {
        SetupValidLogin(SampleUser());

        var response = await LoginOkAsync();

        Assert.Equal("helen", response.UserId);
        Assert.Equal("Helen Chen", response.UserName);
        Assert.False(string.IsNullOrWhiteSpace(response.AccessToken));
        _repository.Verify(r => r.GetUserForLoginAsync("helen", Hash(Password)), Times.Once);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        SetupValidLogin(SampleUser());

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = "wrong" });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_WithUnknownUserId_ReturnsUnauthorized()
    {
        SetupValidLogin(SampleUser());

        var result = await _controller.Login(new LoginRequest { UserId = "nobody", Password = Password });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_WithInactiveUser_ReturnsUnauthorized()
    {
        // IsActive = 0 is filtered out in SQL, so the repository yields null
        // even for a correct (userId, hash) pair
        _repository.Setup(r => r.GetUserForLoginAsync("helen", Hash(Password))).ReturnsAsync((LoginUser?)null);

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = Password });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_FailureMessage_DoesNotRevealWhichCheckFailed()
    {
        SetupValidLogin(SampleUser());

        var wrongPassword = await _controller.Login(new LoginRequest { UserId = "helen", Password = "wrong" });
        var unknownUser = await _controller.Login(new LoginRequest { UserId = "nobody", Password = Password });

        var first = Assert.IsType<UnauthorizedObjectResult>(wrongPassword.Result);
        var second = Assert.IsType<UnauthorizedObjectResult>(unknownUser.Result);
        Assert.Equal(JsonSerializer.Serialize(first.Value), JsonSerializer.Serialize(second.Value));
    }

    [Fact]
    public async Task Login_IssuedToken_CarriesUserAndRoleClaims()
    {
        SetupValidLogin(SampleUser());

        var response = await LoginOkAsync();

        var token = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);
        Assert.Equal("helen", token.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal("helen", token.Claims.Single(c => c.Type == "userId").Value);
        Assert.Equal("Helen Chen", token.Claims.Single(c => c.Type == "userName").Value);
        var roles = token.Claims.Where(c => c.Type == "role").Select(c => c.Value).ToList();
        Assert.Equal(["Admin", "Editor"], roles);
    }

    [Fact]
    public async Task Login_IssuedToken_ExpiresInAbout24Hours()
    {
        SetupValidLogin(SampleUser());

        var response = await LoginOkAsync();

        var token = new JwtSecurityTokenHandler().ReadJwtToken(response.AccessToken);
        var lifetime = token.ValidTo - DateTime.UtcNow;
        Assert.InRange(lifetime, TimeSpan.FromHours(23.9), TimeSpan.FromHours(24.1));
    }

    [Fact]
    public async Task Login_Response_NeverContainsPasswordHash()
    {
        SetupValidLogin(SampleUser());

        var result = await _controller.Login(new LoginRequest { UserId = "helen", Password = Password });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var json = JsonSerializer.Serialize(ok.Value, ok.Value!.GetType());
        Assert.DoesNotContain("passwordhash", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Hash(Password), json, StringComparison.OrdinalIgnoreCase);
    }
}
