"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuItem as SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import type React from "react";
import { useState } from "react";

export type Route = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  link: string;
  subs?: {
    title: string;
    link: string;
    icon?: React.ReactNode;
  }[];
};

function isRouteActive(pathname: string, link: string) {
  if (pathname === link) return true;
  if (link !== "/" && pathname.startsWith(link)) return true;
  return false;
}

export function DashboardNavigation({ routes }: { routes: Route[] }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [openCollapsible, setOpenCollapsible] = useState<string | null>(null);
  const location = useLocation();

  return (
    <SidebarMenu>
      {routes.map((route) => {
        const isOpen = !isCollapsed && openCollapsible === route.id;
        const hasSubRoutes = !!route.subs?.length;
        const isActive =
          isRouteActive(location.pathname, route.link) ||
          route.subs?.some((sub) => isRouteActive(location.pathname, sub.link));

        return (
          <SidebarMenuItem key={route.id}>
            {hasSubRoutes ? (
              <Collapsible
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenCollapsible(open ? route.id : null)
                }
                className="w-full"
              >
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      className={cn(
                        "flex w-full items-center rounded-lg px-2 transition-colors",
                        isOpen || isActive
                          ? "bg-sidebar-muted text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                        isCollapsed && "justify-center",
                      )}
                    />
                  }
                >
                  {route.icon}
                  {!isCollapsed && (
                    <span className="ml-2 flex-1 text-sm font-medium">
                      {route.title}
                    </span>
                  )}
                  {!isCollapsed && hasSubRoutes && (
                    <span className="ml-auto">
                      {isOpen ? (
                        <IconChevronUp className="size-4" />
                      ) : (
                        <IconChevronDown className="size-4" />
                      )}
                    </span>
                  )}
                </CollapsibleTrigger>

                {!isCollapsed && (
                  <CollapsibleContent>
                    <SidebarMenuSub className="my-1 ml-3.5">
                      {route.subs?.map((subRoute) => {
                        const isSubActive = isRouteActive(
                          location.pathname,
                          subRoute.link,
                        );
                        return (
                          <SidebarMenuSubItem
                            key={`${route.id}-${subRoute.title}`}
                            className="h-auto"
                          >
                            <SidebarMenuSubButton
                              render={
                                <Link
                                  to={subRoute.link}
                                  className={cn(
                                    "flex items-center rounded-md px-4 py-1.5 text-sm font-medium",
                                    isSubActive
                                      ? "bg-sidebar-muted text-foreground"
                                      : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                                  )}
                                />
                              }
                            >
                              {subRoute.title}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ) : (
              <SidebarMenuButton
                tooltip={route.title}
                render={
                  <Link
                    to={route.link}
                    className={cn(
                      "flex items-center rounded-lg px-2 transition-colors",
                      isActive
                        ? "bg-sidebar-muted text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-muted hover:text-foreground",
                      isCollapsed && "justify-center",
                    )}
                  />
                }
              >
                {route.icon}
                {!isCollapsed && (
                  <span className="ml-2 text-sm font-medium">
                    {route.title}
                  </span>
                )}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
