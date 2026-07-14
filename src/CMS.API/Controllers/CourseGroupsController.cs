using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/course-groups")]
public class CourseGroupsController(ICourseGroupRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CourseGroup>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<CourseGroup>>> Query([FromBody] CourseGroupQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<CourseGroup>> GetById(short id)
    {
        var group = await repository.GetByIdAsync(id);
        return group is null ? NotFound() : Ok(group);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CourseGroupRequest request)
    {
        var pkid = await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, new { pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] CourseGroupRequest request)
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
