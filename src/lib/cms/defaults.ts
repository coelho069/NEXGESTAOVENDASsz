import type { SiteContent } from "@/lib/cms/types";

export const DEFAULT_SITE: SiteContent = {
  brandName: "FluxoGestão",
  footerBlurb:
    "Gestão comercial local-first. O caixa vive no aparelho. A nuvem alcança depois.",
  heroBadge: "REDE CAÍDA · CAIXA ATIVO",
  heroHeadline: "Liberdade operacional.",
  heroHighlight: "O turno não espera o 4G.",
  heroBody:
    "PDV no aparelho. Estoque no XML. Financeiro ao vivo. A venda entra na fila local — a nuvem alcança quando a fibra volta.",
  heroCtaPrimary: "Abrir o PDV",
  heroCtaSecondary: "Ver a gestão",
  heroTicker: "vendas gravadas offline nesta semana · 0 perdidas",
  painTitle: "Quando a internet cai.",
  painSubtitle: "Dois sistemas. O mesmo bairro. Só um continua o turno.",
  featuresTitle: "O ecossistema da loja.",
  featuresSubtitle: "PDV, estoque e financeiro no mesmo ritmo — no balcão e no escritório.",
  pricingTitle: "Planos sem letra miúda.",
  pricingSubtitle: "Pro é o que a loja usa de verdade.",
  pricingBadge: "Escolha inteligente",
  plans: [
    {
      name: "Starter",
      subtitle: "Um caixa. Um turno.",
      price: "0",
      unit: "por 30 dias",
      features: ["PDV offline", "Até 100 produtos", "Suporte por e-mail"],
      featured: false,
      cta: "Começar",
    },
    {
      name: "Pro",
      subtitle: "Onde a loja realmente vive",
      price: "99",
      unit: "por mês",
      features: [
        "PDV ilimitado offline",
        "Estoque + NF-e / XML",
        "Financeiro ao vivo",
        "Alertas de validade",
        "Catálogo online",
      ],
      featured: true,
      cta: "Começar no Pro",
    },
    {
      name: "Enterprise",
      subtitle: "Rede, várias lojas",
      price: "249",
      unit: "por mês",
      features: ["Tudo do Pro", "Multi-loja", "API", "Gerente de conta"],
      featured: false,
      cta: "Começar",
    },
  ],
  socialTitle: "Quem já tirou o medo da queda.",
  socialSubtitle: "Gente que vende todo dia. Não depoimento de agência.",
  storesLabel: "Lojas ativas agora",
  storesCount: 2847,
  logos: "Nestlé, Unilever, Ambev, BRF, Itaú, Sicredi",
  testimonials: [
    {
      name: "Mariana Rocha",
      role: "Mercadinho do Zé · Osasco",
      photo:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=60",
      text: "Quando a fibra cai no bairro, o caixa dos outros some. O meu segue. A fila sincroniza de madrugada.",
    },
    {
      name: "Carlos Mendes",
      role: "Rede Sabor Legal · 4 lojas",
      photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=60",
      text: "Validade no amarelo me devolveu o que eu jogava fora. A equipe usa sem treino de uma semana.",
    },
    {
      name: "Patrícia Lima",
      role: "Varejo de bairro · Campinas",
      photo:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=60",
      text: "Abro o dia no gráfico, não na planilha. Margem à vista. Decisão em dois minutos.",
    },
  ],
  closerKicker: "Continuidade operacional",
  closerTitle: "O próximo da fila não espera o 4G.",
  closerBody: "Abra o PDV. Simule a queda. Feche a venda mesmo assim.",
  closerCta: "Entrar no caixa",
  logoUrl: "",
};
