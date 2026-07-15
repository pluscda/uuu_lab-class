using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Http;
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

    /// <summary>Signs the controller in as the given user via JWT-style claims.</summary>
    private void AuthenticateAs(params Claim[] claims)
    {
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };
    }

    [Fact]
    public async Task UpdateProfile_UpdatesUserNameForTheJwtUser()
    {
        AuthenticateAs(new Claim("userId", "helen"));
        _repository.Setup(r => r.UpdateUserNameAsync("helen", "New Name")).ReturnsAsync(true);

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = "New Name" });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var profile = Assert.IsType<ProfileResponse>(ok.Value);
        Assert.Equal("helen", profile.UserId);
        Assert.Equal("New Name", profile.UserName);
        _repository.Verify(r => r.UpdateUserNameAsync("helen", "New Name"), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_TrimsTheUserName()
    {
        AuthenticateAs(new Claim("userId", "helen"));
        _repository.Setup(r => r.UpdateUserNameAsync("helen", "New Name")).ReturnsAsync(true);

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = "  New Name  " });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal("New Name", Assert.IsType<ProfileResponse>(ok.Value).UserName);
        _repository.Verify(r => r.UpdateUserNameAsync("helen", "New Name"), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task UpdateProfile_WithEmptyOrWhitespaceUserName_ReturnsBadRequest(string? userName)
    {
        AuthenticateAs(new Claim("userId", "helen"));

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = userName! });

        Assert.IsType<BadRequestObjectResult>(result.Result);
        _repository.Verify(
            r => r.UpdateUserNameAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_FallsBackToNameIdentifierClaim()
    {
        // Tokens carrying only the standard "sub" claim surface it as NameIdentifier
        AuthenticateAs(new Claim(ClaimTypes.NameIdentifier, "helen"));
        _repository.Setup(r => r.UpdateUserNameAsync("helen", "New Name")).ReturnsAsync(true);

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = "New Name" });

        Assert.IsType<OkObjectResult>(result.Result);
        _repository.Verify(r => r.UpdateUserNameAsync("helen", "New Name"), Times.Once);
    }

    [Fact]
    public async Task UpdateProfile_WhenUserNoLongerExists_ReturnsNotFound()
    {
        AuthenticateAs(new Claim("userId", "ghost"));
        _repository.Setup(r => r.UpdateUserNameAsync("ghost", "New Name")).ReturnsAsync(false);

        var result = await _controller.UpdateProfile(new UpdateProfileRequest { UserName = "New Name" });

        Assert.IsType<NotFoundObjectResult>(result.Result);
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
