"use client";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
}

export default function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
}: ResponsiveTableProps<T>) {
  return (
    <>
      <div className="hidden md:block table-wrapper card p-0">
        <table className="table-responsive">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((row) => (
              <tr key={String(row[keyField])} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                  >
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div key={String(row[keyField])} className="card">
            {columns
              .filter((c) => !c.hideOnMobile)
              .map((col) => (
                <div
                  key={String(col.key)}
                  className="flex justify-between items-start gap-3 py-1.5 border-b border-gray-100 last:border-0"
                >
                  <span className="text-xs font-medium text-gray-500 shrink-0">
                    {col.label}
                  </span>
                  <span className="text-sm text-gray-800 text-right">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? "")}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}