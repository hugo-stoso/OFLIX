import Link from "next/link";
import { ArrowRight, MapPin, Network, Sparkles } from "lucide-react";
import { Brand } from "@/components/Brand";

const fronts = [
  { number: "01", title: "Trabalho formal", text: "Vagas e caminhos para quem procura uma oportunidade com vínculo." },
  { number: "02", title: "Serviços autônomos", text: "Profissionais locais apresentam o que sabem fazer e onde atuam." },
  { number: "03", title: "Voluntariado", text: "Ações e pessoas se encontram para fortalecer iniciativas do território." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="shell flex h-[76px] items-center justify-between">
          <Brand />
          <span className="hidden text-sm text-[#637688] sm:block">Sergipe · demo de produto</span>
        </div>
      </header>

      <section className="shell grid gap-12 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:pt-24">
        <div>
          <p className="eyebrow">Uma plataforma territorial</p>
          <h1 className="mt-5 max-w-[680px] text-5xl font-black leading-[1.03] tracking-[-.055em] text-navy sm:text-6xl">
            O trabalho certo, no lugar certo.
          </h1>
          <p className="body-copy mt-7 max-w-[590px] text-lg leading-8">
            Trabalho formal, serviços autônomos e voluntariado em um só lugar.
          </p>
          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link className="button-primary" href="/demo">
              Entrar na demonstração <ArrowRight size={18} />
            </Link>
            <span className="text-xs font-semibold text-[#6d7f8f]">Sem cadastro · perfis fictícios</span>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#607286]">
            <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-blue" /> Sergipe como ponto de partida</span>
            <span className="inline-flex items-center gap-2"><Network size={16} className="text-blue" /> Dados agregados e responsáveis</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-2 rounded-[28px] bg-[#e8f1f6] sm:-inset-5" aria-hidden="true" />
          <div className="relative rounded-panel border border-[#cbdde8] bg-white p-7 sm:p-9">
            <div className="flex items-start justify-between border-b border-line pb-6">
              <div>
                <p className="eyebrow">A mesma base, três movimentos</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-.03em] text-navy">O território aparece nas conexões.</h2>
              </div>
              <Sparkles size={22} className="text-blue" aria-hidden="true" />
            </div>
            <div className="mt-2">
              {fronts.map((front) => (
                <div key={front.number} className="grid grid-cols-[42px_1fr] gap-4 border-b border-line py-5 last:border-0">
                  <span className="pt-0.5 text-sm font-bold text-blue">{front.number}</span>
                  <div>
                    <h3 className="font-bold text-navy">{front.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#637688]">{front.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white py-11">
        <div className="shell flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Primeira fundação da demo</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d7184]">Explore uma experiência navegável com personas fictícias, oportunidades territoriais e interações persistidas.</p>
          </div>
          <Link className="subtle-link whitespace-nowrap" href="/demo">Conhecer os perfis →</Link>
        </div>
      </section>
    </main>
  );
}
