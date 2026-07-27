import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Boxes,
  ListTodo,
  Settings2,
  FileBarChart,
  Plane,
  LogOut,
  ClipboardList,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useProfile } from "@/lib/profile";
import type { Cargo } from "@/lib/store";
import logoLight from "../../public/logo-light.png?url";
import logoDark from "../../public/logo-dark.png?url";

function LogoIcon({ className }: { className?: string }) {
  return (
    <>
      <img src={logoLight} alt="Logo" className={`dark:hidden ${className}`} />
      <img src={logoDark} alt="Logo" className={`hidden dark:block ${className}`} />
    </>
  );
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Cargo[];
};

const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin"] },
  {
    to: "/inbound",
    label: "Logística Inbound",
    icon: Plane,
    roles: ["Admin", "Gerente", "Coordenador"],
  },
  {
    to: "/pedidos",
    label: "Dock-to-Stock",
    icon: Boxes,
    roles: ["Admin", "Gerente", "Coordenador", "Analista", "Auxiliar"],
  },
  {
    to: "/produtividade",
    label: "Produtividade",
    icon: ListTodo,
    roles: ["Admin", "Gerente", "Coordenador", "Analista", "Auxiliar"],
  },
  {
    to: "/templates",
    label: "Customização",
    icon: Settings2,
    roles: ["Admin", "Gerente", "Coordenador"],
  },
  {
    to: "/cadastros",
    label: "Cadastros",
    icon: ClipboardList,
    roles: ["Admin", "Gerente", "Coordenador"],
  },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, roles: ["Admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));
  const profile = useProfile((s) => s.profile);
  const userRole = (profile?.role ?? "Auxiliar") as Cargo;
  const visible = items.filter((i) => i.roles.includes(userRole));

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LogoIcon className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Operações Azime</div>
              <div className="text-[11px] text-muted-foreground">Joias · Inbound</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={
                        active
                          ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                          : ""
                      }
                    >
                      <Link to={item.to}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => useProfile.getState().logout()}
              tooltip="Sair"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
