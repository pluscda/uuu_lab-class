using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/app-roles")]
public class AppRolesController(IAppRoleRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AppRole>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<AppRole>>> Query([FromBody] AppRoleQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<AppRole>> GetById(string id)
    {
        var role = await repository.GetByIdAsync(id);
        return role is null ? NotFound() : Ok(role);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] AppRoleRequest request)
    {
        if (await repository.ExistsAsync(request.RoleId))
            return Conflict(new { message = $"RoleId '{request.RoleId}' already exists." });

        var pkid = await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = request.RoleId }, new { pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] AppRoleRequest request)
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
}
