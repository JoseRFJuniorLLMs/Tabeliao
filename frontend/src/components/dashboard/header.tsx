"use client";

import { useState } from "react";
import { Bell, Search, Moon, Sun, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/hooks/use-auth";

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const mockNotifications = [
    {
      id: "1",
      title: "Contrato assinado",
      message: "O contrato de aluguel foi assinado por todas as partes.",
      time: "5 min atras",
      read: false,
    },
    {
      id: "2",
      title: "Pagamento recebido",
      message: "Pagamento de R$ 2.500,00 confirmado via PIX.",
      time: "1 hora atras",
      read: false,
    },
    {
      id: "3",
      title: "Revisao concluida",
      message: "A IA concluiu a revisao do contrato de servico.",
      time: "3 horas atras",
      read: true,
    },
  ];

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/95 backdrop-blur px-6">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar contratos, pagamentos..."
          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-lg">
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold">Notificacoes</h3>
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} novas
                </Badge>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {mockNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b p-4 last:border-0 transition-colors hover:bg-muted/50 ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                      <div className={notification.read ? "pl-5" : ""}>
                        <p className="text-sm font-medium">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Ver todas as notificacoes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-muted"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium leading-none">
                {user?.name || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.plan === "pro"
                  ? "Plano Pro"
                  : user?.plan === "business"
                  ? "Business"
                  : "Plano Gratis"}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card shadow-lg">
              <div className="border-b p-4">
                <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "email@exemplo.com"}
                </p>
              </div>
              <div className="p-1">
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
                  Meu Perfil
                </button>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
                  Configuracoes
                </button>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted">
                  Plano & Faturamento
                </button>
              </div>
              <div className="border-t p-1">
                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  onClick={logout}
                >
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
