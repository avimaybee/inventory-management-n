import { Link, useLocation } from "react-router";
import { PackageOpen, Clock, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const location = useLocation();

  const links = [
    { name: "New order", href: "/", icon: PackageOpen },
    { name: "Order history", href: "/history", icon: Clock },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="bg-secondary text-secondary-foreground p-1.5 rounded-md">
            <PackageOpen className="h-5 w-5" />
          </div>
          <span className="text-foreground">Neelam Feeds</span>
        </Link>
      </div>
      <div className="flex-1 py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {links.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-muted",
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
      </div>
    </div>
  );
}
