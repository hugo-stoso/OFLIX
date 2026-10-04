import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Building2, GraduationCap, MapPin, Network, Search, UsersRound, Wrench } from "lucide-react";
import { Brand } from "@/components/Brand";

const heroSearchPaths = [
  { kind: "VAGA", title: "Eletricista de manutenção", context: "Aracaju", icon: BriefcaseBusiness, className: "bg-[#edf6fb] text-blue" },
  { kind: "CURSO", title: "Eletricista instalador", context: "Capacitação", icon: GraduationCap, className: "bg-[#eff8f3] text-[#176c61]" },
  { kind: "CONCURSO", title: "Técnico de manutenção", context: "Sergipe", icon: Network, className: "bg-[#f2effb] text-[#5f4b97]" },
  { kind: "SERVIÇO", title: "Instalação elétrica residencial", context: "Aracaju", icon: Wrench, className: "bg-[#edf6fb] text-blue" },
];

const pillars = [
  {
    title: "Trabalho e oportunidades",
    text: "Caminhos para começar, continuar ou apresentar seu trabalho.",
    icon: BriefcaseBusiness,
    items: ["Empregos", "Estágio", "Serviços autônomos", "Voluntariado", "Oportunidades externas autorizadas"],
  },
  {
    title: "Desenvolvimento profissional",
    text: "Informações para aprender, se preparar e ampliar suas possibilidades.",
    icon: GraduationCap,
    items: ["Concursos públicos", "Processos seletivos", "Cursos", "Capacitação"],
  },
  {
    title: "Negócios e poder público",
    text: "Oportunidades para empresas, MEIs quando aplicável e profissionais autônomos elegíveis.",
    icon: Building2,
    items: ["Contratações públicas", "Credenciamentos", "Fornecimento", "Prestação de serviços", "Conforme requisitos oficiais"],
  },
];

const audiences = [
  { title: "Pessoas", text: "Encontre trabalho, serviços, concursos, cursos e oportunidades para desenvolver sua trajetória." },
  { title: "Profissionais autônomos e empresas", text: "Encontre pessoas, clientes e oportunidades de negócio, inclusive com o poder público quando aplicável." },
  { title: "Gestão pública e instituições", text: "Compreenda sinais agregados de oferta, demanda, conexões e oportunidades no território." },
];

const steps = [
  { number: "01", title: "Descubra", text: "Explore diferentes caminhos a partir de uma atividade, profissão ou interesse." },
  { number: "02", title: "Encontre caminhos", text: "Use seu perfil e suas preferências para organizar o que merece atenção agora." },
  { number: "03", title: "Conecte-se", text: "Candidate-se, solicite contato, demonstre interesse ou abra um chamado para hoje." },
  { number: "04", title: "O território aprende", text: "As conexões geram sinais agregados para compreender oportunidades e demandas locais." },
];

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden">
    <header className="border-b border-line bg-white"><div className="shell flex min-h-[76px] flex-wrap items-center justify-between gap-4 py-3"><Brand /><nav className="flex items-center gap-4 text-sm font-semibold text-[#637688] sm:gap-6" aria-label="Navegação pública"><a href="#encontre">O que você encontra</a><a href="#como-funciona">Como funciona</a><a href="#territorio">Território</a><Link href="/demo" className="button-primary min-h-10 px-4 py-2">Entrar na demonstração</Link></nav></div></header>

    <section className="border-b border-line bg-[#f8fbfd]" aria-labelledby="landing-title"><div className="shell grid gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24"><div><p className="eyebrow">OFLIX · HUB TERRITORIAL DE OPORTUNIDADES</p><h1 id="landing-title" className="mt-5 max-w-[720px] text-5xl font-black leading-[1.02] tracking-[-.06em] text-navy sm:text-6xl">OFLIX é um hub territorial de oportunidades.</h1><p className="body-copy mt-7 max-w-[640px] text-lg leading-8">Um ponto de encontro para descobrir trabalho, serviços, concursos, capacitação e voluntariado a partir da realidade local de Sergipe.</p><div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center"><Link className="button-primary" href="/demo">Conhecer a demonstração</Link><span className="text-xs font-semibold text-[#6d7f8f]">Sem cadastro · perfis e dados fictícios</span></div><div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#607286]"><span className="inline-flex items-center gap-2"><MapPin size={16} className="text-blue" /> Começa em Sergipe</span><span className="inline-flex items-center gap-2"><BarChart3 size={16} className="text-blue" /> Inteligência agregada</span></div></div><section className="relative" aria-label="Exemplo da experiência OFLIX"><div className="absolute -inset-3 rounded-[28px] bg-[#e8f1f6] sm:-inset-5" aria-hidden="true" /><div className="relative rounded-panel border border-[#cbdde8] bg-white p-5 shadow-soft sm:p-7"><div className="flex items-start justify-between gap-4 border-b border-line pb-4"><div><p className="eyebrow">Exemplo da experiência OFLIX</p><h2 className="mt-3 text-2xl font-bold tracking-[-.03em] text-navy">Uma busca, vários caminhos.</h2></div><Search size={22} className="text-blue" aria-hidden="true" /></div><div className="mt-5 rounded-xl border border-[#a9c9dc] bg-[#f8fbfd] p-3"><p className="text-xs font-bold text-[#718291]">O que você procura?</p><div className="mt-2 flex items-center gap-2 text-base font-bold text-navy"><Search size={16} className="text-blue" aria-hidden="true" /><span>eletricista</span></div></div><div className="mt-4 space-y-2">{heroSearchPaths.map(({ kind, title, context, icon: Icon, className }) => <div key={kind} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3"><div className={`rounded-lg p-2 ${className}`}><Icon size={16} aria-hidden="true" /></div><div className="min-w-0"><p className="text-[10px] font-black tracking-[.12em] text-[#718291]">{kind}</p><p className="truncate text-sm font-bold text-navy">{title}</p><p className="text-xs text-[#718291]">{context}</p></div></div>)}</div><p className="mt-4 text-xs font-semibold text-[#718291]">Uma mesma atividade pode revelar diferentes oportunidades no território.</p></div></section></div></section>

    <section id="encontre" className="scroll-mt-8 border-b border-line bg-white py-16 sm:py-20"><div className="shell"><div className="max-w-[700px]"><p className="eyebrow">O que você encontra</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-navy sm:text-4xl">Uma descoberta ampla, com caminhos claros.</h2><p className="body-copy mt-4">A OFLIX reúne caminhos para trabalhar, se desenvolver e movimentar negócios no território.</p></div><div className="mt-9 grid gap-4 lg:grid-cols-3">{pillars.map(({ title, text, icon: Icon, items }) => <article key={title} className="rounded-2xl border border-line bg-[#f8fbfd] p-6"><Icon size={21} className="text-blue" /><h3 className="mt-5 text-xl font-bold text-navy">{title}</h3><p className="mt-3 text-sm leading-6 text-[#637688]">{text}</p><ul className="mt-5 space-y-2 text-sm leading-6 text-[#516477]">{items.map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue" aria-hidden="true" />{item}</li>)}</ul></article>)}</div></div></section>

    <section id="para-quem" className="scroll-mt-8 border-b border-line bg-[#f8fbfd] py-16 sm:py-20"><div className="shell"><div className="max-w-[700px]"><p className="eyebrow">Para quem</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-navy sm:text-4xl">Cada perspectiva vê o próximo passo.</h2></div><div className="mt-9 grid gap-4 lg:grid-cols-3">{audiences.map((audience) => <article key={audience.title} className="rounded-2xl border border-line bg-white p-6"><UsersRound size={20} className="text-blue" /><h3 className="mt-5 text-xl font-bold text-navy">{audience.title}</h3><p className="mt-3 text-sm leading-7 text-[#637688]">{audience.text}</p></article>)}</div></div></section>

    <section id="como-funciona" className="scroll-mt-8 border-b border-line bg-white py-16 sm:py-20"><div className="shell"><div className="max-w-[700px]"><p className="eyebrow">Como funciona</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-navy sm:text-4xl">Da descoberta à inteligência territorial.</h2></div><div className="mt-10 grid gap-0 border-y border-line lg:grid-cols-4">{steps.map((step) => <article key={step.number} className="border-b border-line py-6 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"><span className="text-sm font-black text-blue">{step.number}</span><h3 className="mt-4 text-xl font-bold text-navy">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[#637688]">{step.text}</p></article>)}</div></div></section>

    <section className="border-b border-line bg-[#102f50] py-16 text-white sm:py-20" aria-labelledby="intelligence-title"><div className="shell grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#b9d8eb]">Inteligência territorial</p><h2 id="intelligence-title" className="mt-4 text-3xl font-black tracking-[-.045em] sm:text-4xl">O território também produz sinais.</h2></div><p className="max-w-[700px] text-base leading-8 text-[#d7e6ee]">Quando uma pessoa encontra uma oportunidade, uma organização publica uma demanda ou um chamado é aceito, a demonstração registra um dado operacional. Esses dados podem orientar leituras agregadas e anonimizadas sobre oferta, demanda e conexões — sem expor nomes ou localização exata.</p></div></section>

    <section id="territorio" className="scroll-mt-8 border-b border-line bg-[#f8fbfd] py-16 sm:py-20"><div className="shell grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="eyebrow">Sergipe como ponto de partida</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-navy sm:text-4xl">Construída a partir do território.</h2></div><div><p className="body-copy text-lg leading-8">A OFLIX começa por Sergipe, organizando oportunidades por município e região para aproximar pessoas, negócios e instituições da realidade local.</p><p className="mt-5 text-sm leading-7 text-[#637688]">A demonstração usa perfis e registros fictícios. Os municípios exibidos mostram como a experiência pode funcionar; não representam cobertura produtiva real nem adoção oficial.</p></div></div></section>

    <section className="bg-white py-16 sm:py-20"><div className="shell rounded-[24px] border border-[#c9dce8] bg-[#f5fafc] px-6 py-10 text-center sm:px-10"><p className="eyebrow">Próximo passo</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-navy sm:text-4xl">Descubra o que a OFLIX pode revelar no seu território.</h2><p className="mx-auto mt-4 max-w-[640px] text-sm leading-7 text-[#637688]">Entre na demonstração, escolha uma perspectiva e explore o hub com dados claramente identificados como fictícios.</p><Link className="button-primary mt-7" href="/demo">Entrar na demonstração</Link><p className="mt-5 text-xs font-semibold text-[#718291]">Versão demonstrativa · perfis e alguns dados são fictícios.</p></div></section>
  </main>;
}
