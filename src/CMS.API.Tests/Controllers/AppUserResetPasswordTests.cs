using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

/// <summary>
/// End-to-end tests for POST /api/app-users/{id}/reset-password: the endpoint
/// is restricted to the "Admin" role (enforced server-side via the role claim —
/// a non-Admin token gets 403, no token gets 401), the new PasswordHash is
/// SHA-256(defaultPassword) where defaultPassword comes from SysConfig
/// 'appConfig' at request time, and nothing (no password, no hash) is ever
/// returned to the client. Repositories are mocked so no database is needed —
/// PasswordUpdatedTime = GETUTCDATE() lives in the repository SQL
/// (AppUserRepository.ResetPasswordAsync), so here we verify the controller
/// hands the repository the SHA-256 hash of the SysConfig default password.
/// </summary>
public class AppUserResetPasswordTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a >= 256-bit key
    private const string Secret = "unit-test-symmetric-security-key-0123456789ABCDEF0123456789ABCDEF";

    private const string DefaultPassword = "Default1!pass";

    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IAppUserRepository> _appUserRepository = new();

    public AppUserResetPasswordTests(WebApplicationFactory<Program> factory)
    {
        var authRepository = new Mock<IAuthRepository>();
        authRepository.Setup(r => r.GetSymmetricSecurityKeyAsync()).ReturnsAsync(Secret);

        _appUserRepository.Setup(r => r.GetDefaultPasswordAsync()).ReturnsAsync(DefaultPassword);
        _appUserRepository
            .Setup(r => r.ResetPasswordAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _factory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddScoped(_ => authRepository.Object);
            services.AddScoped(_ => _appUserRepository.Object);
        }));
    }

    private static string Sha256Hex(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string CreateToken(params string[] roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, "caller"),
            new("userId", "caller")
        };
        claims.AddRange(roles.Select(role => new Claim("role", role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient CreateClient(params string[]? roles)
    {
        var client = _factory.CreateClient();
        if (roles is not null)
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", CreateToken(roles));
        return client;
    }

    private static Task<HttpResponseMessage> PostResetAsync(HttpClient client, string userId = "helen") =>
        client.PostAsync($"/api/app-users/{userId}/reset-password", content: null);

    private void VerifyNothingChanged() =>
        _appUserRepository.Verify(
            r => r.ResetPasswordAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);

    [Fact]
    public async Task ResetPassword_WithoutToken_Returns401()
    {
        var response = await PostResetAsync(CreateClient(roles: null));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        VerifyNothingChanged();
    }

    [Fact]
    public async Task ResetPassword_WithNonAdminToken_Returns403AndChangesNothing()
    {
        var response = await PostResetAsync(CreateClient("Editor"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        VerifyNothingChanged();
    }

    [Fact]
    public async Task ResetPassword_WithNoRolesAtAll_Returns403AndChangesNothing()
    {
        var response = await PostResetAsync(CreateClient(roles: []));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        VerifyNothingChanged();
    }

    [Fact]
    public async Task ResetPassword_AsAdmin_SetsHashOfSysConfigDefaultPassword()
    {
        var response = await PostResetAsync(CreateClient("Admin"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        // Success body is empty: no password, hash, or anything else is returned
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
        // The repository receives SHA-256 uppercase hex of the SysConfig default
        // password — PasswordHash ends up = SHA256(defaultPassword), and the same
        // repository call sets PasswordUpdatedTime = GETUTCDATE() in its SQL
        _appUserRepository.Verify(
            r => r.ResetPasswordAsync("helen", Sha256Hex(DefaultPassword)), Times.Once);
        _appUserRepository.Verify(r => r.GetDefaultPasswordAsync(), Times.Once);
    }

    [Fact]
    public async Task ResetPassword_AsAdminAmongOtherRoles_Succeeds()
    {
        var response = await PostResetAsync(CreateClient("Editor", "Admin"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_AsAdmin_ForUnknownUser_Returns404()
    {
        _appUserRepository
            .Setup(r => r.ResetPasswordAsync("nope", It.IsAny<string>()))
            .ReturnsAsync(false);

        var response = await PostResetAsync(CreateClient("Admin"), userId: "nope");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
