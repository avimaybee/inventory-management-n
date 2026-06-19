import { Sidebar } from "./Sidebar";
import { Outlet, Link, useLocation } from "react-router";
import { useAuth } from "@/src/lib/auth";
import { LogOut, Menu, PackageOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { name: "New order", href: "/", icon: PackageOpen },
    { name: "Order history", href: "/history", icon: Clock },
  ];

  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-background focus:text-foreground focus:top-0 focus:left-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="grid min-h-screen w-full md:grid-cols-[250px_1fr] bg-background">
      <div className="hidden border-r border-border bg-card md:block">
        <Sidebar />
      </div>
      <div className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:h-[60px] lg:px-6">
          <div className="md:hidden">
            <Popover>
              <PopoverTrigger nativeButton={false} render={<div />}>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Toggle navigation menu">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-2 z-50">
                <nav className="grid gap-1">
                  {links.map((link) => {
                    const isActive = location.pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted text-sm",
                          isActive
                            ? "bg-muted text-foreground font-semibold"
                            : "text-muted-foreground"
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                        {link.name}
                      </Link>
                    );
                  })}
                </nav>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-full flex-1 flex items-center justify-between">
            <span className="font-semibold text-lg text-foreground truncate pl-2 md:pl-0">Order Management</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium text-muted-foreground mr-1 hidden sm:block">
              {user?.name}
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-sm font-semibold uppercase shrink-0" aria-hidden="true">
              {user?.name?.charAt(0)}
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Log out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-auto bg-background" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      </div>
    </>
  );
}
