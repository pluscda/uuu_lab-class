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

// The only anonymous controller — the global FallbackPolicy protects everything else
[AllowAnonymous]
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthRepository repository) : ControllerBase
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(24);

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var passwordHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Password)));
        var user = await repository.GetUserForLoginAsync(request.UserId, passwordHash);
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
