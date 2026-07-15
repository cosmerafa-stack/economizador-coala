export interface TutorialStep {
  id: string;
  route: string;
  title: string;
  text: string;
}

// Routes deliberately avoid query params that would trigger a real search
// against the shared, rate-limited price source (e.g. /resultados with no
// "q" renders its header/toolbar without fetching anything).
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "busca-input",
    route: "/buscar",
    title: "Buscar produtos",
    text: "Digite o nome do produto ou o código de barras para comparar preços nas lojas próximas.",
  },
  {
    id: "busca-camera",
    route: "/buscar",
    title: "Escanear código de barras",
    text: "Prefere não digitar? Toque aqui para escanear o código de barras com a câmera do celular.",
  },
  {
    id: "resultados-sort",
    route: "/resultados",
    title: "Ordenar resultados",
    text: "Depois de buscar, ordene os resultados por menor preço, mais próximo ou mais recente.",
  },
  {
    id: "settings-menu-button",
    route: "/resultados",
    title: "Acesso rápido às configurações",
    text: "Esse botão leva direto pras configurações, de qualquer tela com resultados ou carrinho.",
  },
  {
    id: "carrinho-nav",
    route: "/carrinho",
    title: "Carrinho de revenda",
    text: "Aqui ficam os produtos que você adicionou, com o cálculo automático de preço de revenda e lucro.",
  },
  {
    id: "notas-nav",
    route: "/notas",
    title: "Notas e recibos",
    text: "Organize suas notas fiscais e recibos de compra — nossa IA lê os dados automaticamente da foto.",
  },
  {
    id: "beta-nav",
    route: "/beta",
    title: "Funções extras",
    text: "Alertas de preço-alvo, histórico, otimizador de lista de compras e mais, tudo por aqui.",
  },
  {
    id: "config-font-size",
    route: "/configuracoes",
    title: "Deixe do seu jeito",
    text: "Ajuste o tamanho da letra, ative notificações, mostre imagens dos produtos e defina uma faixa de preço.",
  },
];
