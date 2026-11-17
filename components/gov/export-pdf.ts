import { api } from "@/lib/api/client";
import type { GovAppeal, GovComplaint, GovOverview, GovUser, Page } from "@/lib/api/hooks";

const TEAL: [number, number, number] = [6, 106, 98];

async function allUsers(): Promise<GovUser[]> {
  const out: GovUser[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await api<Page<GovUser>>(`/api/v1/gov/users?page=${page}&limit=100`);
    out.push(...r.items);
    if (page >= r.pages) break;
  }
  return out;
}

const day = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

// Builds a multi-section A4 report from the overview already on screen plus users, complaints and appeals.
export async function exportGovPdf(overview: GovOverview) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const [users, complaints, appeals] = await Promise.all([allUsers(), api<GovComplaint[]>("/api/v1/gov/complaints"), api<GovAppeal[]>("/api/v1/gov/appeals")]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const k = overview.kpis;

  doc.setFillColor(...TEAL);
  doc.rect(0, 0, W, 78, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold").setFontSize(22).text("FoodBridge", M, 38);
  doc.setFont("helvetica", "normal").setFontSize(11).text("Government administration report", M, 58);
  doc.setFontSize(9).text(`Generated ${new Date().toLocaleString("en-IN")}`, W - M, 58, { align: "right" });
  doc.setTextColor(30);

  let y = 104;
  const heading = (text: string) => {
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...TEAL).text(text, M, y);
    doc.setTextColor(30);
    y += 8;
  };
  const common = {
    margin: { left: M, right: M },
    styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" as const },
    headStyles: { fillColor: TEAL, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 248, 247] as [number, number, number] },
  };
  const next = () => {
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;
  };

  heading("Platform overview");
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Meals delivered", k.meals],
      ["Kg of food saved", k.kg],
      ["Kg CO2 avoided", k.co2Kg],
      ["Completed handovers", k.handovers],
      ["Active posts", k.activePosts],
      ["Average minutes to match", k.avgMatchMinutes ?? "-"],
      ["Complaints (30 days)", k.openComplaints],
      ["Open appeals", k.openAppeals],
      ["Suspended accounts", k.suspended],
      ["Givers onboarded", k.givers],
      ["Receivers onboarded", k.takers],
    ].map(([a, b]) => [String(a), String(b)]),
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
  next();

  heading("Meals delivered per day");
  autoTable(doc, { ...common, startY: y, head: [["Date", "Meals"]], body: overview.mealsPerDay.map((d) => [day(d.date), String(d.meals)]), columnStyles: { 1: { halign: "right" } } });
  next();

  heading("Top givers");
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["#", "Name", "Type", "Area", "Meals", "Points"]],
    body: overview.leaderboard.map((g) => [String(g.rank), g.name, g.kind ?? "-", g.area, String(g.meals), String(g.points)]),
    columnStyles: { 0: { cellWidth: 28 }, 4: { halign: "right" }, 5: { halign: "right" } },
  });
  next();

  heading(`Users (${users.length})`);
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["Name", "Email", "Role", "Area", "Status", "Trust", "Pts", "Joined"]],
    body: users.map((u) => [u.name, u.email, u.role, u.area, u.status, String(u.trustScore), String(u.points), day(u.createdAt)]),
    styles: { ...common.styles, fontSize: 8 },
    columnStyles: { 1: { cellWidth: 120 }, 5: { halign: "right" }, 6: { halign: "right" } },
  });
  next();

  heading(`Complaints (${complaints.length})`);
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["Date", "From", "Against", "Post", "Reason", "Weight"]],
    body: complaints.length ? complaints.map((c) => [day(c.createdAt), c.from.name, `${c.against.name} (${c.against.status})`, c.offerTitle, c.reason, String(c.weight)]) : [["No complaints", "", "", "", "", ""]],
  });
  next();

  heading(`Appeals (${appeals.length})`);
  autoTable(doc, {
    ...common,
    startY: y,
    head: [["Date", "Account", "Email", "Status", "Message", "Decided"]],
    body: appeals.length ? appeals.map((a) => [day(a.createdAt), a.account.name, a.account.email, a.status, a.message, day(a.decidedAt)]) : [["No appeals", "", "", "", "", ""]],
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(120);
    doc.text("FoodBridge · Confidential", M, doc.internal.pageSize.getHeight() - 20);
    doc.text(`Page ${i} of ${pages}`, W - M, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }
  doc.save(`foodbridge-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
