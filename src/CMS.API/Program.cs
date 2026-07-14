using CMS.API.Data;
using CMS.API.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Localhost", policy => policy
        .SetIsOriginAllowed(origin =>
            Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
            (uri.Host == "localhost" || uri.Host == "127.0.0.1"))
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();
builder.Services.AddScoped<IAppRoleRepository, AppRoleRepository>();
builder.Services.AddScoped<ILookupRepository, LookupRepository>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("Localhost");

app.MapControllers();

app.Run();
