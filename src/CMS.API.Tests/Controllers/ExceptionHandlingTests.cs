using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using CMS.API.Middleware;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

/// <summary>
/// End-to-end tests for the global ExceptionHandlingMiddleware: an endpoint
/// whose repository throws returns one consistent 500 JSON body carrying only
/// the generic message — never the exception type, stack trace, SQL text, or
/// connection details — while the deliberate responses (401 unauthenticated,
/// 403 forbidden, 400 validation) keep behaving exactly as before.
/// Repositories are mocked so no database is needed.
/// </summary>
public class ExceptionHandlingTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a >= 256-bit key
    private const string Secret = "unit-test-symmetric-security-key-0123456789ABCDEF0123456789ABCDEF";

    // Deliberately stuffed with everything that must NOT reach the client.
    private const string SensitiveMessage =
        "Login failed connecting to Server=.\\SQLEXPRESS;Database=CMS while executing " +
        "SELECT * FROM auth.APP_ROLE";

    private readonly WebApplicationFactory<Program> _factory;

    public ExceptionHandlingTests(WebApplicationFactory<Program> factory)
    {
        var authRepository = new Mock<IAuthRepository>();
        authRepository.Setup(r => r.GetSymmetricSecurityKeyAsync()).ReturnsAsync(Secret);

        var appRoleRepository = new Mock<IAppRoleRepository>();
        appRoleRepository
            .Setup(r => r.GetAllAsync())
            .ThrowsAsync(new InvalidOperationException(SensitiveMessage));

        _factory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddScoped(_ => authRepository.Object);
            services.AddScoped(_ => appRoleRepository.Object);
        }));
    }

    private static string CreateToken(params string[] roles)
    {
        var claims = new List<Claim> { new(JwtRegisteredClaimNames.Sub, "caller") };
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

    [Fact]
    public async Task ThrowingEndpoint_Returns500WithOnlyTheGenericJsonMessage()
    {
        var response = await CreateClient("Admin").GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var body = await response.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        Assert.Equal(ExceptionHandlingMiddleware.GenericMessage,
            json.RootElement.GetProperty("message").GetString());
        Assert.Single(json.RootElement.EnumerateObject()); // nothing but "message"

        // No exception type, stack frames, SQL, or connection details leak out
        Assert.DoesNotContain("InvalidOperationException", body);
        Assert.DoesNotContain("   at ", body);
        Assert.DoesNotContain("SELECT", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("SQLEXPRESS", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Server=", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task WithoutToken_Still401_NotConvertedTo500()
    {
        var response = await CreateClient(roles: null).GetAsync("/api/app-roles");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ForbiddenEndpoint_Still403_NotConvertedTo500()
    {
        // reset-password requires the Admin role; an Editor token gets 403
        var response = await CreateClient("Editor")
            .PostAsync("/api/app-users/helen/reset-password", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task InvalidBody_StillReturns400ValidationProblem()
    {
        // AppRoleRequest requires RoleId/RoleName — an empty body fails model validation
        var response = await CreateClient("Admin")
            .PostAsJsonAsync("/api/app-roles", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("RoleId", body); // the field-level errors still surface
    }
}
