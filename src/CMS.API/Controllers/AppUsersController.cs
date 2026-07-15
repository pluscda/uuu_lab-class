using System.Security.Cryptography;
using System.Text;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/app-users")]
public class AppUsersController(IAppUserRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppUser>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<AppUser>>> Query([FromBody] AppUserQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<AppUser>> GetById(string id)
    {
        var user = await repository.GetByIdAsync(id);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] AppUserRequest request)
    {
        if (await repository.ExistsAsync(request.UserId))
            return Conflict(new { message = $"UserId '{request.UserId}' already exists." });

        var pkid = await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = request.UserId }, new { pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] AppUserRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    // Admin-only ON TOP of the global FallbackPolicy: a non-Admin token is
    // authenticated but fails the role check → 403 (not 401, so the Angular
    // interceptor doesn't treat it as an expired session). The response never
    // carries the password or its hash — 204 on success.
    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/reset-password")]
    public async Task<ActionResult> ResetPassword(string id)
    {
        // Default password is read from SysConfig at request time (never cached,
        // never hard-coded); only its SHA-256 hash reaches the repository.
        var defaultPassword = await repository.GetDefaultPasswordAsync();
        var reset = await repository.ResetPasswordAsync(id, Sha256Hex(defaultPassword));
        return reset ? NoContent() : NotFound();
    }

    // Login hash convention: SHA-256 of the UTF-8 bytes, uppercase hex
    private static string Sha256Hex(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
