namespace CMS.API.Middleware;

/// <summary>
/// Catches any exception that escapes the rest of the pipeline (controllers,
/// repositories, model binding, ...), logs the full details server-side, and
/// returns one consistent 500 JSON body that never leaks stack traces, SQL
/// text, or connection details to the client. Deliberate responses — 401/403
/// from the auth middleware, 400 validation problems, 404, 409 — are plain
/// status-code results, not exceptions, so they pass through untouched.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public const string GenericMessage = "An unexpected error occurred.";

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Unhandled exception handling {Method} {Path}",
                context.Request.Method, context.Request.Path);

            // Headers already sent — the response can't be rewritten to JSON.
            if (context.Response.HasStarted)
                throw;

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { message = GenericMessage });
        }
    }
}
