import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionCard } from "@/components/common/section-card";
import { ReceiptText } from "lucide-react";
import { Loading } from "@/components/common/loading";

interface Contract {
	sum: number;
	vznos: number;
	months: number;
	date: string;
}

interface ContractsProps {
	contracts: Contract[];
	loading: boolean;
}

export function Contracts({ contracts, loading }: ContractsProps) {
	if (loading) return <Loading />;

	return (
		<SectionCard icon={ReceiptText} title="Shartnomalar">
			<div className="mt-2">
				<Table>
					<TableCaption>Sizning hamma aktiv shartnomalaringiz.</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[100px]">Summa</TableHead>
							<TableHead>Oylik to'lov</TableHead>
							<TableHead>Muddati</TableHead>
							<TableHead>Sana</TableHead>
							<TableHead>Qoldiq</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{contracts.map((contract, idx) => (
							<TableRow key={idx}>
								<TableCell className="font-medium">{contract.sum}</TableCell>
								<TableCell>{contract.vznos}</TableCell>
								<TableCell>{contract.months} oy</TableCell>
								<TableCell>{new Date(contract.date).toLocaleDateString("uz-UZ")}</TableCell>
								<TableCell>{contract.vznos}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</SectionCard>
	);
}
