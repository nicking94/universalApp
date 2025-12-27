// app/components/InstallmentAmortizationTable.tsx
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { formatCurrency } from "@/app/lib/utils/currency";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";

interface InstallmentAmortizationTableProps {
  total: number;
  numberOfInstallments: number;
  interestRate: number;
  startDate: string;
}

interface AmortizationRow {
  installment: number;
  dueDate: string;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const InstallmentAmortizationTable = ({
  total,
  numberOfInstallments,
  interestRate,
  startDate,
}: InstallmentAmortizationTableProps) => {
  const monthlyInterestRate = interestRate / 100;
  const factor = Math.pow(1 + monthlyInterestRate, numberOfInstallments);
  const monthlyPayment = (total * monthlyInterestRate * factor) / (factor - 1);

  let balance = total;
  const amortization: AmortizationRow[] = [];

  for (let i = 1; i <= numberOfInstallments; i++) {
    const interest = balance * monthlyInterestRate;
    const principal = monthlyPayment - interest;
    balance -= principal;

    const dueDate = addMonths(parseISO(startDate), i - 1);

    amortization.push({
      installment: i,
      dueDate: format(dueDate, "dd/MM/yyyy", { locale: es }),
      payment: monthlyPayment,
      interest,
      principal,
      balance: Math.max(0, balance),
    });
  }

  return (
    <Box sx={{ maxHeight: 200, overflow: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem" }}>
              Cuota
            </TableCell>
            <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem" }}>
              Vencimiento
            </TableCell>
            <TableCell
              sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              align="right"
            >
              Pago
            </TableCell>
            <TableCell
              sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              align="right"
            >
              Interés
            </TableCell>
            <TableCell
              sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              align="right"
            >
              Capital
            </TableCell>
            <TableCell
              sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              align="right"
            >
              Saldo
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {amortization.map((row) => (
            <TableRow key={row.installment} hover>
              <TableCell sx={{ fontSize: "0.75rem" }}>
                {row.installment}
              </TableCell>
              <TableCell sx={{ fontSize: "0.75rem" }}>{row.dueDate}</TableCell>
              <TableCell sx={{ fontSize: "0.75rem" }} align="right">
                {formatCurrency(row.payment)}
              </TableCell>
              <TableCell
                sx={{ fontSize: "0.75rem", color: "warning.main" }}
                align="right"
              >
                {formatCurrency(row.interest)}
              </TableCell>
              <TableCell sx={{ fontSize: "0.75rem" }} align="right">
                {formatCurrency(row.principal)}
              </TableCell>
              <TableCell sx={{ fontSize: "0.75rem" }} align="right">
                {formatCurrency(row.balance)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
