import {
  Building2,
  ServerCog,
  Users,
  Workflow,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  HelpCircle,
  UserCog,
  ShieldAlert,
  Presentation,
  Database,
  Plug,
  Cpu,
  ArrowRightCircle,
  UserCheck,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type { DiagramNodeType } from '@/types/crm';

interface NodeStyle {
  icon: LucideIcon;
  bg: string;
  border: string;
  text: string;
  label: string;
}

export const NODE_CONFIG: Record<DiagramNodeType, NodeStyle> = {
  office: {
    icon: Building2,
    bg: 'bg-violet-950/60',
    border: 'border-violet-400/60',
    text: 'text-violet-200',
    label: 'Escritório',
  },
  system: {
    icon: ServerCog,
    bg: 'bg-blue-950/60',
    border: 'border-blue-400/60',
    text: 'text-blue-200',
    label: 'Sistema',
  },
  team: {
    icon: Users,
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-400/60',
    text: 'text-emerald-200',
    label: 'Time',
  },
  process: {
    icon: Workflow,
    bg: 'bg-zinc-800/70',
    border: 'border-zinc-400/50',
    text: 'text-zinc-200',
    label: 'Processo',
  },
  pain: {
    icon: AlertTriangle,
    bg: 'bg-red-950/70',
    border: 'border-red-400/70',
    text: 'text-red-200',
    label: 'Dor',
  },
  signal: {
    icon: TrendingUp,
    bg: 'bg-amber-950/70',
    border: 'border-amber-300/70',
    text: 'text-amber-100',
    label: 'Sinal',
  },
  hypothesis: {
    icon: Lightbulb,
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-400/60',
    text: 'text-cyan-200',
    label: 'Hipótese',
  },
  question: {
    icon: HelpCircle,
    bg: 'bg-orange-950/60',
    border: 'border-orange-300/70',
    text: 'text-orange-200',
    label: 'Pergunta',
  },
  decision_maker: {
    icon: UserCog,
    bg: 'bg-fuchsia-950/60',
    border: 'border-fuchsia-300/70',
    text: 'text-fuchsia-200',
    label: 'Decisor',
  },
  risk: {
    icon: ShieldAlert,
    bg: 'bg-rose-950/70',
    border: 'border-rose-400/70',
    text: 'text-rose-200',
    label: 'Risco',
  },
  slide_ref: {
    icon: Presentation,
    bg: 'bg-zinc-800/60',
    border: 'border-zinc-300/40',
    text: 'text-zinc-200',
    label: 'Slide',
  },
  data_source: {
    icon: Database,
    bg: 'bg-sky-950/70',
    border: 'border-sky-300/70',
    text: 'text-sky-200',
    label: 'Fonte de dados',
  },
  integration: {
    icon: Plug,
    bg: 'bg-indigo-950/70',
    border: 'border-indigo-300/70',
    text: 'text-indigo-200',
    label: 'Integração',
  },
  processing: {
    icon: Cpu,
    bg: 'bg-blue-950/80',
    border: 'border-blue-300/80',
    text: 'text-blue-100',
    label: 'Processamento',
  },
  destination: {
    icon: ArrowRightCircle,
    bg: 'bg-teal-950/70',
    border: 'border-teal-300/70',
    text: 'text-teal-200',
    label: 'Destino',
  },
  human_review: {
    icon: UserCheck,
    bg: 'bg-pink-950/60',
    border: 'border-pink-300/70',
    text: 'text-pink-200',
    label: 'Revisão humana',
  },
  deliverable: {
    icon: Package,
    bg: 'bg-yellow-950/70',
    border: 'border-yellow-300/70',
    text: 'text-yellow-200',
    label: 'Entregável',
  },
};
