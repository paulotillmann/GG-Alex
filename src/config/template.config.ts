// ─── Template Configuration ──────────────────────────────────────────────────
// Este é o ÚNICO arquivo que você precisa editar para personalizar o portal.
// Altere os valores abaixo para cada novo vereador/gabinete.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Logos ───────────────────────────────────────────────────────────────────
// Substitua os arquivos em src/assets/logos/ pelos logos do novo vereador.
// Os nomes dos arquivos devem corresponder aos imports abaixo.
import logoOficial from '../assets/logos/logo_oficial.png';
import logoSplash from '../assets/logos/logo_splash.png';

export const TEMPLATE_CONFIG = {
  // ─── Identidade do Gabinete ─────────────────────────────────────────────
  appName: 'Gabinete Vereador Alex Peixoto',
  vereadorName: 'Alex Peixoto',
  vereadorTitle: 'Vereador',
  gabineteSubtitle: 'Portal de Gestão do Gabinete Parlamentar',

  // ─── Textos da Tela de Login ────────────────────────────────────────────
  login: {
    heroTitle: 'Gestão de Gabinete Eficiente',
    heroSubtitle: 'Portal do Gabinete do Vereador Alex Peixoto. Gerencie Pessoas, Requerimentos, Ocorrências e Agendas de forma centralizada e ágil.',
    formTitle: 'Acesso ao Sistema',
    formSubtitle: 'Insira suas credenciais para continuar',
    emailPlaceholder: 'assessor@alexpeixoto.com.br',
  },

  // ─── Textos do Dashboard ────────────────────────────────────────────────
  dashboard: {
    greeting: 'Olá',
    subtitle: 'Panorama da base de dados do Gabinete.',
  },

  // ─── Splash Screen ─────────────────────────────────────────────────────
  splash: {
    loadingText: 'Carregando Gabinete...',
  },

  // ─── Cores da Sidebar (classes Tailwind ou HEX) ─────────────────────────
  // Paleta: Azul Marinho (#1E2B58) + Dourado/Mostarda (#DCA820)
  colors: {
    // Sidebar
    sidebarBg: 'bg-[#1E2B58]',                 // Azul marinho parlamentar (light)
    sidebarBgDark: 'dark:bg-slate-900',         // Background da sidebar (dark)
    sidebarBorder: 'border-white/10',
    sidebarBorderDark: 'dark:border-slate-800',

    // Login left panel gradient
    loginGradientFrom: 'from-[#1E2B58]',
    loginGradientTo: 'to-[#0F172A]',
    loginPanelBg: 'bg-[#1E2B58]',

    // Splash progress bar (dourado/mostarda — contrasta com azul marinho)
    splashProgressBar: 'bg-[#DCA820]',

    // Accent / botões principais
    accentBg: 'bg-[#1E2B58]',
    accentHover: 'hover:bg-[#151E3F]',
    accentRing: 'focus:ring-[#1E2B58]',
  },

  // ─── Logos (importados acima) ───────────────────────────────────────────
  logos: {
    /** Logo da sidebar no light mode */
    sidebarLight: logoOficial,
    /** Logo da sidebar no dark mode */
    sidebarDark: logoOficial,
    /** Logo grande na tela de login (painel esquerdo) */
    loginHero: logoOficial,
    /** Logo na splash screen */
    splash: logoSplash,
    /** Texto de fallback caso a imagem não carregue */
    fallbackText: 'Gabinete Vereador Alex Peixoto',
  },

  // ─── Page Title & SEO ──────────────────────────────────────────────────
  pageTitle: 'Gabinete Vereador Alex Peixoto — Portal Parlamentar',
  metaDescription: 'Portal de gestão parlamentar do Vereador Alex Peixoto. Gerencie pessoas, requerimentos, agenda e atendimentos do gabinete de forma centralizada.',
} as const;

export type TemplateConfig = typeof TEMPLATE_CONFIG;
