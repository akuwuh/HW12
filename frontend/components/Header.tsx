"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTransitionPathname } from "@/context/TransitionPathnameContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, Package, Image as ImageIcon, Boxes, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bungee } from "next/font/google";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bungee",
});

export function Header() {
  const pathname = useTransitionPathname();
  
  const shouldShowHeader = pathname && pathname !== "/";

  const navItems = [
    { 
      path: "/product", 
      label: "Product", 
      icon: Box,
      // Use Edit icon if not active?
      inactiveIcon: Edit 
    },
    { 
      path: "/packaging", 
      label: "Packaging", 
      icon: Package,
      inactiveIcon: Package
    },
    { 
      path: "/final-view", 
      label: "Final View", 
      icon: ImageIcon,
      inactiveIcon: ImageIcon
    }
  ];

  return (
    <AnimatePresence mode="wait">
      {shouldShowHeader && (
        <motion.header 
          key="header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="border-b-2 border-black shrink-0 bg-background z-50"
        >
          <div className="w-full px-4 py-3 flex items-center justify-between relative min-h-[72px]">
            <div className="flex items-center gap-3 absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <Link href="/" className="flex items-center gap-3">
                <Boxes className="w-10 h-10 cursor-pointer" />
                <span className={`text-3xl ${bungee.className} lowercase cursor-pointer`}>vril</span>
              </Link>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-0 flex items-center gap-3">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                // Use inactiveIcon if defined and not active, otherwise use icon
                const Icon = (isActive ? item.icon : (item.inactiveIcon || item.icon));
                
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-11 transition-all duration-300 border-2 border-black overflow-hidden flex items-center justify-center gap-0",
                        isActive 
                          ? "bg-secondary px-5" 
                          : "bg-background hover:bg-accent hover:scale-105 hover:border-black active:scale-95 px-3"
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span 
                        className={cn(
                          "whitespace-nowrap font-medium overflow-hidden transition-all duration-300 ease-in-out",
                          isActive ? "max-w-[200px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
                        )}
                      >
                        {item.label}
                      </span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
