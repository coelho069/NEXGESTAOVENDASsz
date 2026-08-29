"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Gauge,
  ShoppingCart,
  Package,
  Store,
  Banknote,
  Pencil,
  Boxes,
  HardDrive,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth/provider";
import { UserRound } from "lucide-react";
import { daysLeft, isSubExpired } from "@/lib/billing/dates";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { state, actions } = useStore();
  const pathname = usePathname();
  const { isOnline, offlineMode, pendingCount, isSyncing, syncProgress } = state;
  const { setOfflineMode, runSync } = actions;

  const { isAdmin, isSuper, user, logout } = useAuth();
  const adminNav = [
    { href: "/admin/dashboard", label: "Painel", icon: Gauge },
    { href: "/pos", label: "PDV", icon: ShoppingCart },
    { href: "/admin/produtos", label: "Produtos", icon: Boxes },
    { href: "/dashboard/estoque", label: "Estoque", icon: Package },
    { href: "/dashboard/caixa", label: "Caixa", icon: Banknote },
    { href: "/dashboard", label: "Financeiro", icon: Gauge },
    { href: "/dashboard/catalogo", label: "Catálogo", icon: Store },
    { href: "/admin", label: "Site", icon: Pencil },
    { href: "/admin/usuarios", label: "Usuários", icon: Users },
    ...(isSuper ? [{ href: "/admin/db", label: "DB", icon: HardDrive }] : []),
  ];
  const userNav = [
    { href: "/user/pdv", label: "PDV", icon: ShoppingCart },
    { href: "/user/estoque", label: "Estoque", icon: Package },
    { href: "/user/perfil", label: "Perfil", icon: UserRound },
  ];
  const nav = isAdmin ? adminNav : userNav;
  const left = daysLeft(user?.subExpiresAt);
  const warn = Boolean(user && !isSuper && !isSubExpired(user.subExpiresAt, user.role) && left > 0 && left <= 3);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {warn && (
        <div className="bg-amber-400 px-4 py-2 text-center text-xs font-medium text-amber-950">
          Assinatura vence em {left} dia(s).{" "}
          <Link href="/assinatura" className="underline">
            Renovar agora
          </Link>
        </div>
      )}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2 text-xs",
          isOnline ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
        )}
      >
        <div className="flex items-center gap-2 font-medium">
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {offlineMode
            ? "Modo Offline Ativo — vendas continuam no caixa local"
            : "Conexão estável · fila pronta para sincronizar"}
        </div>
        <div className="flex items-center gap-3">
          {syncProgress && (
            <span className="hidden text-slate-600 sm:inline">
              Sincronizando {syncProgress.done}/{syncProgress.total}
            </span>
          )}
          {pendingCount > 0 && (
            <Badge variant={offlineMode ? "warning" : "success"}>
              {pendingCount} {pendingCount === 1 ? "venda" : "vendas"} na fila
            </Badge>
          )}
          {!offlineMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void runSync()}
              disabled={isSyncing || pendingCount === 0}
              className="h-7 gap-1.5 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
              Sincronizar
            </Button>
          )}
        </div>
      </div>

      <Progress
        value={syncProgress ? (syncProgress.done / Math.max(1, syncProgress.total)) * 100 : 0}
        className="h-0.5 rounded-none"
      />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0F172A]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link href="/" aria-label="Voltar à vitrine">
            <Logo invert className="text-base" />
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {nav.map((n) => {
              const Icon = n.icon;
              const active = pathname === n.href;
              return (
                <Link key={n.href} href={n.href}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-white text-slate-900"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{n.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden text-[11px] text-slate-400 lg:inline">
                {user.name}
              </span>
            )}
            {user && (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
              >
                Sair
              </button>
            )}
            <OfflineToggle offlineMode={offlineMode} setOfflineMode={setOfflineMode} />
          </div>
        </div>
      </header>

      <motion.div
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function OfflineToggle({
  offlineMode,
  setOfflineMode,
}: {
  offlineMode: boolean;
  setOfflineMode: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
      <span className="hidden text-[11px] font-medium text-slate-200 sm:inline">
        Simular queda
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={offlineMode}
        aria-label="Simular queda de internet"
        onClick={() => setOfflineMode(!offlineMode)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          offlineMode ? "bg-amber-400" : "bg-emerald-500"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            offlineMode ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

export { OfflineToggle };
