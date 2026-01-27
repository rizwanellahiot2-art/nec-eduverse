import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineInvoices } from "@/hooks/useOfflineData";
import { ChildInfo } from "@/hooks/useMyChildren";
import { format } from "date-fns";
import { WifiOff } from "lucide-react";

interface ParentFeesModuleProps {
  child: ChildInfo | null;
  schoolId: string | null;
}

interface InvoiceRecord {
  id: string;
  invoice_no: string;
  issue_date: string;
  due_date: string | null;
  total: number;
  status: string;
}

const ParentFeesModule = ({ child, schoolId }: ParentFeesModuleProps) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  // Offline data hook
  const { data: cachedInvoices, isUsingCache } = useOfflineInvoices(schoolId);

  // Filter cached invoices for this child
  const childCachedInvoices = useMemo(() => {
    if (!child) return [];
    return cachedInvoices
      .filter(inv => inv.studentId === child.student_id)
      .map(inv => ({
        id: inv.id,
        invoice_no: inv.invoiceNo,
        issue_date: inv.issueDate,
        due_date: inv.dueDate,
        total: inv.total,
        status: inv.status,
      }));
  }, [cachedInvoices, child]);

  useEffect(() => {
    if (!child || !schoolId) return;

    // If offline, use cached data
    if (isOffline && childCachedInvoices.length > 0) {
      setInvoices(childCachedInvoices);
      setLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("finance_invoices")
        .select("id, invoice_no, issue_date, due_date, total, status")
        .eq("student_id", child.student_id)
        .order("issue_date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to fetch invoices:", error);
        // Fallback to cache on error
        if (childCachedInvoices.length > 0) {
          setInvoices(childCachedInvoices);
        }
        setLoading(false);
        return;
      }

      setInvoices(data || []);
      setLoading(false);
    };

    if (!isOffline) {
      fetchInvoices();
    }
  }, [child, schoolId, isOffline, childCachedInvoices]);

  if (!child) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Please select a child to view fee status.
      </div>
    );
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "unpaid":
        return "destructive";
      case "partial":
        return "secondary";
      default:
        return "outline";
    }
  };

  const totalUnpaid = invoices
    .filter((i) => i.status === "unpaid")
    .reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Fees</h1>
        <p className="text-muted-foreground">
          View fee invoices and payment status for {child.first_name || "your child"}
        </p>
      </div>

      {totalUnpaid > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              <strong>Outstanding Balance:</strong> PKR {totalUnpaid.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Offline Banner */}
      {isOffline && (
        <div className="rounded-2xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning text-center">
          <WifiOff className="inline-block h-4 w-4 mr-2" />
          Offline Mode — Showing cached data
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !isOffline ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.issue_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {invoice.due_date
                        ? format(new Date(invoice.due_date), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {Number(invoice.total).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentFeesModule;
