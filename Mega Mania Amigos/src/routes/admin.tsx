import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { getAdminData } from "@/lib/admin.functions";
import { formatCpf } from "@/lib/cpf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Download, LogOut, Users, Trophy, Hash } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel do organizador — Bolão Mega-Sena" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Palpite = {
  id: string;
  nome: string;
  cpf: string;
  dezenas: number[];
  created_at: string;
};

type AdminData = {
  participantes: Palpite[];
  total: number;
  ranking: { dezena: number; total: number }[];
};

function AdminPage() {
  const fetchData = useServerFn(getAdminData);
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchData({ data: { password } });
      setData(res as AdminData);
    } catch (err) {
      toast.error("Senha inválida.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setData(null);
    setPassword("");
  }

  async function refresh() {
    try {
      const res = await fetchData({ data: { password } });
      setData(res as AdminData);
      toast.success("Atualizado.");
    } catch {
      toast.error("Erro ao atualizar.");
    }
  }

  function exportCsv() {
    if (!data) return;
    const header = ["Nome", "CPF", "Dezenas", "Data"];
    const rows = data.participantes.map((p) => [
      p.nome,
      formatCpf(p.cpf),
      p.dezenas.map((n) => String(n).padStart(2, "0")).join(" "),
      new Date(p.created_at).toLocaleString("pt-BR"),
    ]);
    const csv =
      [header, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n") + "\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bolao-megasena-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Toaster theme="dark" position="top-center" richColors />
        <Card className="w-full max-w-sm bg-card/80 p-6 backdrop-blur">
          <h1 className="text-xl font-bold">Painel do organizador</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito.</p>
          <form onSubmit={login} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pwd">Senha</Label>
              <Input
                id="pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
          <Link
            to="/"
            className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao formulário
          </Link>
        </Card>
      </div>
    );
  }

  const top9 = data.ranking.slice(0, 9);
  const chartData = top9.map((r) => ({
    name: String(r.dezena).padStart(2, "0"),
    total: r.total,
  }));

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <Toaster theme="dark" position="top-center" richColors />
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Painel do organizador</h1>
            <p className="text-sm text-muted-foreground">Bolão Mega-Sena 30 Anos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={refresh}>
              Atualizar
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" />
              CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sair
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={<Users className="h-5 w-5" />} label="Participantes" value={data.total} />
          <Stat
            icon={<Hash className="h-5 w-5" />}
            label="Dezenas usadas"
            value={data.ranking.length}
          />
          <Stat
            icon={<Trophy className="h-5 w-5" />}
            label="Dezena mais escolhida"
            value={
              top9[0]
                ? `${String(top9[0].dezena).padStart(2, "0")} (${top9[0].total})`
                : "—"
            }
          />
        </div>

        <Card className="bg-card/80 p-5 backdrop-blur sm:p-6">
          <h2 className="text-lg font-semibold">Top 9 dezenas mais escolhidas</h2>
          {chartData.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="var(--primary)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="bg-card/80 p-5 backdrop-blur sm:p-6">
          <h2 className="text-lg font-semibold">Frequência completa (01–60)</h2>
          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10">
            {Array.from({ length: 60 }, (_, i) => i + 1).map((n) => {
              const r = data.ranking.find((x) => x.dezena === n);
              const total = r?.total ?? 0;
              const max = data.ranking[0]?.total ?? 1;
              const intensity = max ? total / max : 0;
              return (
                <div
                  key={n}
                  className="flex aspect-square flex-col items-center justify-center rounded-md border border-border/60 text-xs"
                  style={{
                    background: `color-mix(in oklab, var(--primary) ${Math.round(intensity * 70)}%, var(--card))`,
                  }}
                >
                  <span className="font-bold">{String(n).padStart(2, "0")}</span>
                  <span className="text-[10px] opacity-80">{total}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-card/80 p-5 backdrop-blur sm:p-6">
          <h2 className="text-lg font-semibold">Participantes ({data.total})</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">CPF</th>
                  <th className="py-2 pr-3">Dezenas</th>
                  <th className="py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.participantes.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-3 font-medium">{p.nome}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{formatCpf(p.cpf)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {p.dezenas.map((n) => (
                          <span
                            key={n}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold"
                          >
                            {String(n).padStart(2, "0")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2 text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
                {data.participantes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nenhum palpite ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="flex items-center gap-3 bg-card/80 p-4 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
