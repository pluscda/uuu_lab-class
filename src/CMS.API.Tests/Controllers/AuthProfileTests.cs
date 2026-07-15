using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

/// <summary>
/// End-to-end tests for PUT /api/auth/profile: the endpoint requires a token,
/// takes the target UserId from the JWT and ignores any userId/roles the JSON
/// body tries to smuggle in. Repositories are mocked so no database is needed.
/// </summary>
public class AuthProfileTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a >= 256-bit key
    private const string Secret = "unit-test-symmetric-security-key-0123456789ABCDEF0123456789ABCDEF";

    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IAuthRepository> _authRepository = new();

    public AuthProfileTests(WebApplicationFactory<Program> factory)
    {
        _authRepository.Setup(r => r.GetSymmetricSecurityKeyAsync()).ReturnsAsync(Secret);
        _authRepository
            .Setup(r => r.UpdateUserNameAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _factory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddScoped(_ => _authRepository.Object)));
    }

    private static string CreateToken(string userId)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim("userId", userId),
                new Claim("role", "Editor")
            ],
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient CreateClient(string? userId = null)
    {
        var client = _factory.CreateClient();
        if (userId is not null)
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", CreateToken(userId));
        return client;
    }

    [Fact]
    public async Task Profile_WithoutToken_Returns401()
    {
        var response = await CreateClient()
            .PutAsJsonAsync("/api/auth/profile", new { userName = "New Name" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        _authRepository.Verify(
            r => r.UpdateUserNameAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Profile_UpdatesUserNameForTheJwtUser()
    {
        var response = await CreateClient("helen")
            .PutAsJsonAsync("/api/auth/profile", new { userName = "Helen Updated" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResponse>();
        Assert.Equal("helen", profile!.UserId);
        Assert.Equal("Helen Updated", profile.UserName);
        _authRepository.Verify(r => r.UpdateUserNameAsync("helen", "Helen Updated"), Times.Once);
    }

    [Fact]
    public async Task Profile_IgnoresUserIdAndRolesInTheRequestBody()
    {
        // The body claims to be "mallory" with the Admin role — the update must
        // still target the token's user, with the name trimmed
        var response = await CreateClient("helen").PutAsJsonAsync("/api/auth/profile",
            new { userId = "mallory", userName = "  New Name  ", roleIds = new[] { "Admin" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResponse>();
        Assert.Equal("helen", profile!.UserId);
        _authRepository.Verify(r => r.UpdateUserNameAsync("helen", "New Name"), Times.Once);
        _authRepository.Verify(
            r => r.UpdateUserNameAsync("mallory", It.IsAny<string>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Profile_WithEmptyOrWhitespaceUserName_Returns400(string userName)
    {
        var response = await CreateClient("helen")
            .PutAsJsonAsync("/api/auth/profile", new { userName });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _authRepository.Verify(
            r => r.UpdateUserNameAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }
}
