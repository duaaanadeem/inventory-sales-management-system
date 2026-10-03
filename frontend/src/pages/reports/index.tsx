import { useState, useEffect } from "react";
import DashboardLayout from "@/src/components/layout/DashboardLayout";
import SalesChart from "@/src/components/dashboard/SalesChart";
import ResponsiveTable from "@/src/components/tables/ResponsiveTable";
import { reportsApi } from "@/src/lib/api";
import { exportToCsv, exportToPdf } from "@/src/lib/exportUtils";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  Package,
  Truck,
  Loader2
} from "lucide-react";

type ReportType = 'daily' | 'weekly' | 'monthly' | 'products' | 'inventory' | 'profit' | 'customers' | 'suppliers';

const reportTypes: { id: ReportType, title: string, desc: string, icon: any, color: string }[] = [
  { id: "daily", title: "Daily Sales", desc: "Sales summary for a single day", icon: TrendingUp, color: "blue" },
  { id: "weekly", title: "Weekly Sales", desc: "Sales summary for the past week", icon: TrendingUp, color: "green" },
  { id: "monthly", title: "Monthly Sales", desc: "Sales summary for a month", icon: TrendingUp, color: "purple" },
  { id: "products", title: "Product Sales", desc: "Best-selling products report", icon: Package, color: "indigo" },
  { id: "inventory", title: "Inventory Report", desc: "Current stock levels", icon: Package, color: "teal" },
  { id: "profit", title: "Profit Report", desc: "Revenue vs cost analysis", icon: TrendingUp, color: "yellow" },
  { id: "customers", title: "Customer Report", desc: "Customer purchase history", icon: Users, color: "red" },
  { id: "suppliers", title: "Supplier Purchases", desc: "Purchases from suppliers", icon: Truck, color: "blue" },
];

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 ring-blue-600",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-600",
  purple: "bg-violet-50 text-violet-600 ring-violet-600",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-600",
  teal: "bg-teal-50 text-teal-600 ring-teal-600",
  yellow: "bg-amber-50 text-amber-600 ring-amber-600",
  red: "bg-rose-50 text-rose-600 ring-rose-600",
};

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      let res;
      switch (activeReport) {
        case 'daily':
        case 'weekly':
        case 'monthly':
          res = await reportsApi.sales(activeReport, from, to);
          break;
        case 'products':
          res = await reportsApi.products(from, to, 100);
          break;
        case 'inventory':
          res = await reportsApi.inventory();
          break;
        case 'profit':
          res = await reportsApi.profit(from, to);
          break;
        case 'customers':
          res = await reportsApi.customers(from, to, 100);
          break;
        case 'suppliers':
          res = await reportsApi.suppliers(from, to);
          break;
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport]);

  const handleExportCsv = () => {
    if (!data) return;
    
    let rows: any[] = [];
    if (activeReport === 'daily' || activeReport === 'weekly' || activeReport === 'monthly') {
      const labArray = data.labels || [];
      const revArray = data.revenue || [];
      const ordArray = data.orders || [];
      const avgArray = data.avg_order_value || [];
      
      rows = labArray.map((label: string, i: number) => ({
        Date: label,
        Revenue: revArray[i] || 0,
        Orders: ordArray[i] || 0,
        'Avg Order Value': avgArray[i] || 0
      }));
    } else if (activeReport === 'products') rows = data.products || [];
    else if (activeReport === 'inventory') rows = data.items || [];
    else if (activeReport === 'profit') rows = data.items || [];
    else if (activeReport === 'customers') rows = data.customers || [];
    else if (activeReport === 'suppliers') rows = data.suppliers || [];

    exportToCsv(`${activeReport}_report_${from}_to_${to}`, rows);
  };

  const handleExportPdf = () => {
    if (!data) return;
    
    let rows: any[] = [];
    if (activeReport === 'daily' || activeReport === 'weekly' || activeReport === 'monthly') {
      const labArray = data.labels || [];
      const revArray = data.revenue || [];
      const ordArray = data.orders || [];
      const avgArray = data.avg_order_value || [];
      
      rows = labArray.map((label: string, i: number) => ({
        Date: label,
        Revenue: revArray[i] || 0,
        Orders: ordArray[i] || 0,
        'Avg Order Value': avgArray[i] || 0
      }));
    } else if (activeReport === 'products') rows = data.products || [];
    else if (activeReport === 'inventory') rows = data.items || [];
    else if (activeReport === 'profit') rows = data.items || [];
    else if (activeReport === 'customers') rows = data.customers || [];
    else if (activeReport === 'suppliers') rows = data.suppliers || [];

    if (!rows.length) return;

    const columns = Object.keys(rows[0]);
    const tableData = rows.map(r => columns.map(c => r[c]));

    const titleMap: Record<string, string> = {
      daily: "Daily Sales Report",
      weekly: "Weekly Sales Report",
      monthly: "Monthly Business Report",
      products: "Product Sales Report",
      inventory: "Inventory Report",
      profit: "Profit Report",
      customers: "Customer Report",
      suppliers: "Supplier Purchases Report",
    };
    
    exportToPdf(
      titleMap[activeReport] || "Report", 
      `${activeReport}_report_${from}_to_${to}`, 
      columns, 
      tableData
    );
  };

  const renderDataView = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-slate-100">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      );
    }
    if (!data) return null;

    if (activeReport === 'daily' || activeReport === 'weekly' || activeReport === 'monthly') {
      const revArray = data.revenue || [];
      const ordArray = data.orders || [];
      const labArray = data.labels || [];
      
      const totalRev = revArray.reduce((a: number, b: number) => a + b, 0);
      const totalOrd = ordArray.reduce((a: number, b: number) => a + b, 0);
      
      const chartData = labArray.map((label: string, i: number) => ({
        sale_date: label,
        revenue: revArray[i] || 0,
        number_of_sales: ordArray[i] || 0
      }));

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center py-4">
              <div className="text-sm text-slate-500 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-slate-900">${totalRev.toFixed(2)}</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-sm text-slate-500 mb-1">Total Orders</div>
              <div className="text-2xl font-bold text-slate-900">{totalOrd}</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-sm text-slate-500 mb-1">Avg Order Value</div>
              <div className="text-2xl font-bold text-slate-900">${(totalOrd > 0 ? totalRev / totalOrd : 0).toFixed(2)}</div>
            </div>
          </div>
          <SalesChart data={chartData} />
        </div>
      );
    }

    if (activeReport === 'products') {
      return (
        <ResponsiveTable 
          columns={[
            { key: 'name', label: 'Product Name' },
            { key: 'sku', label: 'SKU' },
            { key: 'qty_sold', label: 'Units Sold' },
            { key: 'revenue', label: 'Revenue', render: (row: any) => `$${Number(row.revenue || 0).toFixed(2)}` }
          ]} 
          data={data.products || []} 
          keyField="sku" 
        />
      );
    }

    if (activeReport === 'inventory') {
      return (
        <ResponsiveTable 
          columns={[
            { key: 'name', label: 'Product Name' },
            { key: 'sku', label: 'SKU' },
            { key: 'current_stock', label: 'Current Stock' },
            { key: 'min_stock', label: 'Min Stock' },
            { key: 'status', label: 'Status', render: (row: any) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'Critical' ? 'bg-red-100 text-red-700' : row.status === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {row.status}
              </span>
            )}
          ]} 
          data={data.items || []} 
          keyField="sku" 
        />
      );
    }

    if (activeReport === 'profit') {
      return (
        <div className="space-y-4">
          {data.totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="card text-center py-4 bg-slate-50 border-0">
                <div className="text-sm text-slate-500 mb-1">Total Revenue</div>
                <div className="text-lg font-bold text-slate-900">${data.totals.revenue}</div>
              </div>
              <div className="card text-center py-4 bg-slate-50 border-0">
                <div className="text-sm text-slate-500 mb-1">Total Cost</div>
                <div className="text-lg font-bold text-slate-900">${data.totals.cost_total}</div>
              </div>
              <div className="card text-center py-4 bg-slate-50 border-0">
                <div className="text-sm text-slate-500 mb-1">Total Profit</div>
                <div className="text-lg font-bold text-emerald-600">${data.totals.profit}</div>
              </div>
              <div className="card text-center py-4 bg-slate-50 border-0">
                <div className="text-sm text-slate-500 mb-1">Margin</div>
                <div className="text-lg font-bold text-blue-600">{data.totals.margin_pct}%</div>
              </div>
            </div>
          )}
          <ResponsiveTable 
            columns={[
              { key: 'name', label: 'Product Name' },
              { key: 'revenue', label: 'Revenue', render: (row: any) => `$${Number(row.revenue || 0).toFixed(2)}` },
              { key: 'cost_total', label: 'Cost', render: (row: any) => `$${Number(row.cost_total || 0).toFixed(2)}` },
              { key: 'profit', label: 'Profit', render: (row: any) => <span className="text-emerald-600 font-medium">${Number(row.profit || 0).toFixed(2)}</span> },
              { key: 'margin_pct', label: 'Margin', render: (row: any) => `${row.margin_pct}%` }
            ]} 
            data={data.items || []} 
            keyField="sku" 
          />
        </div>
      );
    }

    if (activeReport === 'customers') {
      return (
        <ResponsiveTable 
          columns={[
            { key: 'name', label: 'Customer' },
            { key: 'phone', label: 'Phone' },
            { key: 'orders_count', label: 'Orders' },
            { key: 'total_spending', label: 'Total Spent', render: (row: any) => `$${Number(row.total_spending || 0).toFixed(2)}` },
            { key: 'last_purchase_at', label: 'Last Purchase', render: (row: any) => row.last_purchase_at ? new Date(row.last_purchase_at).toLocaleDateString() : 'N/A' }
          ]} 
          data={data.customers || []} 
          keyField="name" 
        />
      );
    }

    if (activeReport === 'suppliers') {
      return (
        <ResponsiveTable 
          columns={[
            { key: 'name', label: 'Supplier' },
            { key: 'company', label: 'Company' },
            { key: 'orders_count', label: 'Orders' },
            { key: 'total_cost', label: 'Total Spent', render: (row: any) => `$${Number(row.total_cost || 0).toFixed(2)}` },
            { key: 'last_purchase_at', label: 'Last Purchase', render: (row: any) => row.last_purchase_at ? new Date(row.last_purchase_at).toLocaleDateString() : 'N/A' }
          ]} 
          data={data.suppliers || []} 
          keyField="name" 
        />
      );
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Reports
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Generate and export business reports
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              className="btn-secondary flex-1 sm:flex-none text-sm py-2"
              onClick={handleExportCsv}
              disabled={!data || loading}
            >
              <Download size={16} className="mr-2" />
              Export CSV
            </button>
            <button 
              className="btn-secondary flex-1 sm:flex-none text-sm py-2"
              onClick={handleExportPdf}
              disabled={!data || loading}
            >
              <Download size={16} className="mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input"
              />
            </div>
            <button 
              className="btn-primary w-full sm:w-auto px-6"
              onClick={fetchReport}
              disabled={loading}
            >
              <Calendar size={18} className="mr-2" />
              Generate
            </button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {reportTypes.map((r) => {
            const Icon = r.icon;
            const isActive = activeReport === r.id;
            
            return (
              <div
                key={r.id}
                onClick={() => setActiveReport(r.id)}
                className={`card cursor-pointer transition-all ${
                  isActive 
                    ? `ring-2 ${colorMap[r.color].split(' ')[2]} shadow-md transform -translate-y-0.5 bg-slate-50/50` 
                    : 'hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[r.color].split(' ').slice(0,2).join(' ')}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                  {r.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{r.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Data View */}
        <div className="pt-2">
          <div className="card shadow-sm border border-slate-100">
            <div className="mb-4 pb-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">
                {reportTypes.find(r => r.id === activeReport)?.title} Details
              </h2>
            </div>
            {renderDataView()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
