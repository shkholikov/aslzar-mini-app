import * as XLSX from "xlsx";

export function exportToExcel(rows: Record<string, unknown>[], sheetName: string, filename: string) {
	if (rows.length === 0) return;
	const ws = XLSX.utils.json_to_sheet(rows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, sheetName);
	XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
