using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
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
/// End-to-end pipeline tests: JWT bearer validation + the global FallbackPolicy.
/// Repositories are mocked so no database is needed.
/// </summary>
public class JwtAuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a >= 256-bit key
    private const string Secret = "unit-test-symmetric-security-key-0123456789ABCDEF0123456789ABCDEF";
    private const string Password = "P@ssw0rd!";

    private readonly WebApplicationFactory<Program> _factory;

    public JwtAuthorizationTests(WebApplicationFactory<Program> factory)
    {
        var authRepository = new Mock<IAuthRepository>();
        authRepository.Setup(r => r.GetSymmetricSecurityKeyAsync()).ReturnsAsync(Secret);
        authRepository
            .Setup(r => r.GetUserForLoginAsync("helen", Hash(Password)))
            .ReturnsAsync(new LoginUser { UserId = "helen", UserName = "Helen Chen", RoleIds = ["Admin"] });

        var appRoleRepository = new Mock<IAppRoleRepository>();
        appRoleRepository.Setup(r => r.GetAllAsync()).ReturnsAsync([]);

        _factory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddScoped(_ => authRepository.Object);
            services.AddScoped(_ => appRoleRepository.Object);
        }));
    }

    private static string Hash(string password)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));

    private static string CreateToken(string secret, TimeSpan? lifetime = null)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: [new Claim(JwtRegisteredClaimNames.Sub, "helen"), new Claim("role", "Admin")],
            expires: DateTime.UtcNow.Add(lifetime ?? TimeSpan.FromHours(1)),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient CreateClient(string? bearerToken = null)
    {
        var client = _factory.CreateClient();
        if (bearerToken is not null)
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        return client;
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var response = await CreateClient().GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithMalformedToken_Returns401()
    {
        var response = await CreateClient("not-a-jwt").GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithTokenSignedByWrongKey_Returns401()
    {
        var wrongKeyToken = CreateToken("some-other-key-that-did-not-sign-0123456789ABCDEF0123456789ABCDEF");

        var response = await CreateClient(wrongKeyToken).GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithValidToken_Returns200()
    {
        var response = await CreateClient(CreateToken(Secret)).GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithTokenIssuedByLoginEndpoint_Returns200()
    {
        var client = CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest { UserId = "helen", Password = Password });
        var profile = await login.Content.ReadFromJsonAsync<LoginResponse>();

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", profile!.AccessToken);
        var response = await client.GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task LoginEndpoint_StaysAnonymous_NoTokenRequired()
    {
        var response = await CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest { UserId = "helen", Password = Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.Equal("helen", profile!.UserId);
        Assert.False(string.IsNullOrWhiteSpace(profile.AccessToken));
    }
}
