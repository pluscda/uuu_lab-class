using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace CMS.API.Controllers;

// Login is the only anonymous endpoint — the global FallbackPolicy protects
// everything else, including UpdateProfile below. [AllowAnonymous] sits on the
// action (not the class) because a class-level attribute would override
// authorization for every action in the controller.
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthRepository repository) : ControllerBase
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(24);

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await repository.GetUserForLoginAsync(request.UserId, Sha256Hex(request.Password));
        // Generic message: never reveal whether the UserId, password or IsActive check failed
        if (user is null)
            return Unauthorized(new { message = "Invalid credentials." });

        var secret = await repository.GetSymmetricSecurityKeyAsync();
        return Ok(new LoginResponse
        {
            UserId = user.UserId,
            UserName = user.UserName,
            AccessToken = CreateAccessToken(user, secret)
        });
    }

    // Updates the signed-in user's UserName. The target UserId comes ONLY from
    // the JWT claims — the request DTO has no UserId, and roles are untouched.
    [HttpPut("profile")]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName))
            return BadRequest(new { message = "UserName is required." });
        var userName = request.UserName.Trim();

        // "userId" claim from tokens we issue; NameIdentifier is the inbound
        // mapping of the standard "sub" claim
        var userId = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var updated = await repository.UpdateUserNameAsync(userId, userName);
        if (!updated)
            return NotFound(new { message = "User not found." });

        return Ok(new ProfileResponse { UserId = userId, UserName = userName });
    }

    // Changes the signed-in user's password. The target UserId comes ONLY from
    // the JWT claims. Failures return 400 — NOT 401, which the Angular
    // interceptor treats as "session expired" and answers with a forced logout.
    [HttpPost("change-password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (request.NewPassword != request.ConfirmNewPassword)
            return BadRequest(new { message = "新密碼與確認新密碼不一致 (New password and confirmation do not match.)" });

        if (!IsPasswordComplexEnough(request.NewPassword))
            return BadRequest(new
            {
                message = "密碼長度至少需 8 碼，且內容須至少包含四種字元的其中三種：大寫英文／小寫英文／數字／符號 "
                          + "(Password must be at least 8 characters and contain at least 3 of the 4 classes: "
                          + "uppercase / lowercase / digit / symbol.)"
            });

        // The repository verifies the current password and updates PasswordHash +
        // PasswordUpdatedTime in one atomic statement — 0 rows means the current
        // password was wrong (or the user is gone/inactive) and nothing changed.
        var changed = await repository.ChangePasswordAsync(
            userId, Sha256Hex(request.CurrentPassword), Sha256Hex(request.NewPassword));
        if (!changed)
            return BadRequest(new { message = "目前密碼不正確 (Current password is incorrect.)" });

        return NoContent();
    }

    // Length >= 8 and at least 3 of the 4 classes; anything outside A-Z/a-z/0-9
    // counts as a symbol.
    private static bool IsPasswordComplexEnough(string password)
    {
        if (password.Length < 8)
            return false;
        var classes = 0;
        if (password.Any(c => c is >= 'A' and <= 'Z')) classes++;
        if (password.Any(c => c is >= 'a' and <= 'z')) classes++;
        if (password.Any(c => c is >= '0' and <= '9')) classes++;
        if (password.Any(c => c is not (>= 'A' and <= 'Z') and not (>= 'a' and <= 'z') and not (>= '0' and <= '9'))) classes++;
        return classes >= 3;
    }

    // Login hash convention: SHA-256 of the UTF-8 bytes, uppercase hex
    private static string Sha256Hex(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static string CreateAccessToken(LoginUser user, string secret)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.UserId),
            new("userId", user.UserId),
            new("userName", user.UserName)
        };
        // Short "role" type: JWT-standard, and mapped back to ClaimTypes.Role on validation
        claims.AddRange(user.RoleIds.Select(roleId => new Claim("role", roleId)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.Add(TokenLifetime),
            signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
