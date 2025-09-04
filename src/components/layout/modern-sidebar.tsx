'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Calendar,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Cpu,
  CalendarCheck,
  Package,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface NavItem {
  name: string
  href?: string
  icon: any
  subItems?: NavItem[]
  isExternal?: boolean
}

const navigation: NavItem[] = [
  { name: 'Resum', href: '/resum', icon: BarChart3 },
  { 
    name: 'Horaris',
    icon: Calendar,
    subItems: [
      { name: 'Vista Horaris', href: '/horaris', icon: Calendar },
      { name: 'Ocupació Aules', href: '/horaris/ocupacio', icon: CalendarCheck }
    ]
  },
  { 
    name: 'Acadèmic', 
    icon: BookOpen,
    subItems: [
      { name: 'Programes', href: '/programes', icon: GraduationCap },
      { name: 'Màsters', href: '/masters', icon: Calendar },
      { name: 'Assignatures i Grups', href: '/assignatures-grups', icon: BookOpen },
      { name: 'Grups d\'Estudiants', href: '/grups-estudiants', icon: Users },
      { name: 'Professors', href: '/professors', icon: GraduationCap }
    ]
  },
  { 
    name: 'Espais', 
    icon: Building2,
    subItems: [
      { name: 'Aules', href: '/aules', icon: Building2 },
      { name: 'Assignar Aules', href: '/assignacions-aules', icon: Building2 }
    ]
  },
  { 
    name: 'Recursos', 
    icon: Cpu,
    subItems: [
      { name: 'Software', href: '/programari', icon: Cpu },
      { name: 'Equipament', href: '/equipament', icon: Package }
    ]
  },
  { name: 'Directori Públic', href: '/directori-aules', icon: ExternalLink, isExternal: true }
]

interface ModernSidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void
}

export function ModernSidebar({ onCollapsedChange }: ModernSidebarProps = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Initialize with all menu items that have subitems expanded by default
  const defaultExpandedItems = new Set(
    navigation
      .filter(item => item.subItems && item.subItems.length > 0)
      .map(item => item.name)
  )
  const [expandedItems, setExpandedItems] = useState<Set<string>>(defaultExpandedItems)
  const supabase = createClient()

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed !== null) {
      const collapsed = JSON.parse(savedCollapsed)
      setIsCollapsed(collapsed)
      onCollapsedChange?.(collapsed)
    }
  }, [onCollapsedChange])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsed))
    onCollapsedChange?.(newCollapsed)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName)
    } else {
      newExpanded.add(itemName)
    }
    setExpandedItems(newExpanded)
  }

  const isItemActive = (item: NavItem): boolean => {
    if (item.href === pathname) return true
    if (item.subItems) {
      return item.subItems.some(subItem => subItem.href === pathname)
    }
    return false
  }

  return (
    <TooltipProvider delayDuration={300}>
      <>
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-4 z-50 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black md:hidden z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300",
          "md:relative md:block",
          isCollapsed ? "w-[70px]" : "w-[280px]",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo and Collapse Button */}
          <div className="flex h-20 items-center justify-between px-4 border-b">
            <Link href="/aules" className={cn("flex items-center", isCollapsed && "justify-center w-full")}>
              {isCollapsed ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <span className="text-xl font-bold">B</span>
                </div>
              ) : (
                <Image
                  src="/imatges/BAU-black-CAT.svg"
                  alt="BAU - Centre Universitari d'Arts i Disseny"
                  width={160}
                  height={54}
                  className="dark:invert"
                />
              )}
            </Link>
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="hidden md:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {/* Expand button when collapsed */}
            {isCollapsed && (
              <div className="flex justify-center mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapsed}
                  className="hidden md:flex"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {navigation.map((item) => {
              const isActive = isItemActive(item)
              const isExpanded = expandedItems.has(item.name)
              const hasSubItems = item.subItems && item.subItems.length > 0

              return (
                <div key={item.name}>
                  {hasSubItems ? (
                    // Parent item with subitems
                    <>
                      {isCollapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                if (isCollapsed) {
                                  toggleCollapsed()
                                  // Expand this item after a short delay to allow sidebar animation
                                  setTimeout(() => toggleExpanded(item.name), 300)
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive && "bg-primary/10 text-primary",
                                "justify-center px-2"
                              )}
                            >
                              <item.icon className={cn(
                                "h-5 w-5 transition-colors",
                                isActive && "text-primary"
                              )} />
                              {isActive && (
                                <motion.div
                                  layoutId="activeNav"
                                  className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{item.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <button
                          onClick={() => toggleExpanded(item.name)}
                          className={cn(
                            "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                            "hover:bg-accent hover:text-accent-foreground",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 transition-colors",
                            isActive && "text-primary"
                          )} />
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                          {isActive && (
                            <motion.div
                              layoutId="activeNav"
                              className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                        </button>
                      )}
                      <AnimatePresence>
                        {isExpanded && !isCollapsed && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            {item.subItems?.map((subItem) => {
                              const linkContent = (
                                <>
                                  <subItem.icon className={cn(
                                    "h-4 w-4 transition-colors",
                                    pathname === subItem.href && !subItem.isExternal && "text-primary"
                                  )} />
                                  <span>{subItem.name}</span>
                                  {subItem.isExternal && (
                                    <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                                  )}
                                </>
                              )

                              return subItem.isExternal ? (
                                <a
                                  key={subItem.name}
                                  href={subItem.href!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setIsOpen(false)}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    "hover:bg-accent hover:text-accent-foreground ml-6"
                                  )}
                                >
                                  {linkContent}
                                </a>
                              ) : (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href!}
                                  onClick={() => setIsOpen(false)}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    "hover:bg-accent hover:text-accent-foreground ml-6",
                                    pathname === subItem.href && "bg-primary/10 text-primary"
                                  )}
                                >
                                  {linkContent}
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    // Regular item without subitems
                    isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href!}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                              "hover:bg-accent hover:text-accent-foreground",
                              isActive && "bg-primary/10 text-primary",
                              "justify-center px-2"
                            )}
                          >
                            <item.icon className={cn(
                              "h-5 w-5 transition-colors",
                              isActive && "text-primary"
                            )} />
                            {isActive && (
                              <motion.div
                                layoutId="activeNav"
                                className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                              />
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link
                        href={item.href!}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          "hover:bg-accent hover:text-accent-foreground",
                          isActive && "bg-primary/10 text-primary"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors",
                          isActive && "text-primary"
                        )} />
                        <span>{item.name}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeNav"
                            className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </Link>
                    )
                  )}
                </div>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="border-t p-4 space-y-2">
            {isCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/configuracio"
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        "hover:bg-accent hover:text-accent-foreground",
                        pathname === '/configuracio' && "bg-primary/10 text-primary",
                        "justify-center px-2"
                      )}
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Configuració</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-center gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
                        "px-2"
                      )}
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Tancar sessió</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Link
                  href="/configuracio"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    "hover:bg-accent hover:text-accent-foreground",
                    pathname === '/configuracio' && "bg-primary/10 text-primary"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  <span>Configuració</span>
                </Link>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Tancar sessió</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </aside>
      </>
    </TooltipProvider>
  )
}