using CMS.API.Controllers;
using CMS.API.Models;
using CMS.API.Repositories;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace CMS.API.Tests.Controllers;

public class FeaturedPromoItemsControllerTests
{
    private readonly Mock<IFeaturedPromoItemRepository> _repository = new();
    private readonly FeaturedPromoItemsController _controller;

    public FeaturedPromoItemsControllerTests()
    {
        _controller = new FeaturedPromoItemsController(_repository.Object);
    }

    private static FeaturedPromoItem SampleItem(int pkid = 1, byte slot = 1) => new()
    {
        Pkid = pkid,
        ScheduleOn = new DateOnly(2026, 3, 16),
        TrainingCenterPkid = 1,
        Slot = slot,
        PromotionPkid = 10,
        Topic = "成為能AI協作的程式設計師",
        Description = "轉職就業養成班，三大主流語言任你選",
        PromoCode = "20251204_SkillTrainAI"
    };

    private static FeaturedPromoItemRequest SampleRequest(int pkid = 1, byte slot = 1) => new()
    {
        Pkid = pkid,
        ScheduleOn = new DateOnly(2026, 3, 16),
        TrainingCenterPkid = 1,
        Slot = slot,
        PromotionPkid = 10,
        Topic = "成為能AI協作的程式設計師",
        Description = "轉職就業養成班，三大主流語言任你選"
    };

    [Fact]
    public async Task GetAll_ReturnsOkWithItems()
    {
        var items = new[] { SampleItem(), SampleItem(2, 2) };
        _repository.Setup(r => r.GetAllAsync()).ReturnsAsync(items);

        var result = await _controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<FeaturedPromoItem>>(ok.Value);
        Assert.Equal(2, value.Count());
    }

    [Fact]
    public async Task Query_WithOneWeekScheduleOnRange_PassesRangeToRepository()
    {
        // Monday 2026-03-16 .. Sunday 2026-03-22
        var query = new FeaturedPromoItemQuery
        {
            ScheduleOnFrom = new DateOnly(2026, 3, 16),
            ScheduleOnTo = new DateOnly(2026, 3, 22)
        };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleItem()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var value = Assert.IsAssignableFrom<IEnumerable<FeaturedPromoItem>>(ok.Value);
        Assert.Single(value);
        _repository.Verify(r => r.QueryAsync(It.Is<FeaturedPromoItemQuery>(q =>
            q.ScheduleOnFrom == new DateOnly(2026, 3, 16) &&
            q.ScheduleOnTo == new DateOnly(2026, 3, 22))), Times.Once);
    }

    [Fact]
    public async Task Query_WithTrainingCenterFilter_PassesTrainingCenterToRepository()
    {
        var query = new FeaturedPromoItemQuery { TrainingCenterPkid = 3 };
        _repository.Setup(r => r.QueryAsync(query)).ReturnsAsync([SampleItem()]);

        var result = await _controller.Query(query);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsAssignableFrom<IEnumerable<FeaturedPromoItem>>(ok.Value);
        _repository.Verify(r => r.QueryAsync(It.Is<FeaturedPromoItemQuery>(q =>
            q.TrainingCenterPkid == 3)), Times.Once);
    }

    [Fact]
    public async Task GetById_WhenFound_ReturnsOkWithItem()
    {
        _repository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(SampleItem());

        var result = await _controller.GetById(1);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var item = Assert.IsType<FeaturedPromoItem>(ok.Value);
        Assert.Equal(1, item.Pkid);
        Assert.Equal("20251204_SkillTrainAI", item.PromoCode);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((FeaturedPromoItem?)null);

        var result = await _controller.GetById(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreatedWithNewPkid()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.ScheduleOn, request.TrainingCenterPkid, request.Slot))
            .ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(request)).ReturnsAsync(7);

        var result = await _controller.Create(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(nameof(FeaturedPromoItemsController.GetById), created.ActionName);
        _repository.Verify(r => r.CreateAsync(request), Times.Once);
    }

    [Fact]
    public async Task Create_WhenSlotTaken_ReturnsConflict()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.ExistsAsync(request.ScheduleOn, request.TrainingCenterPkid, request.Slot))
            .ReturnsAsync(true);

        var result = await _controller.Create(request);

        Assert.IsType<ConflictObjectResult>(result);
        _repository.Verify(r => r.CreateAsync(It.IsAny<FeaturedPromoItemRequest>()), Times.Never);
    }

    [Fact]
    public async Task Update_WhenFound_ReturnsNoContent()
    {
        var request = SampleRequest();
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(true);

        var result = await _controller.Update(request);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Update_WhenNotFound_ReturnsNotFound()
    {
        var request = SampleRequest(99);
        _repository.Setup(r => r.UpdateAsync(request)).ReturnsAsync(false);

        var result = await _controller.Update(request);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_WhenFound_ReturnsNoContent()
    {
        _repository.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _controller.Delete(1);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.DeleteAsync(99)).ReturnsAsync(false);

        var result = await _controller.Delete(99);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Move_WhenFound_ReturnsNoContent()
    {
        _repository.Setup(r => r.MoveSlotAsync(1, 1)).ReturnsAsync(true);

        var result = await _controller.Move(1, new FeaturedPromoItemMoveRequest { Direction = 1 });

        Assert.IsType<NoContentResult>(result);
        _repository.Verify(r => r.MoveSlotAsync(1, 1), Times.Once);
    }

    [Fact]
    public async Task Move_WhenNotFound_ReturnsNotFound()
    {
        _repository.Setup(r => r.MoveSlotAsync(99, -1)).ReturnsAsync(false);

        var result = await _controller.Move(99, new FeaturedPromoItemMoveRequest { Direction = -1 });

        Assert.IsType<NotFoundResult>(result);
    }
}
