using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/featured-promo-items")]
public class FeaturedPromoItemsController(IFeaturedPromoItemRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FeaturedPromoItem>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<FeaturedPromoItem>>> Query([FromBody] FeaturedPromoItemQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<FeaturedPromoItem>> GetById(int id)
    {
        var item = await repository.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] FeaturedPromoItemRequest request)
    {
        if (await repository.ExistsAsync(request.ScheduleOn, request.TrainingCenterPkid, request.Slot))
            return Conflict(new { message = $"Slot {request.Slot} on {request.ScheduleOn:yyyy-MM-dd} is already taken." });

        var pkid = await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, new { pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] FeaturedPromoItemRequest request)
    {
        var updated = await repository.UpdateAsync(request);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var deleted = await repository.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{id}/move")]
    public async Task<ActionResult> Move(int id, [FromBody] FeaturedPromoItemMoveRequest request)
    {
        var moved = await repository.MoveSlotAsync(id, request.Direction);
        return moved ? NoContent() : NotFound();
    }
}
