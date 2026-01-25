import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionCard } from "@/components/common/section-card";
import { Loading } from "@/components/common/loading";

interface Pay {
	id: number;
	sum: number;
	comment: string;
	date: string;
}

interface Contract {
	sum: number;
	skidka: number;
	vznos: number;
	months: number;
	date: string;
	pays?: Pay[];
}

interface ContractsProps {
	contracts: Contract[];
	loading: boolean;
}

function calculateRemaining(contract: Contract): number {
	const totalPaid = contract.pays?.reduce((acc, pay) => acc + pay.sum, 0) || 0;
	return contract.sum - contract.skidka - contract.vznos - totalPaid;
}

export function Contracts({ contracts, loading }: ContractsProps) {
	if (loading) return <Loading />;

	return (
		<SectionCard iconImage="/icons/contract.png" title="Shartnomalar">
			<div className="mt-2">
				<Table>
					<TableCaption>Sizning hamma aktiv shartnomalaringiz.</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[100px]">Summa</TableHead>

							<TableHead>Muddati</TableHead>
							<TableHead>Sana</TableHead>
							<TableHead>Qoldiq</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{contracts.map((contract, idx) => {
							const remaining = calculateRemaining(contract);
							return (
								<TableRow key={idx}>
									<TableCell className="font-medium">{contract.sum.toLocaleString("uz-UZ")} so&apos;m</TableCell>
									<TableCell>{contract.months} oy</TableCell>
									<TableCell>{new Date(contract.date).toLocaleDateString("uz-UZ")}</TableCell>
									<TableCell>{remaining.toLocaleString("uz-UZ")} so&apos;m</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</SectionCard>
	);
}
