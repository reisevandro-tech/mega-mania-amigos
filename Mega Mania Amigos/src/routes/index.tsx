import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DezenaGrid } from "@/components/DezenaGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { formatCpf, isValidCpf, onlyDigits } from "@/lib/cpf";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Trophy, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolão Mega-Sena 30 Anos — Palpites entre Amigos" },
      {
        name: "description",
        content:
          "Cadastre seu palpite com 9 dezenas para o bolão da Mega-Sena 30 Anos. Rápido, gratuito e entre amigos.",
      },
      { property: "og:title", content: "Bolão Mega-Sena 30 Anos" },
      { property: "og:description", content: "Escolha suas 9 dezenas e participe do bolão entre amigos." },
    ],
  }),
  component: Home,
});

const REQUIRED = 9;

function Home() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dezenas, setDezenas] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<null | { nome: string; dezenas: number[] }>(null);

  const cpfDigits = useMemo(() => onlyDigits(cpf), [cpf]);
  const cpfOk = isValidCpf(cpfDigits);
  const nomeOk = nome.trim().length >= 2;
  const dezenasOk = dezenas.length === REQUIRED;
  const canSubmit = nomeOk && cpfOk && dezenasOk && !loading;

  function toggle(n: number) {
    setDezenas((cur) =>
      cur.includes(n)
        ? cur.filter((x) => x !== n)
        : cur.length >= REQUIRED
          ? cur
          : [...cur, n].sort((a, b) => a - b),
    );
  }

  function surprise() {
    const pool = Array.from({ length: 60 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setDezenas(pool.slice(0, REQUIRED).sort((a, b) => a - b));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await supabase.from("palpites").insert({
      nome: nome.trim(),
      cpf: cpfDigits,
      dezenas,
    });
    setLoading(false);
    if (error) {
      const msg = /duplicate|unique/i.test(error.message)
        ? "Este CPF já registrou um palpite."
        : error.message;
      toast.error(msg);
      return;
    }
    setDone({ nome: nome.trim(), dezenas: [...dezenas] });
  }

  function novoPalpite() {
    setDone(null);
    setNome("");
    setCpf("");
    setDezenas([]);
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-12">
      <Toaster theme="dark" position="top-center" richColors />

      <header className="mx-auto mb-8 max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-muted-foreground backdrop-blur font-bold text-3xl">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Mega-Sena 30 Anos
        </div>
        <h1 className="mt-4 bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          Bolão entre Amigos
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Cadastre seu palpite com <strong className="text-foreground">9 dezenas</strong> de 01 a 60.
          Cada CPF entra uma única vez.
        </p>
      </header>

      <main className="mx-auto max-w-3xl">
        {done ? (
          <Card className="border-primary/40 bg-card/80 p-6 text-center backdrop-blur sm:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Trophy className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold">Palpite registrado!</h2>
            <p className="mt-1 text-muted-foreground">
              Boa sorte, <strong className="text-foreground">{done.nome}</strong>!
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {done.dezenas.map((n) => (
                <span
                  key={n}
                  className="mega-ball flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold"
                >
                  {String(n).padStart(2, "0")}
                </span>
              ))}
            </div>
            <Button onClick={novoPalpite} variant="secondary" className="mt-8">
              Cadastrar outro palpite
            </Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="space-y-4 bg-card/80 p-5 backdrop-blur sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    autoComplete="name"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                  {cpf.length > 0 && !cpfOk && (
                    <p className="text-xs text-destructive">CPF inválido.</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="space-y-4 bg-card/80 p-5 backdrop-blur sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Escolha suas dezenas</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecionadas:{" "}
                    <span className={dezenasOk ? "text-primary font-semibold" : "text-foreground font-semibold"}>
                      {dezenas.length}
                    </span>
                    /{REQUIRED}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDezenas([])}>
                    Limpar
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={surprise}>
                    Surpresinha
                  </Button>
                </div>
              </div>
              <DezenaGrid selected={dezenas} onToggle={toggle} max={REQUIRED} />
            </Card>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-12 w-full text-base font-semibold"
              size="lg"
            >
              {loading ? "Enviando…" : "Confirmar palpite"}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Seus dados ficam protegidos. CPF é usado apenas para evitar duplicidade.
            </p>
          </form>
        )}
      </main>

      <footer className="mx-auto mt-12 max-w-3xl text-center text-xs text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground transition-colors">
          Painel do organizador
        </Link>
      </footer>
    </div>
  );
}
