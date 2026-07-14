using System.Data;
using Microsoft.Data.SqlClient;

namespace CMS.API.Data;

public class SqlConnectionFactory(IConfiguration configuration) : IDbConnectionFactory
{
    private readonly string _connectionString =
        configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException("Connection string 'Default' not found.");

    public IDbConnection CreateConnection() => new SqlConnection(_connectionString);
}
