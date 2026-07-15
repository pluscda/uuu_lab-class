using System.Text;
using CMS.API.Data;
using CMS.API.Middleware;
using CMS.API.Repositories;
using CMS.API.Services;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IServiceProvider>((options, serviceProvider) =>
    {
        // Validation key = the same SysConfig 'appConfig' symmetricSecurityKey the
        // AuthController signs with; fetched on first use (DB not available at startup
        // config time), then cached for the process lifetime.
        SecurityKey[]? cachedKeys = null;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeyResolver = (_, _, _, _) =>
            {
                if (cachedKeys is null)
                {
                    using var scope = serviceProvider.CreateScope();
                    var secret = scope.ServiceProvider.GetRequiredService<IAuthRepository>()
                        .GetSymmetricSecurityKeyAsync().GetAwaiter().GetResult();
                    cachedKeys = [new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))];
                }
                return cachedKeys;
            }
        };
    });

// Every endpoint requires an authenticated user unless it opts out with
// [AllowAnonymous] (only AuthController does).
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Localhost", policy => policy
        .SetIsOriginAllowed(origin =>
            Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
            (uri.Host == "localhost" || uri.Host == "127.0.0.1"))
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<IRowAuditWriter, RowAuditWriter>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<IAppRoleRepository, AppRoleRepository>();
builder.Services.AddScoped<IAppUserRepository, AppUserRepository>();
builder.Services.AddScoped<IPublishStatusRepository, PublishStatusRepository>();
builder.Services.AddScoped<IPartnerRepository, PartnerRepository>();
builder.Services.AddScoped<ICourseGroupRepository, CourseGroupRepository>();
builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<IFeaturedPromoItemRepository, FeaturedPromoItemRepository>();
builder.Services.AddScoped<ILookupRepository, LookupRepository>();
builder.Services.AddScoped<IRowAuditRepository, RowAuditRepository>();

var app = builder.Build();

// First middleware in the pipeline: any unhandled exception from anything
// downstream becomes a logged, generic 500 JSON response.
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("Localhost");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

// Exposes the entry point to WebApplicationFactory<Program> in CMS.API.Tests
public partial class Program { }
