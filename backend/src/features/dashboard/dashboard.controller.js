const dashboardService = require("./dashboard.service");

async function getDashboard(req, res) {
  try {
    const stats = await dashboardService.getDashboardStats();

    const revenueByCategory =
      await dashboardService.getRevenueByCategory();

    const dailySales =
      await dashboardService.getDailySales();

    const topProducts =
      await dashboardService.getTopProducts();

    res.json({
      success: true,
      data: {
        ...stats,
        revenue_by_category: revenueByCategory,
        daily_sales: dailySales,
        top_products: topProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
}

module.exports = {
  getDashboard,
};