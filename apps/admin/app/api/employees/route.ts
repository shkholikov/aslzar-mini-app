import { NextResponse, type NextRequest } from "next/server";
import { countUsersByEmployeeCode, createEmployee, getEmployees } from "@/lib/db";
import { getAuthenticatedAdmin, hasPermission } from "@/lib/auth";

/**
 * GET /api/employees
 * Returns list of employees with referred client count for each.
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "employees")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { searchParams } = request.nextUrl;
		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");
		const dateRange = fromParam && toParam ? { from: new Date(fromParam), to: new Date(toParam + "T23:59:59.999Z") } : undefined;

		const employees = await getEmployees();
		const withCounts = await Promise.all(
			employees.map(async (emp) => ({
				...emp,
				referredCount: await countUsersByEmployeeCode(emp.referralCode, dateRange)
			}))
		);

		return NextResponse.json({ employees: withCounts }, { status: 200 });
	} catch (error) {
		console.error("Error fetching employees:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

/**
 * POST /api/employees
 * Body: { name, surname, filial }
 * Creates a new employee with auto-generated referralCode (emp1, emp2, ...).
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await getAuthenticatedAdmin(request);
		if (!admin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		if (!hasPermission(admin, "employees")) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const name = typeof body?.name === "string" ? body.name.trim() : "";
		const surname = typeof body?.surname === "string" ? body.surname.trim() : "";
		const filial = typeof body?.filial === "string" ? body.filial.trim() : "";

		if (!name || !surname || !filial) {
			return NextResponse.json({ error: "name, surname va filial majburiy" }, { status: 400 });
		}

		const employee = await createEmployee({ name, surname, filial, createdBy: admin.username });

		return NextResponse.json({ employee }, { status: 201 });
	} catch (error) {
		console.error("Error creating employee:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}
