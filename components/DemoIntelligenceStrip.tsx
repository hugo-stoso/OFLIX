import Link from "next/link";
import { ArrowRight, BookOpen, Scale, Search, TrendingUp } from "lucide-react";

const links = [
  { href: "/market/salaries", label: "Pesquisa salarial", icon: TrendingUp },
  { href: "/demo?view=discover&type=public_exam", label: "Concursos SEAD", icon: Search },
  { href: "/market?tab=legislation", label: "Legislação atualizada", icon: Scale },
  { href: "/market?tab=articles", label: "Artigos & evidências", icon: BookOpen },
];

export function DemoIntelligenceStrip() {
  return <section className="mt-6 rounded-2xl border border-[#c9dce8] bg-[#f5fafc] p-5 sm:p-6" aria-labelledby="demo-intelligence-title"><p className="eyebrow">Inteligência OFLIX</p><h2 id="demo-intelligence-title" className="mt-2 text-xl font-black text-navy">Novidades da Demo 1.0</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Pesquisa salarial, concursos públicos, legislação e evidências organizadas para decisões no território.</p><nav className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Novidades da demonstração">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-2 rounded-lg bg-white px-3 py-3 text-sm font-bold text-navy shadow-sm hover:text-blue"><Icon size={16} className="text-blue" /><span>{label}</span><ArrowRight size={15} className="ml-auto text-blue" /></Link>)}</nav></section>;
}
