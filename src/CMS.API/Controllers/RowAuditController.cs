using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace CMS.API.Controllers;

// Read-only audit trail for one record: GET /api/rowaudit?tableName=Course&pkid=123
[ApiController]
[Route("api/rowaudit")]
public class RowAuditController(IRowAuditRepository repository) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RowAuditEntry>>> GetByRecord(
        [FromQuery] string? tableName, [FromQuery] string? pkid)
    {
        if (string.IsNullOrWhiteSpace(tableName) || string.IsNullOrWhiteSpace(pkid))
            return BadRequest(new { message = "tableName and pkid are required." });

        return Ok(await repository.GetByRecordAsync(tableName, pkid));
    }
}
