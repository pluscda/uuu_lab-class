using System.Data;
using System.Reflection;
using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Services;

// Cross-cutting audit trail: repositories call LogInsert/LogUpdate/LogDelete after a
// write and one RowAudit row is inserted describing the change. Works for any entity
// type via reflection — no per-entity code.
public class RowAuditWriter(IDbConnectionFactory connectionFactory, IHttpContextAccessor httpContextAccessor)
    : IRowAuditWriter
{
    private const int ActionDescMaxLength = 1000;

    private const string InsertSql = """
        INSERT INTO RowAudit (TableName, UserName, PrimaryKeyValues, ActionType, ActionDesc, [DateTime])
        VALUES (@TableName, @UserName, @PrimaryKeyValues, @ActionType, @ActionDesc, @DateTime)
        """;

    public Task LogInsertAsync<T>(string tableName, T entity,
        IDbConnection? connection = null, IDbTransaction? transaction = null) where T : class =>
        WriteAsync(tableName, "Insert", entity, FirstStringPropertyValue(entity), connection, transaction);

    public Task LogDeleteAsync<T>(string tableName, T entity,
        IDbConnection? connection = null, IDbTransaction? transaction = null) where T : class =>
        WriteAsync(tableName, "Delete", entity, FirstStringPropertyValue(entity), connection, transaction);

    public async Task LogUpdateAsync<T>(string tableName, T before, T after,
        IDbConnection? connection = null, IDbTransaction? transaction = null) where T : class
    {
        var changed = ChangedPropertyNames(before, after);
        if (changed.Count == 0)
            return; // no-op update — skip the row rather than log an empty change
        await WriteAsync(tableName, "Update", after, string.Join(", ", changed), connection, transaction);
    }

    private Task WriteAsync(string tableName, string actionType, object entity, string actionDesc,
        IDbConnection? connection, IDbTransaction? transaction) =>
        InsertAsync(new RowAudit
        {
            TableName = tableName,
            UserName = CurrentUserName(),
            PrimaryKeyValues = PkidValue(entity),
            ActionType = actionType,
            ActionDesc = actionDesc.Length > ActionDescMaxLength ? actionDesc[..ActionDescMaxLength] : actionDesc,
            DateTime = DateTime.Now
        }, connection, transaction);

    // Virtual so unit tests can capture the row instead of hitting SQL Server.
    protected virtual async Task InsertAsync(RowAudit audit, IDbConnection? connection, IDbTransaction? transaction)
    {
        if (connection is not null)
        {
            await connection.ExecuteAsync(InsertSql, audit, transaction);
            return;
        }
        using var ownConnection = connectionFactory.CreateConnection();
        await ownConnection.ExecuteAsync(InsertSql, audit);
    }

    private string CurrentUserName()
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
            return "system";
        var name = user.FindFirst("userName")?.Value ?? user.Identity.Name;
        return string.IsNullOrWhiteSpace(name) ? "system" : name;
    }

    private static string PkidValue(object entity) =>
        entity.GetType()
            .GetProperty("pkid", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
            ?.GetValue(entity)?.ToString() ?? string.Empty;

    private static string FirstStringPropertyValue(object entity) =>
        entity.GetType().GetProperties()
            .FirstOrDefault(p => p.CanRead && p.PropertyType == typeof(string))
            ?.GetValue(entity) as string ?? string.Empty;

    private static List<string> ChangedPropertyNames(object before, object after) =>
        before.GetType().GetProperties()
            .Where(p => p.CanRead && IsComparable(p.PropertyType))
            .Where(p => !Equals(p.GetValue(before), p.GetValue(after)))
            .Select(p => p.Name)
            .ToList();

    // Nav objects and ID lists compare by reference (they would always read as
    // "changed"), so only strings and value types participate in the update diff.
    private static bool IsComparable(Type type) =>
        type == typeof(string) || (Nullable.GetUnderlyingType(type) ?? type).IsValueType;
}
