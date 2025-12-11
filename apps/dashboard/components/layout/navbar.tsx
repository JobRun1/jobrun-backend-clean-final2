"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

interface NavItem {
  name: string;
  href: string;
}

interface NavbarProps {
  type: "admin" | "client";
  businessName?: string;
}

export default function Navbar({ type, businessName }: NavbarProps) {
  const pathname = usePathname();

  const adminNavItems: NavItem[] = [
    { name: "Dashboard", href: "/admin" },
    { name: "Clients", href: "/admin/clients" },
    { name: "Settings", href: "/admin/settings" },
  ];

  const clientNavItems: NavItem[] = [
    { name: "Dashboard", href: "/client" },
    { name: "Leads", href: "/client/leads" },
    { name: "Settings", href: "/client/settings" },
  ];

  const navItems = type === "admin" ? adminNavItems : clientNavItems;

  const isActive = (href: string) => {
    if (href === "/admin" || href === "/client") {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href={type === "admin" ? "/admin" : "/client"} className="flex items-center">
              <span className="text-xl font-bold text-gray-900">
                {type === "admin" ? "Admin Panel" : businessName || "Dashboard"}
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
