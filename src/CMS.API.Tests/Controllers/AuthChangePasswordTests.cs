using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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
/// End-to-end tests for POST /api/auth/change-password: the endpoint requires a
/// token, takes the target UserId from the JWT, verifies the current password,
/// enforces new-password complexity and confirmation, and only ever exchanges
/// plain passwords (hashes never cross the wire). Repositories are mocked so no
/// database is needed — PasswordUpdatedTime = GETUTCDATE() lives in the
/// repository SQL, so here we verify the controller hands the repository
/// SHA-256 hashes of the current and new passwords.
/// </summary>
public class AuthChangePasswordTests : IClassFixture<WebApplicationFactory<Program>>
{
    // HS256 needs a >= 256-bit key
    private const string Secret = "unit-test-symmetric-security-key-0123456789ABCDEF0123456789ABCDEF";

    private const string ComplexityMessage = "密碼長度至少需 8 碼";

    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IAuthRepository> _authRepository = new();

    public AuthChangePasswordTests(WebApplicationFactory<Program> factory)
    {
        _authRepository.Setup(r => r.GetSymmetricSecurityKeyAsync()).ReturnsAsync(Secret);
        _authRepository
            .Setup(r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _factory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddScoped(_ => _authRepository.Object)));
    }

    private static string Sha256Hex(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

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

    private Task<HttpResponseMessage> PostChangePasswordAsync(
        HttpClient client, string current, string @new, string confirm) =>
        client.PostAsJsonAsync("/api/auth/change-password",
            new { currentPassword = current, newPassword = @new, confirmNewPassword = confirm });

    private void VerifyNothingChanged() =>
        _authRepository.Verify(
            r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);

    [Fact]
    public async Task ChangePassword_WithoutToken_Returns401()
    {
        var response = await PostChangePasswordAsync(CreateClient(), "Old1!pass", "New1!pass", "New1!pass");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        VerifyNothingChanged();
    }

    [Fact]
    public async Task ChangePassword_SendsSha256HashesForTheJwtUser()
    {
        var response = await PostChangePasswordAsync(CreateClient("helen"), "Old1!pass", "New1!pass", "New1!pass");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        // Success body is empty: no hash (nor anything else) is ever returned
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
        // The repository receives SHA-256 uppercase-hex hashes, never plain text —
        // PasswordHash ends up = SHA256(new password)
        _authRepository.Verify(r => r.ChangePasswordAsync(
            "helen", Sha256Hex("Old1!pass"), Sha256Hex("New1!pass")), Times.Once);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_Returns400AndChangesNothing()
    {
        // The atomic UPDATE matches 0 rows when the stored hash differs
        _authRepository
            .Setup(r => r.ChangePasswordAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(false);

        var response = await PostChangePasswordAsync(CreateClient("helen"), "wrong-pass", "New1!pass", "New1!pass");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("目前密碼不正確", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ChangePassword_WithMismatchedConfirmation_Returns400AndChangesNothing()
    {
        var response = await PostChangePasswordAsync(CreateClient("helen"), "Old1!pass", "New1!pass", "Different1!");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("新密碼與確認新密碼不一致", await response.Content.ReadAsStringAsync());
        VerifyNothingChanged();
    }

    [Theory]
    [InlineData("Ab1!x")]      // 3 classes but shorter than 8
    [InlineData("Abcdef1")]    // 7 chars — one short of the minimum
    [InlineData("abcdefgh")]   // lowercase only (1 class)
    [InlineData("ABCDEFGH")]   // uppercase only (1 class)
    [InlineData("12345678")]   // digits only (1 class)
    [InlineData("abcdefg1")]   // lowercase + digit (2 classes)
    [InlineData("ABCDEFG!")]   // uppercase + symbol (2 classes)
    [InlineData("")]           // empty
    public async Task ChangePassword_WithWeakNewPassword_Returns400AndChangesNothing(string newPassword)
    {
        var response = await PostChangePasswordAsync(CreateClient("helen"), "Old1!pass", newPassword, newPassword);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(ComplexityMessage, await response.Content.ReadAsStringAsync());
        VerifyNothingChanged();
    }

    [Theory]
    [InlineData("Abcdefg1")]   // upper + lower + digit — no symbol needed
    [InlineData("abcdef1!")]   // lower + digit + symbol
    [InlineData("ABCDEF1!")]   // upper + digit + symbol
    [InlineData("Abcdefg!")]   // upper + lower + symbol
    [InlineData("Abc中def1")]  // non-ASCII counts as a symbol
    public async Task ChangePassword_Accepts3Of4CharacterClasses(string newPassword)
    {
        var response = await PostChangePasswordAsync(CreateClient("helen"), "Old1!pass", newPassword, newPassword);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _authRepository.Verify(r => r.ChangePasswordAsync(
            "helen", Sha256Hex("Old1!pass"), Sha256Hex(newPassword)), Times.Once);
    }
}
