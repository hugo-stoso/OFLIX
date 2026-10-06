import Link from "next/link";
import { ArrowRight, BookOpen, Scale, TrendingUp } from "lucide-react";

export type MarketAudience = "person" | "company" | "nonprofit" | "publicInstitution";

type TeaserCopy = {
  title: string;
  description: string;
};

type MarketShortcut = {
  href: string;
  title: string;
  actionLabel: string;
  icon: typeof TrendingUp;
  description: Record<MarketAudience, string>;
};

const teaserCopy: Record<MarketAudience, TeaserCopy> = {
  person: {
    title: "Entenda melhor suas oportunidades.",
    description: "Compare remunerações, consulte legislação e explore pesquisas sobre trabalho, gestão e produtividade.",
  },
  company: {
    title: "Decida com mais informação.",
    description: "Consulte remunerações, legislação para negócios e pesquisas sobre gestão e produtividade.",
  },
  nonprofit: {
    title: "Conhecimento para mobilizar e gerir.",
    description: "Consulte legislação, referências de mercado e pesquisas relacionadas à gestão social e ao trabalho.",
  },
  publicInstitution: {
    title: "Referências para gestão e território.",
    description: "Consulte legislação, mercado de trabalho e estudos aplicados à gestão pública e às políticas de trabalho.",
  },
};

const shortcuts: MarketShortcut[] = [
  {
    href: "/market?tab=salary",
    title: "Salários e mercado",
    actionLabel: "Ver Salários e mercado",
    icon: TrendingUp,
    description: {
      person: "Compare valores anunciados e referências do mercado.",
      company: "Compare remunerações para apoiar contratações.",
      nonprofit: "Consulte referências para planejar oportunidades.",
      publicInstitution: "Leia referências do mercado de trabalho.",
    },
  },
  {
    href: "/market?tab=legislation",
    title: "Legislação para trabalho e negócios",
    actionLabel: "Consultar Legislação para trabalho e negócios",
    icon: Scale,
    description: {
      person: "Conheça normas relacionadas ao trabalho e às oportunidades.",
      company: "Consulte normas relevantes para trabalho e negócios.",
      nonprofit: "Consulte normas para trabalho e gestão social.",
      publicInstitution: "Consulte referências legais para gestão pública.",
    },
  },
  {
    href: "/market?tab=articles",
    title: "Artigos & evidências",
    actionLabel: "Explorar Artigos & evidências",
    icon: BookOpen,
    description: {
      person: "Explore pesquisas sobre carreira, trabalho e produtividade.",
      company: "Veja estudos sobre gestão, processos e produtividade.",
      nonprofit: "Explore pesquisas sobre gestão social e trabalho.",
      publicInstitution: "Veja estudos aplicados à gestão e às políticas de trabalho.",
    },
  },
];

export function MarketKnowledgeTeaser({ audience }: { audience: MarketAudience }) {
  const copy = teaserCopy[audience];

  return (
    <section className="mt-8 border-y border-[#c9dce8] py-6 sm:py-7" aria-labelledby="market-knowledge-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Mercado &amp; Conhecimento</p>
          <h2 id="market-knowledge-title" className="mt-2 max-w-[720px] text-xl font-bold tracking-[-.02em] text-navy sm:text-2xl">{copy.title}</h2>
          <p className="mt-2 max-w-[760px] text-sm leading-6 text-[#637688]">{copy.description}</p>
        </div>
        <Link href="/market" className="subtle-link shrink-0">Explorar <ArrowRight size={16} /></Link>
      </div>
      <nav className="mt-5 grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-line" aria-label="Atalhos de Mercado e Conhecimento">
        {shortcuts.map(({ href, title, actionLabel, icon: Icon, description }) => (
          <Link key={href} href={href} aria-label={actionLabel} className="group flex items-start gap-3 border-t border-line py-4 transition-colors hover:text-blue sm:border-t-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
            <span className="mt-0.5 rounded-lg bg-[#edf6fb] p-2 text-blue"><Icon size={16} aria-hidden="true" /></span>
            <span className="min-w-0">
              <strong className="block text-sm font-bold text-navy group-hover:text-blue">{title}</strong>
              <span className="mt-1 block text-xs leading-5 text-[#637688]">{description[audience]}</span>
            </span>
            <ArrowRight size={16} className="mt-1 ml-auto shrink-0 text-blue transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
