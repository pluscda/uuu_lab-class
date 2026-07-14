using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/publish-statuses")]
public class PublishStatusesController(IPublishStatusRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublishStatus>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<PublishStatus>>> Query([FromBody] PublishStatusQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<PublishStatus>> GetById(byte id)
    {
        var status = await repository.GetByIdAsync(id);
        return status is null ? NotFound() : Ok(status);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] PublishStatusRequest request)
    {
        if (await repository.ExistsAsync(request.Pkid))
            return Conflict(new { message = $"Pkid '{request.Pkid}' already exists." });

        await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = request.Pkid }, new { pkid = request.Pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] PublishStatusRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(byte id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
