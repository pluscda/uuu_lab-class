using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

[ApiController]
[Route("api/courses")]
public class CoursesController(ICourseRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Course>>> GetAll()
        => Ok(await repository.GetAllAsync());

    [HttpPost("query")]
    public async Task<ActionResult<IEnumerable<Course>>> Query([FromBody] CourseQuery query)
        => Ok(await repository.QueryAsync(query));

    [HttpGet("{id}")]
    public async Task<ActionResult<Course>> GetById(int id)
    {
        var course = await repository.GetByIdAsync(id);
        return course is null ? NotFound() : Ok(course);
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CourseRequest request)
    {
        var pkid = await repository.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = pkid }, new { pkid });
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromBody] CourseRequest request)
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
}
