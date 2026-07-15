namespace CMS.API.Models;

public class RowAudit
{
    public int Pkid { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string PrimaryKeyValues { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string ActionDesc { get; set; } = string.Empty;
    public DateTime DateTime { get; set; }
}
