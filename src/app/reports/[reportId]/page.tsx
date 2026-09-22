"use client";

import { useParams } from "next/navigation";
import { Download, Send } from "lucide-react";
import { useAppContext } from "@/components/app-context";
import { Badge, Button, Card } from "@/components/ui";

export default function ReportRunPage() {
  const params = useParams<{ reportId: string }>();
  const { brandId, brands } = useAppContext();
  const brand = brands.find((item) => item.id === brandId);

  return <div className="space-y-6"><div><Badge tone="positive">Generated</Badge><h1 className="page-title mt-4">{brand?.name ?? "Selected brand"} monthly report</h1><p className="page-subtitle">Report run {params.reportId} · Previous-period comparison</p></div><Card className="p-6"><div className="grid gap-5 md:grid-cols-4"><div><p className="text-xs text-[var(--muted)]">Status</p><p className="mt-1 font-semibold">Ready to send</p></div><div><p className="text-xs text-[var(--muted)]">Commentary</p><p className="mt-1 font-semibold">Approved</p></div><div><p className="text-xs text-[var(--muted)]">Artifacts</p><p className="mt-1 font-semibold">Excel + PDF</p></div><div><p className="text-xs text-[var(--muted)]">Internal notes</p><p className="mt-1 font-semibold">Excluded</p></div></div><div className="mt-6 flex flex-wrap gap-2 border-t border-[var(--border)] pt-5"><a href={`/api/reports/excel?brandId=${brandId}`}><Button><Download size={16} /> Excel</Button></a><a href={`/api/reports/pdf?brandId=${brandId}`}><Button variant="secondary"><Download size={16} /> PDF</Button></a><Button variant="secondary"><Send size={16} /> Send</Button></div></Card></div>;
}
