using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/partners")]
public class PartnersController(IPartnerRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Partner>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<Partner>>> Query([FromBody] PartnerQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<Partner>> GetById(short id)
    {
        var partner = await repository.GetByIdAsync(id);
        return partner is null ? NotFound() : Ok(partner);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] PartnerRequest request)
    {
        var pkid = await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, new { pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] PartnerRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(short id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
