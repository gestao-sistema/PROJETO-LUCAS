# Graph Report - C:\Projetos\projeto_alan\gem-batch-stream-6171be0c (2026-07-15)

## Corpus Check

- Corpus is ~24,870 words - fits in a single context window. You may not need a graph.

## Summary

- 584 nodes · 925 edges · 38 communities (37 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Badges & Form Controls|Badges & Form Controls]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Table & Inbound Data|Table & Inbound Data]]
- [[_COMMUNITY_Routing & Error Reporting|Routing & Error Reporting]]
- [[_COMMUNITY_Profile Menu & Avatar|Profile Menu & Avatar]]
- [[_COMMUNITY_ESLint & Prettier Config|ESLint & Prettier Config]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_shadcnui Config|shadcn/ui Config]]
- [[_COMMUNITY_Sidebar & Separator|Sidebar & Separator]]
- [[_COMMUNITY_Overlay & Input Widgets|Overlay & Input Widgets]]
- [[_COMMUNITY_Menubar Component|Menubar Component]]
- [[_COMMUNITY_Button & Calendar & Pagination|Button & Calendar & Pagination]]
- [[_COMMUNITY_App Layout & Toast|App Layout & Toast]]
- [[_COMMUNITY_App Sidebar|App Sidebar]]
- [[_COMMUNITY_Drawer & Resizable & Skeleton|Drawer & Resizable & Skeleton]]
- [[_COMMUNITY_Form & Label|Form & Label]]
- [[_COMMUNITY_Carousel Component|Carousel Component]]
- [[_COMMUNITY_Server & Error Capture|Server & Error Capture]]
- [[_COMMUNITY_File-Based Routing Docs|File-Based Routing Docs]]
- [[_COMMUNITY_Chart Component|Chart Component]]
- [[_COMMUNITY_Context Menu|Context Menu]]
- [[_COMMUNITY_Alert Dialog|Alert Dialog]]
- [[_COMMUNITY_Sheet Component|Sheet Component]]
- [[_COMMUNITY_Breadcrumb Component|Breadcrumb Component]]
- [[_COMMUNITY_Navigation Menu|Navigation Menu]]
- [[_COMMUNITY_Card Component|Card Component]]
- [[_COMMUNITY_Toggle & Toggle Group|Toggle & Toggle Group]]
- [[_COMMUNITY_Input OTP|Input OTP]]
- [[_COMMUNITY_React Hooks|React Hooks]]
- [[_COMMUNITY_Alert Component|Alert Component]]
- [[_COMMUNITY_Accordion Component|Accordion Component]]
- [[_COMMUNITY_Badge Component|Badge Component]]
- [[_COMMUNITY_Tabs Component|Tabs Component]]
- [[_COMMUNITY_API & Server Config|API & Server Config]]

## God Nodes (most connected - your core abstractions)

1. `cn()` - 69 edges
2. `compilerOptions` - 17 edges
3. `useStore` - 13 edges
4. `File-Based Routing` - 11 edges
5. `Button` - 9 edges
6. `Input` - 8 edges
7. `FileRoutesByPath` - 8 edges
8. `scripts` - 7 edges
9. `react` - 7 edges
10. `STAGE_LABEL` - 7 edges

## Surprising Connections (you probably didn't know these)

- `CalendarDayButton()` --references--> `react` [EXTRACTED]
  src/components/ui/calendar.tsx → package.json
- `useCarousel()` --references--> `react` [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `useChart()` --references--> `react` [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `useFormField()` --references--> `react` [EXTRACTED]
  src/components/ui/form.tsx → package.json
- `useSidebar()` --references--> `react` [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **TanStack Start Route File Convention Set** — src_routes_readme_index_route, src_routes_readme_about_route, src_routes_readme_users_index_route, src_routes_readme_dynamic_route, src_routes_readme_optional_segment, src_routes_readme_splat_route, src_routes_readme_layout_route, src_routes_readme_root_layout [EXTRACTED 1.00]

## Communities (38 total, 1 thin omitted)

### Community 0 - "Badges & Form Controls"

Cohesion: 0.06
Nodes (51): ERP_TONE, ErpBadge(), OriginBadge(), STAGE_TONE, StageBadge(), Checkbox, Input, SelectContent (+43 more)

### Community 1 - "Package Dependencies"

Cohesion: 0.04
Nodes (54): dependencies, class-variance-authority, clsx, cmdk, date-fns, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities (+46 more)

### Community 2 - "Table & Inbound Data"

Cohesion: 0.07
Nodes (39): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow (+31 more)

### Community 3 - "Routing & Error Reporting"

Cohesion: 0.08
Nodes (26): LovableErrorOptions, LovableEvents, reportLovableError(), Window, Route, Route, Route, Route (+18 more)

### Community 4 - "Profile Menu & Avatar"

Cohesion: 0.09
Nodes (26): Avatar, AvatarFallback, AvatarImage, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem (+18 more)

### Community 5 - "ESLint & Prettier Config"

Cohesion: 0.07
Nodes (29): devDependencies, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+21 more)

### Community 6 - "TypeScript Config"

Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 7 - "shadcn/ui Config"

Cohesion: 0.11
Nodes (18): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+10 more)

### Community 8 - "Sidebar & Separator"

Cohesion: 0.12
Nodes (16): Separator, SidebarContext, SidebarContextProps, SidebarGroupAction, SidebarInput, SidebarInset, SidebarMenuAction, SidebarMenuBadge (+8 more)

### Community 9 - "Overlay & Input Widgets"

Cohesion: 0.12
Nodes (9): HoverCardContent, PopoverContent, Progress, RadioGroup, RadioGroupItem, ScrollArea, ScrollBar, Slider (+1 more)

### Community 10 - "Menubar Component"

Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 11 - "Button & Calendar & Pagination"

Cohesion: 0.18
Nodes (13): Button, ButtonProps, buttonVariants, Calendar(), CalendarDayButton(), Pagination(), PaginationContent, PaginationEllipsis() (+5 more)

### Community 12 - "App Layout & Toast"

Cohesion: 0.18
Nodes (12): sonner, AppLayout(), ProfileMenu(), SidebarProvider, SidebarTrigger, Toaster(), ToasterProps, defaultProfile (+4 more)

### Community 13 - "App Sidebar"

Cohesion: 0.15
Nodes (13): AppSidebar(), items, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel (+5 more)

### Community 14 - "Drawer & Resizable & Skeleton"

Cohesion: 0.20
Nodes (10): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle, ResizableHandle(), ResizablePanelGroup() (+2 more)

### Community 15 - "Form & Label"

Cohesion: 0.15
Nodes (11): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+3 more)

### Community 16 - "Carousel Component"

Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 17 - "Server & Error Capture"

Cohesion: 0.26
Nodes (8): consumeLastCapturedError(), renderErrorPage(), fetch(), getServerEntry(), normalizeCatastrophicSsrResponse(), ServerEntry, errorMiddleware, startInstance

### Community 18 - "File-Based Routing Docs"

Cohesion: 0.20
Nodes (12): About Route (about.tsx to /about), Dynamic Route (users/$id.tsx to /users/:id), File-Based Routing, Index Route (index.tsx to /), Layout Route (_layout.tsx via Outlet), Next.js/Remix Conventions - Avoided, Optional Segment (posts/{-$category}.tsx to /posts/:category?), Root Layout (__root.tsx app shell) (+4 more)

### Community 19 - "Chart Component"

Cohesion: 0.20
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 20 - "Context Menu"

Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 21 - "Alert Dialog"

Cohesion: 0.22
Nodes (8): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle

### Community 22 - "Sheet Component"

Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 23 - "Breadcrumb Component"

Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 24 - "Navigation Menu"

Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 25 - "Card Component"

Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 26 - "Toggle & Toggle Group"

Cohesion: 0.33
Nodes (5): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants

### Community 27 - "Input OTP"

Cohesion: 0.33
Nodes (5): input-otp, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

### Community 28 - "React Hooks"

Cohesion: 0.33
Nodes (5): react, useCarousel(), useChart(), useFormField(), useIsMobile()

### Community 29 - "Alert Component"

Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 30 - "Accordion Component"

Cohesion: 0.50
Nodes (3): AccordionContent, AccordionItem, AccordionTrigger

### Community 31 - "Badge Component"

Cohesion: 0.67
Nodes (3): Badge(), BadgeProps, badgeVariants

### Community 32 - "Tabs Component"

Cohesion: 0.50
Nodes (3): TabsContent, TabsList, TabsTrigger

## Knowledge Gaps

- **306 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `css` (+301 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Drawer & Resizable & Skeleton` to `Badges & Form Controls`, `Table & Inbound Data`, `Profile Menu & Avatar`, `Sidebar & Separator`, `Overlay & Input Widgets`, `Menubar Component`, `Button & Calendar & Pagination`, `Form & Label`, `Carousel Component`, `Chart Component`, `Context Menu`, `Alert Dialog`, `Sheet Component`, `Breadcrumb Component`, `Navigation Menu`, `Card Component`, `Toggle & Toggle Group`, `Input OTP`, `Alert Component`, `Accordion Component`, `Badge Component`, `Tabs Component`?**
  _High betweenness centrality (0.275) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies` to `App Layout & Toast`, `Input OTP`, `React Hooks`, `ESLint & Prettier Config`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `react` connect `React Hooks` to `Package Dependencies`, `Button & Calendar & Pagination`, `App Sidebar`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _306 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Badges & Form Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.05570745044429255 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.037037037037037035 - nodes in this community are weakly interconnected._
- **Should `Table & Inbound Data` be split into smaller, more focused modules?**
  _Cohesion score 0.0663265306122449 - nodes in this community are weakly interconnected._
