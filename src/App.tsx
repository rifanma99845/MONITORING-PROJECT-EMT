import React, { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { 
  DndContext, 
  useDraggable, 
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { PanelData, HistoryItem } from "./types";
import { calculateTotalProgress, cn } from "./lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Undo, Redo, Trash2, Edit2, Settings2, Maximize2, Minimize2, Menu, Layout as LayoutIcon, ClipboardList, Settings, Search, Check, Send, Lock, Unlock, ChevronRight, ChevronLeft, X, Sun, Moon, BarChart3, Activity, Eye, EyeOff, RefreshCw, Share2, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { fetchAppData, loginUser, registerUser, saveLayout, submitChecklist, updateMasterData, submitUpdateHistory, submitDelivery, deletePanelFromSheet, PengerjaanItem, StatusChecklist, type MasterData } from "./services/spreadsheetService";

// --- Components ---

// --- Components ---

/**
 * Executive View Component (Stand-alone to prevent re-mounting flickers)
 */
const ExecutiveView = forwardRef(({ 
  panels, 
  isToolbarCollapsed, 
  setIsToolbarCollapsed,
  layoutTheme,
  setLayoutTheme,
  zoomPercent,
  setZoomPercent,
  handleZoomHold,
  stopZoom,
  isFullScreen,
  toggleFullScreen,
  lastSyncTime
}: any, ref: React.Ref<HTMLDivElement>) => {
  const w1Summary = panels.filter((p: any) => p.warehouse === "Warehouse 1");
  const w2Summary = panels.filter((p: any) => p.warehouse === "Warehouse 2");

  const calculateSummary = (warehousePanels: any[]) => {
    if (warehousePanels.length === 0) return { total: 0, teams: {} as Record<string, number> };
    const teamTotals: Record<string, number> = {};
    const teamCounts: Record<string, number> = {};
    let grandTotal = 0;

    warehousePanels.forEach(panel => {
      grandTotal += calculateTotalProgress(panel);
      Object.entries(panel.progress).forEach(([team, value]) => {
        const val = value as number;
        teamTotals[team] = (teamTotals[team] || 0) + val;
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      });
    });

    const averageTotal = Math.round(grandTotal / (warehousePanels.length || 1));
    const teamAverages: Record<string, number> = {};
    Object.keys(teamTotals).forEach(team => {
      teamAverages[team] = Math.round(teamTotals[team] / (teamCounts[team] || 1));
    });
    return { total: averageTotal, teams: teamAverages };
  };

  const s1 = calculateSummary(w1Summary);
  const s2 = calculateSummary(w2Summary);

  return (
    <motion.div 
      ref={ref}
      key="executive"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className={cn("w-full max-w-7xl min-h-[80vh] rounded-[48px] border shadow-2xl overflow-hidden relative p-10 flex flex-col gap-10", layoutTheme === "dark" ? "bg-[#020617] border-slate-800" : "bg-white border-slate-200", isFullScreen && "fixed inset-0 z-[100] rounded-none p-10 overflow-auto")}
    >
      {/* Collapsible Executive Toolbar */}
      <motion.div 
        initial={false}
        animate={{ x: isToolbarCollapsed ? 48 : 0 }}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center"
      >
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
          className={cn(
            "w-6 h-14 rounded-l-xl bg-slate-900 border border-slate-800 shadow-xl hover:bg-slate-900 z-10 -mr-[1px] transition-all",
            isToolbarCollapsed ? "opacity-100" : "opacity-80 hover:opacity-100"
          )}
        >
          {isToolbarCollapsed ? <ChevronLeft className="w-3 h-3 text-cyan-400" /> : <ChevronRight className="w-3 h-3 text-cyan-400" />}
        </Button>

        <div className={cn("border rounded-l-2xl p-1.5 shadow-2xl flex flex-col items-center gap-2 w-11", layoutTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
          {/* Theme Toggle */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setLayoutTheme(layoutTheme === "dark" ? "light" : "dark")}
            className={cn("w-8 h-8 rounded-lg transition-all", layoutTheme === "dark" ? "text-cyan-400 hover:bg-cyan-400/10" : "text-slate-600 hover:bg-slate-200")}
          >
            {layoutTheme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </Button>

          <div className={cn("w-6 h-[1px]", layoutTheme === "dark" ? "bg-slate-800" : "bg-slate-200")} />

          {/* Zoom Controls */}
          <div className="flex flex-col gap-1">
            <Button 
              variant="ghost" 

              size="icon" 
              className={cn("h-8 w-8 rounded-lg select-none", layoutTheme === "dark" ? "text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10" : "text-slate-600 hover:bg-slate-200")}
              onMouseDown={() => handleZoomHold(1)}
              onMouseUp={stopZoom}
              onMouseLeave={stopZoom}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={() => handleZoomHold(1)}
              onTouchEnd={stopZoom}
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <div className="flex flex-col items-center py-1">
              <span className={cn("text-[8px] font-black", layoutTheme === "dark" ? "text-cyan-400" : "text-slate-900")}>{zoomPercent}%</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8 rounded-lg select-none", layoutTheme === "dark" ? "text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10" : "text-slate-600 hover:bg-slate-200")}
              onMouseDown={() => handleZoomHold(-1)}
              onMouseUp={stopZoom}
              onMouseLeave={stopZoom}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={() => handleZoomHold(-1)}
              onTouchEnd={stopZoom}
              title="Zoom Out"
            >
              <div className="w-2.5 h-0.5 bg-current rounded-full" />
            </Button>
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setZoomPercent(0)}
              className={cn("w-8 h-8 rounded-lg", layoutTheme === "dark" ? "text-slate-500 hover:text-cyan-400" : "text-slate-600 hover:bg-slate-200")}
            >
              <Search className="w-3 h-3" />
            </Button>
          </div>

          <div className={cn("w-6 h-[1px]", layoutTheme === "dark" ? "bg-slate-800" : "bg-slate-200")} />

          {/* Fullscreen */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={toggleFullScreen}
            className={cn("w-8 h-8 rounded-lg", layoutTheme === "dark" ? "text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10" : "text-slate-600 hover:bg-slate-200")}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </motion.div>

      {/* Content Wrapper with Zoom */}
      <div 
        className="flex-1 flex flex-col gap-12 transition-transform duration-200"
        style={{ 
          transform: `scale(${1 + (zoomPercent / 100) * 0.5})`,
          transformOrigin: "center top"
        }}
      >
        {/* Cyberpunk Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Header */}
      <div className="flex items-end justify-between relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 font-black tracking-[0.4em] uppercase text-xs">System Status: Active</span>
          </div>
          <h2 className={cn("text-5xl font-black uppercase tracking-tighter", layoutTheme === "dark" ? "text-white" : "text-slate-900")}>
            Executive Dashboard
          </h2>
        </div>
        <div className="text-right">
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Last Sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "Pending"}</p>
          <p className={cn("font-black text-lg uppercase tracking-tighter", layoutTheme === "dark" ? "text-slate-400" : "text-slate-600")}>EMT MONITORING v2.0</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-8 relative z-10">
        {[
          { label: "Warehouse 1", data: s1, color: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/20", gradId: "grad1" },
          { label: "Warehouse 2", data: s2, color: "from-magenta-500 to-purple-600", glow: "shadow-magenta-500/20", gradId: "grad2" }
        ].map((wh, idx) => (
          <div key={wh.label} className={cn("border rounded-[40px] p-8 flex flex-col gap-6 shadow-2xl", layoutTheme === "dark" ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-2xl font-black uppercase tracking-tight", layoutTheme === "dark" ? "text-white" : "text-slate-900")}>{wh.label}</h3>
            </div>

            <div className="flex items-center gap-10">
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg width="176" height="176" className="rotate-[-90deg]">
                  <circle cx="88" cy="88" r="80" stroke={layoutTheme === "dark" ? "#ffffff03" : "#00000010"} strokeWidth="8" fill="transparent" />
                  <motion.circle
                    cx="88" cy="88" r="80" stroke={`url(#${wh.gradId})`} strokeWidth="8" fill="transparent"
                    strokeDasharray={80 * 2 * Math.PI}
                    initial={{ strokeDashoffset: 80 * 2 * Math.PI }}
                    animate={{ strokeDashoffset: 80 * 2 * Math.PI - (wh.data.total / 100) * (80 * 2 * Math.PI) }}
                    transition={{ duration: 2, ease: "circOut" }}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id={wh.gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={idx === 0 ? "#22d3ee" : "#d946ef"} />
                      <stop offset="100%" stopColor={idx === 0 ? "#2563eb" : "#9333ea"} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={cn("text-4xl font-black tracking-tighter", layoutTheme === "dark" ? "text-white" : "text-slate-900")}>{wh.data.total}%</span>
                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Total</span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                {Object.entries(wh.data.teams).map(([team, val]) => (
                  <div key={team} className={cn("rounded-xl p-3 flex flex-col gap-1 transition-colors border", layoutTheme === "dark" ? "bg-slate-950/40 border-slate-700 hover:bg-slate-900" : "bg-white border-slate-200 shadow-sm hover:bg-slate-50")}>
                    <span className={cn("text-[9px] font-bold uppercase tracking-wider", layoutTheme === "dark" ? "text-slate-400" : "text-slate-600")}>{team}</span>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-xl font-bold tracking-tighter", layoutTheme === "dark" ? "text-white" : "text-slate-950")}>{val}</span>
                      <span className={cn("text-[10px] font-medium opacity-80", layoutTheme === "dark" ? "text-slate-500" : "text-slate-500")}>%</span>
                    </div>
                    <div className={cn("h-1.5 w-full rounded-full overflow-hidden mt-1", layoutTheme === "dark" ? "bg-slate-950" : "bg-slate-200")}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ duration: 1 }}
                        className={cn(
                          "h-full rounded-full",
                          val < 25 ? "bg-red-500" :
                          val < 50 ? "bg-purple-500" :
                          val < 90 ? "bg-blue-500" :
                          "bg-emerald-500"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-800 pt-8 relative z-10">
        <div className="flex gap-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Database Linked</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Stream</span>
          </div>
        </div>
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Cyber-Physical Monitoring Interface</p>
      </div>
    </div>
  </motion.div>
  );
});

interface PanelProps {
  panel: PanelData;
  onEdit: (panel: PanelData | null) => void;
  onDelete: (id: string) => void;
  onMaximize: (panel: PanelData) => void;
  onDelivery: (panel: PanelData) => void;
  isOverlay?: boolean;
  disabled?: boolean;
  zoom: number;
  warehouse?: string;
  theme?: "dark" | "light";
  scale: number;
  isDelivering?: boolean;
}

const Panel: React.FC<PanelProps> = ({ panel, onEdit, onDelete, onMaximize, onDelivery, isOverlay, disabled, zoom, warehouse, theme = "dark", scale, isDelivering }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: panel.id,
    disabled: disabled
  });

  const style = transform ? {
    transform: `translate3d(${transform.x / zoom}px, ${transform.y / zoom}px, 0)`,
    transition: isDragging ? "none" : "transform 0.2s ease-out",
  } : undefined;

  const totalProgress = calculateTotalProgress(panel);
  const isDark = theme === "dark";
  
  // User requested: Dark Mode -> White Panel, Light Mode -> Dark Panel
  const panelIsLight = isDark; 

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: isOverlay ? "relative" : "absolute",
        left: isOverlay ? 0 : panel.position.x,
        top: isOverlay ? 0 : panel.position.y,
        zIndex: isDragging ? 100 : 10,
        transform: `${style?.transform || ""} scale(${scale})`,
        transformOrigin: "top left"
      }}
      className={cn(
        "rounded-2xl border overflow-hidden select-none group transition-all panel-item",
        panelIsLight 
          ? "bg-white border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.1)]" 
          : "bg-slate-900 border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
        !isDragging && "transition-all",
        isDragging && "z-[100] border-blue-600 shadow-none ring-0",
        !isDragging && !disabled && (panelIsLight ? "cursor-grab hover:shadow-2xl hover:border-blue-200" : "cursor-grab hover:shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:border-blue-500/50"),
        disabled && "cursor-default"
      )}
      {...attributes}
      {...listeners}
    >
      <div style={{ width: 220, height: 210 }}>
        {/* Header: Code & Name */}
        <div className={cn("px-5 pt-1 pb-0 relative transition-colors", panelIsLight ? "bg-slate-50" : "bg-slate-950")}>
          <div className="flex justify-between items-center mb-1">
            <div className={cn("px-2 py-0.5 rounded-md font-black uppercase tracking-widest text-[13px]", panelIsLight ? "bg-blue-600 text-white" : "bg-cyan-500 text-slate-950")}>
              {panel.code}
            </div>
            <div className={cn(
              "w-3 h-3 rounded-full transition-all",
              totalProgress === 100 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : (panelIsLight ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]")
            )} />
          </div>
          <div className={cn("font-black truncate leading-none uppercase tracking-tighter text-[28px]", panelIsLight ? "text-slate-900" : "text-white")}>
            {panel.name}
          </div>
        </div>
      
        {/* Progress Grid */}
        <div className={cn("px-5 pt-0 pb-3 space-y-2 relative transition-colors", panelIsLight ? "bg-white" : "bg-slate-900")}>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
              <span className={cn(panelIsLight ? "text-slate-700" : "text-slate-300")}>Overall Progress</span>
              <span className={cn("text-[13px]", panelIsLight ? "text-blue-800" : "text-cyan-400")}>{totalProgress}%</span>
            </div>
            <div className={cn("h-3 w-full rounded-full overflow-hidden p-0.5", panelIsLight ? "bg-slate-200" : "bg-slate-950")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress}%` }}
                className={cn(
                  "h-full rounded-full",
                  totalProgress === 100 ? "bg-emerald-500" : (panelIsLight ? "bg-blue-600" : "bg-cyan-600")
                )}
              />
            </div>
          </div>

          <div className={cn("grid gap-1.5", 
            Object.keys(panel.progress).length <= 3 ? "grid-cols-3" : 
            Object.keys(panel.progress).length === 4 ? "grid-cols-2" : "grid-cols-3"
          )}>
            {Object.entries(panel.progress).map(([team, value]) => {
              const shortName = team.length > 3 ? team.substring(0, 3) : team;
              let colorClass = "bg-blue-50/50 border-blue-100/50";
              let textClass = "text-blue-600";
              let valClass = "text-blue-900";

              if (team.toUpperCase() === "FABRIKASI") {
                colorClass = panelIsLight ? "bg-blue-50 border-blue-100" : "bg-blue-950/30 border-blue-900/50";
                textClass = panelIsLight ? "text-blue-600" : "text-blue-400";
                valClass = panelIsLight ? "text-blue-950" : "text-white";
              } else if (team.toUpperCase() === "WIRING") {
                colorClass = panelIsLight ? "bg-emerald-50 border-emerald-100" : "bg-emerald-950/30 border-emerald-900/50";
                textClass = panelIsLight ? "text-emerald-600" : "text-emerald-400";
                valClass = panelIsLight ? "text-emerald-950" : "text-white";
              } else if (team.toUpperCase() === "BUSBAR") {
                colorClass = panelIsLight ? "bg-amber-50 border-amber-100" : "bg-amber-950/30 border-amber-900/50";
                textClass = panelIsLight ? "text-amber-600" : "text-amber-400";
                valClass = panelIsLight ? "text-amber-950" : "text-white";
              } else if (team.toUpperCase() === "TAGGING") {
                colorClass = panelIsLight ? "bg-purple-50 border-purple-100" : "bg-purple-950/30 border-purple-900/50";
                textClass = panelIsLight ? "text-purple-600" : "text-purple-400";
                valClass = panelIsLight ? "text-purple-950" : "text-white";
              }

              return (
                <div key={team} className={cn("flex flex-col items-center py-1.5 px-2 rounded-xl border transition-all", colorClass)}>
                  <span className={cn("text-[8px] font-black uppercase tracking-tight mb-0.5", textClass)}>{shortName}</span>
                  <span className={cn("text-[18px] font-black leading-none", valClass)}>{value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover Actions Overlay */}
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 pointer-events-none">
        <div className={cn("p-2 rounded-2xl shadow-2xl border flex gap-1.5 pointer-events-auto scale-90 group-hover:scale-100 transition-transform", panelIsLight ? "bg-white border-slate-100" : "bg-slate-800 border-slate-700")}>
          <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", panelIsLight ? "text-slate-600 hover:bg-slate-50" : "text-slate-300 hover:bg-slate-700")} onClick={(e) => { e.stopPropagation(); onMaximize(panel); }}>
            <Maximize2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDelete(panel.id); }}>
            <Trash2 className="h-5 w-5" />
          </Button>
          {totalProgress === 100 && (
            <Button disabled={isDelivering} variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", isDelivering ? "text-emerald-300 pointer-events-none" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50")} onClick={(e) => { e.stopPropagation(); console.log("Truck clicked"); onDelivery(panel); }}>
              <Truck className={cn("h-5 w-5", isDelivering && "animate-pulse")} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem("emt_user"));
  const [userRole, setUserRole] = useState<string | null>(() => localStorage.getItem("emt_role"));
  const [userTeam, setUserTeam] = useState<string | null>(() => localStorage.getItem("emt_team"));
  const [fullName, setFullName] = useState<string | null>(() => localStorage.getItem("emt_fullName") || "User");
  const [historyUserName, setHistoryUserName] = useState(user || "");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({ fullName: "", team: "", username: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    if (user) setHistoryUserName(user);
  }, [user]);
  
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<PanelData | null>(null);
  const [maximizedPanel, setMaximizedPanel] = useState<PanelData | null>(null);
  const [layoutSize] = useState({ width: 3000, height: 1800 });
  const [baseZoom, setBaseZoom] = useState(0.32);
  const [zoom, setZoom] = useState(0.32);
  const [zoomPercent, setZoomPercent] = useState(0);
  const [panelScale, setPanelScale] = useState(1.0);
  const zoomIntervalRef = useRef<any>(null);
  const zoomTimeoutRef = useRef<any>(null);
  const scaleIntervalRef = useRef<any>(null);
  const scaleTimeoutRef = useRef<any>(null);

  const stopZoom = useCallback(() => {
    if (zoomIntervalRef.current) clearInterval(zoomIntervalRef.current);
    if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    zoomIntervalRef.current = null;
    zoomTimeoutRef.current = null;
  }, []);

  const stopScale = useCallback(() => {
    if (scaleIntervalRef.current) clearInterval(scaleIntervalRef.current);
    if (scaleTimeoutRef.current) clearTimeout(scaleTimeoutRef.current);
    scaleIntervalRef.current = null;
    scaleTimeoutRef.current = null;
  }, []);

  const handleZoomHold = useCallback((delta: number) => {
    stopZoom();
    setZoomPercent(prev => Math.min(100, Math.max(0, prev + delta)));
    
    zoomTimeoutRef.current = setTimeout(() => {
      zoomIntervalRef.current = setInterval(() => {
        setZoomPercent(prev => Math.min(100, Math.max(0, prev + delta)));
      }, 40);
    }, 300);
  }, [stopZoom]);

  const handleScaleHold = useCallback((delta: number) => {
    stopScale();
    setPanelScale(prev => Math.min(1.5, Math.max(0.5, prev + delta)));
    
    scaleTimeoutRef.current = setTimeout(() => {
      scaleIntervalRef.current = setInterval(() => {
        setPanelScale(prev => Math.min(1.5, Math.max(0.5, prev + delta)));
      }, 40);
    }, 300);
  }, [stopScale]);

  // Add this to your App component or pass it as prop
  const handleDelivery = async (panel: any) => {
    if (deliveringPanels.includes(panel.id)) return;
    
    setDeliveringPanels(prev => [...prev, panel.id]);
    console.log("Delivery clicked for panel:", panel.id);
    
    const success = await submitDelivery(appsScriptUrl!, {
      project: panel.project,
      panelName: panel.name,
      panelCode: panel.code,
      panelId: panel.id,
      username: user || "unknown",
      fullName: fullName || user || "unknown"
    });
    
    setDeliveringPanels(prev => prev.filter(id => id !== panel.id));
    
    if (success) {
      console.log("Delivery success, removing from layout");
      setDeliveredPanelCodes(prev => [...prev, panel.code.toUpperCase().trim()]);
      // Remove from panel list completely!
      setPanels(prevPanels => {
        const newPanels = prevPanels.filter(p => p.id !== panel.id);
        
        // Push the auto removal to script, but it is already done in AppsScript by deleteRow.
        // Doing saveLayout here ensures everything is perfectly synced
        if (appsScriptUrl) {
          saveLayout(appsScriptUrl, newPanels).catch(console.error);
        }
        
        return newPanels;
      });
      alert("Panel delivery recorded dan dihapus dari Layout!");
    } else {
      console.log("Delivery failed");
      alert("Delivery gagal.");
    }
  };
  const [currentView, setCurrentView] = useState(() => {
    const role = localStorage.getItem("emt_role");
    const team = localStorage.getItem("emt_team");
    if (role === 'user') {
      if (team === 'BUSBAR' || team === 'TAGGING') return "update_busbar";
      return "update_wiring";
    }
    return "monitoring";
  });
  const [selectedWarehouse, setSelectedWarehouse] = useState<"Warehouse 1" | "Warehouse 2">("Warehouse 1");
  const [layoutTheme, setLayoutTheme] = useState<"dark" | "light">("dark");
  const [isLocked, setIsLocked] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [deliveredPanels, setDeliveredPanels] = useState<string[]>([]);
  const [deliveredPanelCodes, setDeliveredPanelCodes] = useState<string[]>([]);
  const [deliveringPanels, setDeliveringPanels] = useState<string[]>([]);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const PANEL_WIDTH = 220 * panelScale;
  const PANEL_HEIGHT = 210 * panelScale;
  const PANEL_PADDING = 20 * panelScale;

  const checkCollision = (pos1: { x: number, y: number }, pos2: { x: number, y: number }) => {
    // Reduce padding to allow mepet (0px gap)
    const padding = 1; 
    return !(
      pos1.x + PANEL_WIDTH < pos2.x - padding ||
      pos1.x > pos2.x + PANEL_WIDTH + padding ||
      pos1.y + PANEL_HEIGHT < pos2.y - padding ||
      pos1.y > pos2.y + PANEL_HEIGHT + padding
    );
  };
  
  const [isAddingPanel, setIsAddingPanel] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const monitoringRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const getWarehouseSummary = () => {
    const warehousePanels = panels.filter(p => p.warehouse === selectedWarehouse);
    if (warehousePanels.length === 0) return { total: 0, teams: {} as Record<string, number> };

    const teamTotals: Record<string, number> = {};
    const teamCounts: Record<string, number> = {};
    let grandTotal = 0;

    warehousePanels.forEach(panel => {
      grandTotal += calculateTotalProgress(panel);
      Object.entries(panel.progress).forEach(([team, value]) => {
        const val = value as number;
        teamTotals[team] = (teamTotals[team] || 0) + val;
        teamCounts[team] = (teamCounts[team] || 0) + 1;
      });
    });

    const averageTotal = Math.round(grandTotal / warehousePanels.length);
    const teamAverages: Record<string, number> = {};
    Object.keys(teamTotals).forEach(team => {
      teamAverages[team] = Math.round(teamTotals[team] / teamCounts[team]);
    });

    return { total: averageTotal, teams: teamAverages };
  };

  const summary = getWarehouseSummary();


  const OFFICE_AREA_W1 = {
    x: 2300,
    y: 550,
    width: 700,
    height: 700
  };

  const OFFICE_AREA_W2 = {
    x: 2000,
    y: 1000,
    width: 1000,
    height: 800
  };

  const currentOfficeArea = selectedWarehouse === "Warehouse 1" ? OFFICE_AREA_W1 : OFFICE_AREA_W2;

  const isInsideOffice = (pos: { x: number, y: number }) => {
    // Check if any part of the panel (176x210) is inside the office
    return !(
      pos.x + PANEL_WIDTH < currentOfficeArea.x ||
      pos.x > currentOfficeArea.x + currentOfficeArea.width ||
      pos.y + PANEL_HEIGHT < currentOfficeArea.y ||
      pos.y > currentOfficeArea.y + currentOfficeArea.height
    );
  };

  const [newPanelForm, setNewPanelForm] = useState({ project: "", name: "", code: "" });
  
  // Master Data from Spreadsheet
  const [masterData, setMasterData] = useState<MasterData>({ 
    projects: [], 
    teams: ["FABRIKASI", "WIRING", "BUSBAR", "TAGGING"] 
  });
  const [pengerjaanData, setPengerjaanData] = useState<PengerjaanItem[]>([]);
  const [statusChecklist, setStatusChecklist] = useState<StatusChecklist[]>([]);
  
  // Form states
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPanelName, setSelectedPanelName] = useState("");
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [selectedPanelCodes, setSelectedPanelCodes] = useState<string[]>([]);
  const [selectedBagianKerja, setSelectedBagianKerja] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingChecklist, setPendingChecklist] = useState<string[]>([]);

  // Apps Script URL Configuration
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => 
    localStorage.getItem("emt_apps_script_url") || 
    (import.meta as any).env?.VITE_APPS_SCRIPT_URL || 
    "https://script.google.com/macros/s/AKfycbzmMBmS5dQpqgyIuSPeA5G2EXOpCAX3xIQvMCMGTLmPwLb0j-9ozaIXJzsqiB7pGjtX/exec"
  );

  // Debug state for master
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Settings UI States
  const [settingsSelectedProject, setSettingsSelectedProject] = useState("");
  const [settingsSelectedPanelName, setSettingsSelectedPanelName] = useState("");
  const [settingsNewItem, setSettingsNewItem] = useState({ project: "", panel: "", code: "", team: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'project' | 'panel' | 'code' | 'team', value: string } | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<string | null>(null);
  const [isDeletingPanel, setIsDeletingPanel] = useState(false);

  const handleAddMaster = async (type: 'project' | 'panel' | 'code' | 'team') => {
    if (!appsScriptUrl) return;
    setIsSyncing(true);
    
    const newMaster = { ...masterData };
    if (type === 'project') {
      if (!settingsNewItem.project) return;
      const val = settingsNewItem.project.toUpperCase().trim();
      if (!newMaster.projects.find(p => p.name === val)) {
        newMaster.projects.push({ name: val, panels: [] });
      }
    } else if (type === 'panel') {
      if (!settingsSelectedProject || !settingsNewItem.panel) return;
      const proj = newMaster.projects.find(p => p.name === settingsSelectedProject.toUpperCase().trim());
      const val = settingsNewItem.panel.toUpperCase().trim();
      if (proj && !proj.panels.find(p => p.name === val)) {
        proj.panels.push({ name: val, codes: [] });
      }
    } else if (type === 'code') {
      if (!settingsSelectedProject || !settingsSelectedPanelName || !settingsNewItem.code) return;
      const proj = newMaster.projects.find(p => p.name === settingsSelectedProject.toUpperCase().trim());
      const pnl = proj?.panels.find(p => p.name === settingsSelectedPanelName.toUpperCase().trim());
      const val = settingsNewItem.code.toUpperCase().trim();
      if (pnl && !pnl.codes.includes(val)) {
        pnl.codes.push(val);
      }
    } else if (type === 'team') {
      if (!settingsNewItem.team) return;
      const val = settingsNewItem.team.toUpperCase().trim();
      if (!newMaster.teams.includes(val)) {
        newMaster.teams.push(val);
      }
    }

    const success = await updateMasterData(appsScriptUrl, newMaster);
    if (success) {
      setMasterData(newMaster);
      setSettingsNewItem({ project: "", panel: "", code: "", team: "" });
    }
    setIsSyncing(false);
  };

  const handleDeleteMaster = (type: 'project' | 'panel' | 'code' | 'team', value: string) => {
    setDeleteConfirm({ type, value });
  };

  const executeDeleteMaster = async () => {
    if (!deleteConfirm || !appsScriptUrl) return;
    const { type, value } = deleteConfirm;
    setDeleteConfirm(null);
    setIsSyncing(true);
    
    // Use deep copy to prevent mutating the original state and breaking React's immutability detection
    const newMaster: MasterData = JSON.parse(JSON.stringify(masterData));
    
    if (type === 'project') {
      newMaster.projects = newMaster.projects.filter(p => p.name.toUpperCase().trim() !== value.toUpperCase().trim());
    } else if (type === 'panel') {
      const proj = newMaster.projects.find(p => p.name.toUpperCase().trim() === settingsSelectedProject.toUpperCase().trim());
      if (proj) proj.panels = proj.panels.filter(p => p.name.toUpperCase().trim() !== value.toUpperCase().trim());
    } else if (type === 'code') {
      const proj = newMaster.projects.find(p => p.name.toUpperCase().trim() === settingsSelectedProject.toUpperCase().trim());
      const pnl = proj?.panels.find(p => p.name.toUpperCase().trim() === settingsSelectedPanelName.toUpperCase().trim());
      if (pnl) pnl.codes = pnl.codes.filter(c => c.toUpperCase().trim() !== value.toUpperCase().trim());
    } else if (type === 'team') {
      newMaster.teams = newMaster.teams.filter(t => t.toUpperCase().trim() !== value.toUpperCase().trim());
    }

    const success = await updateMasterData(appsScriptUrl, newMaster);
    if (success) {
      setMasterData(newMaster);
    }
    setIsSyncing(false);
  };
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    })
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        setIsFullScreen(false);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleEsc);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Reset zoom and pan when full screen toggles to prevent layout distortion
    if (isFullScreen) {
      setZoomPercent(0);
      setPanOffset({ x: 0, y: 0 });
    }

    if (!isFullScreen || userRole !== 'view') return;

    const views = [
      { view: "monitoring", warehouse: "Warehouse 2" },
      { view: "executive", warehouse: "Warehouse 1" },
      { view: "monitoring", warehouse: "Warehouse 1" }
    ];

    // Find initial index
    let currentIndex = views.findIndex(v => v.view === currentView && (v.view !== "monitoring" || v.warehouse === selectedWarehouse));
    if (currentIndex === -1) currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % views.length;
      const next = views[currentIndex];
      setCurrentView(next.view);
      if (next.view === "monitoring") setSelectedWarehouse(next.warehouse as "Warehouse 1" | "Warehouse 2");
    }, 30000);

    return () => clearInterval(interval);
  }, [isFullScreen, userRole]);

  const toggleFullScreen = () => {
    if (!monitoringRef.current) return;

    if (!document.fullscreenElement) {
      monitoringRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        // Fallback to CSS fullscreen if API fails (common in iframes)
        setIsFullScreen(true);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const updateBaseZoom = () => {
      if (canvasContainerRef.current) {
        const { width, height } = canvasContainerRef.current.getBoundingClientRect();
        // Fit the 3000x1800 layout into the available container space
        // Since canvasContainerRef is the exact inner bounds, we need very little padding
        const padding = 20;
        const availableWidth = width - padding;
        const availableHeight = height - padding;
        
        const zoomW = availableWidth / layoutSize.width;
        const zoomH = availableHeight / layoutSize.height;
        
        // YouTube-like fit: fill as much as possible while maintaining aspect ratio
        const fitZoom = Math.min(zoomW, zoomH);
        
        setBaseZoom(fitZoom);
      }
    };

    // Initial calculation with multiple attempts to handle container transitions
    setTimeout(updateBaseZoom, 50);
    setTimeout(updateBaseZoom, 150);
    setTimeout(updateBaseZoom, 300);
    setTimeout(updateBaseZoom, 600);

    // Use ResizeObserver for more robust size tracking
    let resizeObserver: ResizeObserver | null = null;
    if (canvasContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateBaseZoom();
      });
      resizeObserver.observe(canvasContainerRef.current);
    }

    window.addEventListener('resize', updateBaseZoom);
    return () => {
      window.removeEventListener('resize', updateBaseZoom);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isFullScreen, layoutSize, currentView]);

  useEffect(() => {
    // Map zoomPercent (0-100) to zoom multiplier (baseZoom - 2.0)
    const newZoom = baseZoom + (zoomPercent / 100) * (2.0 - baseZoom);
    setZoom(newZoom);
    
    // Reset pan offset if zoom is 0 (Fit mode)
    if (zoomPercent === 0) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoomPercent, baseZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    // Check if we clicked on a panel or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('.panel-item') || target.closest('button')) {
      return;
    }

    if (zoomPercent > 0) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleInitData = useCallback(async (url: string) => {
    if (!url) return;
    try {
      setIsSyncing(true);
      setSyncError(null);
      const data = await fetchAppData(url);
      if (!data || (!data.masterData && !data.layout)) {
        console.warn("Received empty or invalid data from server");
        return;
      }
      
      if (data.masterData) {
        setMasterData({
          projects: (data.masterData.projects || []).map((p: any) => ({
            name: p.name.toUpperCase().trim(),
            panels: (p.panels || []).map((pn: any) => ({
              name: pn.name.toUpperCase().trim(),
              codes: (pn.codes || []).map((c: any) => c.toUpperCase().trim())
            }))
          })),
          teams: (data.masterData.teams || []).map((t: string) => t.toUpperCase().trim())
        });
      }
      
      if (data.pengerjaan) {
        setPengerjaanData(data.pengerjaan.map(pj => {
          const cleaned: any = { namapanel: pj.namapanel.toUpperCase().trim() };
          Object.keys(pj).forEach(key => {
            if (key !== 'namapanel') {
              cleaned[key] = pj[key].toUpperCase();
            }
          });
          return cleaned;
        }));
      }
      
      if (data.status) {
        setStatusChecklist(data.status.map(s => ({
          ...s,
          panelid: s.panelid,
          bagian: s.bagian ? s.bagian.toUpperCase().trim() : "",
          itemname: s.itemname ? s.itemname.toUpperCase().trim() : ""
        })));
      }
      
      if (data.delivery && data.delivery.length > 0) {
        // Collect delivered panel codes or ids to filter them out
        // The delivery sheet has: Project, Nama Panel, Kode Panel, Tanggal, Waktu, Username, Nama Lengkap
        // We can match them based on panel code since the id might just be a generated string, but panel kode is usually unique in a project.
        // Or if we need exact id, we should probably save panelId in delivery sheet. But for now, let's match by code.
        const deliveredCodes = data.delivery.map(d => {
           // Remove quotes that we added for forcing text format
           return d.kodepanel ? String(d.kodepanel).replace(/^'/, '').toUpperCase().trim() : "";
        }).filter(Boolean);
        
        // Find panel ids that match these codes so we can add them to deliveredPanels state
        // We'll do this after setting panels or directly filter them here.
        // Since we are restoring panels below, we can filter them out right there.
        // But the user's `deliveredPanels` state stores the unique `panel.id`.
        // We need to map code back to id based on `data.layout`.
        const deliveredIds = data.layout
           .filter(l => deliveredCodes.includes(String(l.code).replace(/^'/, '').toUpperCase().trim()))
           .map(l => l.panelid);
           
        setDeliveredPanels(deliveredIds);
        setDeliveredPanelCodes(deliveredCodes);
      }
      
      if (data.layout && data.layout.length > 0) {

        const restoredPanels = data.layout.map(l => ({
          id: l.panelid,
          position: { x: l.x, y: l.y },
          project: l.project.toUpperCase().trim(),
          name: l.name.toUpperCase().trim(),
          code: l.code.toUpperCase().trim(),
          warehouse: (l.warehouse as any) || "Warehouse 1",
          progress: {} as Record<string, number>
        }));
        
        const panelsWithProgress = restoredPanels.map(p => {
          const panelStatus = (data.status || []).filter(s => s.panelid === p.id || (s.kodepanel?.toUpperCase() === p.code.toUpperCase() && s.project?.toUpperCase() === p.project.toUpperCase()));
          const panelPengerjaan = (data.pengerjaan || []).find(pj => pj.namapanel.toUpperCase().trim() === p.name.toUpperCase().trim());
          
          const teamProgress: Record<string, number> = {};
          
          // Use teams from masterData if available, otherwise from pengerjaan keys
          const teams = data.masterData?.teams || [];
          
          teams.forEach((team: string) => {
            const teamKey = team.toLowerCase().trim();
            if (!panelPengerjaan) {
              teamProgress[team] = 0;
              return;
            }
            const items = (panelPengerjaan as any)[teamKey]?.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean) || [];
            if (items.length === 0) {
              teamProgress[team] = 0;
              return;
            }
            const checked = panelStatus.filter(s => 
              s.bagian && s.bagian.toUpperCase().trim() === team.toUpperCase().trim()
            ).length;
            teamProgress[team] = Math.round((checked / items.length) * 100);
          });

          return {
            ...p,
            progress: teamProgress
          };
        });
        
        setPanels(panelsWithProgress);
      }
      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Failed to initialize data:", error);
      setSyncError("Gagal sinkronisasi data. Periksa koneksi atau URL Apps Script.");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const url = appsScriptUrl;
    if (url) {
      handleInitData(url);
      
      // Auto-refresh every 30 seconds for multi-device sync
      const interval = setInterval(() => {
        handleInitData(url);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [handleInitData, appsScriptUrl]);

  const handleLogin = async () => {
    // Master Account Bypass
    if (loginData.username === "rifanma45" && loginData.password === "maul45") {
      setUser("rifanma45");
      setUserRole("master");
      setFullName("Rifan Maulana");
      localStorage.setItem("emt_user", "rifanma45");
      localStorage.setItem("emt_role", "master");
      localStorage.setItem("emt_fullName", "Rifan Maulana");
      setLoginError("");
      setCurrentView("monitoring");
      return;
    }

    if (!appsScriptUrl) {
      setLoginError("Silakan masukkan URL Apps Script di Setting terlebih dahulu");
      return;
    }
    
    setIsSyncing(true);
    try {
      const res = await loginUser(appsScriptUrl, loginData);
      if (res.status === "success" && res.user) {
        setUser(res.user);
        const role = res.role || "user";
        setUserRole(role);
        setUserTeam(res.team || null);
        setFullName(res.fullName || res.user);
        localStorage.setItem("emt_user", res.user);
        localStorage.setItem("emt_role", role);
        if (res.team) localStorage.setItem("emt_team", res.team);
        else localStorage.removeItem("emt_team");
        localStorage.setItem("emt_fullName", res.fullName || res.user);
        setLoginError("");
        setDebugInfo(null);
        if (role === 'user') {
          if (res.team === 'BUSBAR' || res.team === 'TAGGING') setCurrentView("update_busbar");
          else setCurrentView("update_wiring");
        } else {
          setCurrentView("monitoring");
        }
      } else {
        setLoginError(res.message || "Login Gagal");
        if (loginData.username === "rifanma45") {
          setDebugInfo(`URL: ${appsScriptUrl}`);
        }
      }
    } catch (error) {
       setLoginError("Terjadi kesalahan sistem saat login");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    setUserTeam(null);
    setFullName(null);
    localStorage.removeItem("emt_user");
    localStorage.removeItem("emt_role");
    localStorage.removeItem("emt_team");
    localStorage.removeItem("emt_fullName");
  };

  const handleRegister = async () => {
    if (!appsScriptUrl) return;
    
    // Validation
    if (!registerData.fullName || !registerData.team || !registerData.username || !registerData.password) {
      setLoginError("Semua field wajib diisi");
      return;
    }
    
    if (registerData.username.length < 8 || !/[a-zA-Z]/.test(registerData.username) || !/\d/.test(registerData.username)) {
      setLoginError("Username minimal 8 karakter dan wajib ada kombinasi angka");
      return;
    }
    
    if (registerData.password.length < 8 || !/[a-zA-Z]/.test(registerData.password) || !/\d/.test(registerData.password)) {
      setLoginError("Password minimal 8 karakter kombinasi angka dan huruf");
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setLoginError("Konfirmasi password tidak cocok");
      return;
    }

    setIsSyncing(true);
    const res = await registerUser(appsScriptUrl, registerData);
    setIsSyncing(false);
    
    if (res.status === "success") {
      setIsRegistering(false);
      setLoginError("Pendaftaran berhasil! Silakan login.");
      setRegisterData({ fullName: "", team: "", username: "", password: "", confirmPassword: "" });
    } else {
      setLoginError(res.message || "Pendaftaran gagal");
    }
  };

  const handleChecklistSubmit = async () => {
    if (!user || !appsScriptUrl || !selectedBagianKerja || pendingChecklist.length === 0) return;
    
    setIsSyncing(true);
    let allSuccess = true;

    if (currentView === "update_busbar") {
      if (selectedPanelCodes.length === 0) {
        setIsSyncing(false);
        return;
      }
      for (const code of selectedPanelCodes) {
        const layoutPanel = activeLayoutPanels.find(p => p.project.toUpperCase() === selectedProject.toUpperCase() && p.name.toUpperCase() === selectedPanelName.toUpperCase() && p.code.toUpperCase() === code.toUpperCase());
        
        const successStatus = await submitChecklist(appsScriptUrl, {
          panelId: layoutPanel ? layoutPanel.id : "",
          project: selectedProject,
          panelName: selectedPanelName,
          panelCode: code,
          bagian: selectedBagianKerja,
          items: pendingChecklist,
          user
        });
        
        const successHistory = await submitUpdateHistory(appsScriptUrl, {
          username: user,
          project: selectedProject,
          panelName: selectedPanelName,
          panelCode: code,
          team: selectedBagianKerja,
          bagian: selectedBagianKerja,
          items: pendingChecklist
        });
        
        if (!successStatus || !successHistory) allSuccess = false;
      }
    } else {
      if (!matchedPanelOnLayout) {
        setIsSyncing(false);
        return;
      }
      const successStatus = await submitChecklist(appsScriptUrl, {
        panelId: matchedPanelOnLayout.id,
        project: selectedProject,
        panelName: selectedPanelName,
        panelCode: selectedPanelId,
        bagian: selectedBagianKerja,
        items: pendingChecklist,
        user
      });

      const successHistory = await submitUpdateHistory(appsScriptUrl, {
        username: user,
        project: selectedProject,
        panelName: selectedPanelName,
        panelCode: selectedPanelId,
        team: selectedBagianKerja,
        bagian: selectedBagianKerja,
        items: pendingChecklist
      });
      if (!successStatus || !successHistory) allSuccess = false;
    }

    if (allSuccess) {
      setPendingChecklist([]);
      setSelectedPanelCodes([]);
      handleInitData(appsScriptUrl);
    }
    setIsSyncing(false);
  };

  const handleSaveLayout = async () => {
    if (!appsScriptUrl) return;
    setIsSyncing(true);
    await saveLayout(appsScriptUrl, panels);
    setIsSyncing(false);
  };

  const saveToHistory = (state: PanelData[]) => {
    setHistory(prev => [...prev, { panels: state, timestamp: Date.now() }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setRedoStack(prev => [...prev, { panels, timestamp: Date.now() }]);
    setPanels(last.panels);
    setHistory(prev => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, { panels, timestamp: Date.now() }]);
    setPanels(next.panels);
    setRedoStack(prev => prev.slice(0, -1));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragMove = (event: any) => {
    //
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);
    if (!delta.x && !delta.y) return;
    if (!delta.x && !delta.y) return;

    const activePanel = panels.find(p => p.id === active.id);
    if (!activePanel) return;

    let newX = activePanel.position.x + delta.x / zoom;
    let newY = activePanel.position.y + delta.y / zoom;

    // Clamp to layout boundaries
    newX = Math.max(0, Math.min(newX, layoutSize.width - PANEL_WIDTH));
    newY = Math.max(0, Math.min(newY, layoutSize.height - PANEL_HEIGHT));

    // Collision detection
    // Only check collision with panels in the same warehouse that have not been delivered
    const hasCollision = panels.some(p => 
      p.id !== active.id && 
      p.warehouse === selectedWarehouse && 
      !deliveredPanels.includes(p.id) &&
      checkCollision({ x: newX, y: newY }, p.position)
    );

    // Office restriction for Warehouse 1
    const inOffice = selectedWarehouse === "Warehouse 1" && isInsideOffice({ x: newX, y: newY });

    if (hasCollision || inOffice) return;

    saveToHistory(panels);
    const newPanels = panels.map(p => {
      if (p.id === active.id) {
        return {
          ...p,
          position: { x: newX, y: newY }
        };
      }
      return p;
    });
    setPanels(newPanels);

    // Sync only if not locked
    if (!isLocked && appsScriptUrl) {
      saveLayout(appsScriptUrl, newPanels).catch(console.error);
    }
  };

  const handleAddPanel = async () => {
    if (!newPanelForm.project || !newPanelForm.name || !newPanelForm.code) return;
    
    // Find empty spot
    let startX = 100;
    let startY = 100;
    let foundSpot = false;
    
    while (!foundSpot) {
      const collision = panels.some(p => 
        p.warehouse === selectedWarehouse && 
        checkCollision({ x: startX, y: startY }, p.position)
      );
      
      const inOffice = selectedWarehouse === "Warehouse 1" && isInsideOffice({ x: startX, y: startY });
      
      if (collision || inOffice) {
        startX += PANEL_WIDTH + PANEL_PADDING;
        if (startX > layoutSize.width - PANEL_WIDTH) {
          startX = 100;
          startY += PANEL_HEIGHT + PANEL_PADDING;
        }
      } else {
        foundSpot = true;
      }
      
      // Safety break
      if (startY > layoutSize.height) break;
    }

    saveToHistory(panels);
    const initialProgress: Record<string, number> = {};
    masterData.teams.forEach(team => {
      initialProgress[team] = 0;
    });

    const newPanel: PanelData = {
      id: crypto.randomUUID(),
      code: newPanelForm.code,
      name: newPanelForm.name,
      project: newPanelForm.project,
      warehouse: selectedWarehouse,
      progress: initialProgress,
      position: { x: startX, y: startY },
    };
    
    const updatedPanels = [...panels, newPanel];
    setPanels(updatedPanels);
    setIsAddingPanel(false);
    setNewPanelForm({ project: "", name: "", code: "" });

    // Auto-save to spreadsheet immediately
    try {
      await saveLayout(appsScriptUrl, updatedPanels);
      // Refresh data to ensure everything is synced
      handleInitData(appsScriptUrl);
    } catch (error) {
      console.error("Failed to auto-save panel:", error);
    }
  };

  const confirmDeletePanel = (id: string) => {
    setPanelToDelete(id);
  };

  const executeDeletePanel = async () => {
    if (!panelToDelete) return;
    
    setIsDeletingPanel(true);
    const id = panelToDelete;
    const activePanel = panels.find(p => p.id === id);
    if (!activePanel) {
      setPanelToDelete(null);
      setIsDeletingPanel(false);
      return;
    }

    if (appsScriptUrl) {
      try {
        await deletePanelFromSheet(appsScriptUrl, {
          panelId: id,
          panelCode: activePanel.code
        });
        
        saveToHistory(panels);
        const newPanels = panels.filter(p => p.id !== id);
        
        // We also want to save the new layout coordinates, just to ensure consistency
        await saveLayout(appsScriptUrl, newPanels);

        setPanels(newPanels);
        setStatusChecklist(prev => prev.filter(s => s.panelid !== id && (s as any).kodepanel !== activePanel.code));
        
        // Let's refetch data silently to ensure local state is synced properly
        await handleInitData(appsScriptUrl);
      } catch (error) {
        console.error("Failed to delete panel from server:", error);
      }
    } else {
        saveToHistory(panels);
        const newPanels = panels.filter(p => p.id !== id);
        setPanels(newPanels);
        setStatusChecklist(prev => prev.filter(s => s.panelid !== id && (s as any).kodepanel !== activePanel.code));
    }

    setPanelToDelete(null);
    setIsDeletingPanel(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border border-slate-100 p-12 space-y-10"
        >
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black italic tracking-tighter text-slate-900">
              EMT<span className="text-blue-600">WORKFLOW</span>
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Silakan Login untuk Melanjutkan</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Username</Label>
              <Input 
                value={loginData.username}
                onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                className="rounded-2xl h-12 md:h-14 border-slate-100 bg-slate-50/50 px-4 md:px-6 font-bold"
                placeholder="USERNAME"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Password</Label>
              <div className="relative">
                <Input 
                  type={showLoginPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  className="rounded-2xl h-12 md:h-14 border-slate-100 bg-slate-50/50 px-4 md:px-6 pr-14 font-bold"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="space-y-2">
                <p className="text-red-500 text-[10px] font-bold uppercase text-center">{loginError}</p>
                {debugInfo && (
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-500 text-[8px] font-mono break-all text-center">
                    {debugInfo}
                  </div>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleLogin}
              disabled={isSyncing}
              className="w-full h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-200 font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-700 transition-all"
            >
              {isSyncing ? "Logging in..." : "Login System"}
            </Button>

            <div className="text-center pt-4">
              <button 
                onClick={() => {
                  setIsRegistering(true);
                  setLoginError("");
                }}
                className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
              >
                Belum punya akun? <span className="underline">Buat Akun</span>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <p className="text-[9px] text-center text-slate-300 font-bold uppercase tracking-widest">
              © 2024 EMT PANEL SYSTEM
            </p>
          </div>
        </motion.div>

        {/* Registration Modal */}
        <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
          <DialogContent className="sm:max-w-md rounded-[40px] p-10">
            <DialogHeader className="space-y-2 text-center">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Buat Akun Baru</DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Isi data diri Anda untuk mendaftar
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-1 py-1">
              <div className="space-y-0.5">
                <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-3">Nama Lengkap</Label>
                <Input 
                  value={registerData.fullName}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="rounded-lg h-9 border-slate-100 bg-slate-50/50 px-3 font-bold text-xs"
                  placeholder="NAMA LENGKAP"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-3">Team</Label>
                <Select 
                  value={registerData.team} 
                  onValueChange={(val) => setRegisterData(prev => ({ ...prev, team: val }))}
                >
                  <SelectTrigger className="rounded-lg h-9 border-slate-100 bg-slate-50/50 px-3 font-bold uppercase text-[9px]">
                    <SelectValue placeholder="PILIH TEAM" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-slate-100 shadow-xl">
                    {masterData.teams.map(team => (
                      <SelectItem key={team} value={team} className="font-bold uppercase text-[9px] py-1">{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-3">Username (Min 8 Karakter & Kombinasi Angka)</Label>
                <Input 
                  value={registerData.username}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                  className="rounded-lg h-9 border-slate-100 bg-slate-50/50 px-3 font-bold text-xs"
                  placeholder="USERNAME"
                />
              </div>

              <div className="space-y-0.5 relative">
                <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-3">Password (Min 8 Karakter Kombinasi)</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    className="rounded-lg h-9 border-slate-100 bg-slate-50/50 px-3 pr-8 font-bold text-xs"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-6 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="space-y-0.5 relative">
                <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-3">Konfirmasi Password</Label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="rounded-lg h-9 border-slate-100 bg-slate-50/50 px-3 pr-8 font-bold text-xs"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-6 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {loginError && <p className="text-red-500 text-[9px] font-bold uppercase text-center">{loginError}</p>}
            </div>

            <DialogFooter>
              <Button 
                onClick={handleRegister}
                disabled={isSyncing}
                className="w-full h-14 rounded-xl bg-blue-600 shadow-lg shadow-blue-100 font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all"
              >
                {isSyncing ? "Mendaftarkan..." : "Daftar Sekarang"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const activePanel = panels.find(p => p.id === activeId);

  // Derived data
  const activeLayoutPanels = panels.filter(p => !deliveredPanels.includes(p.id));
  const filteredPanels = activeLayoutPanels.filter(p => p.warehouse === selectedWarehouse);

  const availableProjects = masterData.projects.map(p => p.name.toUpperCase());
  
  const updatePekerjaanAvailableProjects = Array.from(new Set(
    activeLayoutPanels.map(p => p.project.toUpperCase())
  ));

  const panelsOnLayout = activeLayoutPanels.filter(p => p.project.toUpperCase() === selectedProject.toUpperCase());
  const selectedPanelPengerjaan = pengerjaanData.find(p => p.namapanel.toUpperCase().trim() === selectedPanelName.toUpperCase().trim());
  const checklistItems = (selectedPanelPengerjaan 
    ? (selectedPanelPengerjaan as any)[selectedBagianKerja.toLowerCase().trim()]?.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean) || []
    : []) as string[];

  const filteredChecklistItems = checklistItems;

  const addPanelAvailablePanelNames = masterData.projects.find(p => p.name.toUpperCase() === newPanelForm.project.toUpperCase())?.panels.map(p => p.name.toUpperCase()) || [];
  const addPanelAvailablePanelCodes = (masterData.projects.find(p => p.name.toUpperCase() === newPanelForm.project.toUpperCase())?.panels.find(p => p.name.toUpperCase() === newPanelForm.name.toUpperCase())?.codes.map(c => c.toUpperCase()) || []).filter(code => !activeLayoutPanels.some(p => p.code.toUpperCase() === code) && !deliveredPanelCodes.includes(code.toUpperCase()));

  const updatePekerjaanAvailablePanelNames = Array.from(new Set(
    activeLayoutPanels
      .filter(p => p.project.toUpperCase() === selectedProject.toUpperCase())
      .map(p => p.name.toUpperCase())
  ));

  const updatePekerjaanAvailablePanelCodes = activeLayoutPanels
    .filter(p => 
      p.project.toUpperCase() === selectedProject.toUpperCase() && 
      p.name.toUpperCase() === selectedPanelName.toUpperCase()
    )
    .map(p => p.code.toUpperCase());
  
  const busbarAvailableProjects = masterData.projects.map(p => p.name.toUpperCase());
  const busbarAvailablePanelNames = masterData.projects.find(p => p.name.toUpperCase() === selectedProject.toUpperCase())?.panels.map(p => p.name.toUpperCase()) || [];
  const busbarAvailablePanelCodes = masterData.projects.find(p => p.name.toUpperCase() === selectedProject.toUpperCase())?.panels.find(p => p.name.toUpperCase() === selectedPanelName.toUpperCase())?.codes.map(c => c.toUpperCase()) || [];
  
  // Find the panel on layout that matches the selected criteria
  const matchedPanelOnLayout = activeLayoutPanels.find(p => 
    p.project.toUpperCase() === selectedProject.toUpperCase() && 
    p.name.toUpperCase() === selectedPanelName.toUpperCase() && 
    p.code.toUpperCase() === selectedPanelId.toUpperCase()
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header / Toolbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0 border-r border-slate-200 rounded-r-3xl overflow-hidden flex flex-col">
              <div className="bg-blue-600 p-6 text-white">
                <SheetHeader className="flex flex-row items-center justify-between space-y-0 mb-4">
                  <SheetTitle className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <Settings2 className="w-4 h-4" /> EMT MENU
                  </SheetTitle>
                  <div className="flex flex-col items-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white hover:bg-white/20 rounded-xl"
                      onClick={() => {
                        navigator.clipboard.writeText("https://work-flow-emt.vercel.app/").then(() => {
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        });
                      }}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {isCopied && <span className="text-[9px] font-bold text-blue-100 mt-1 uppercase">Tersalin!</span>}
                  </div>
                </SheetHeader>
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">
                      {user.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest leading-none mb-1">Logged in as</p>
                      <p className="text-xs font-black truncate">{user}</p>
                      <p className="text-[8px] font-bold text-white/70 uppercase tracking-wider mt-0.5">{userRole}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 px-4 py-6 flex flex-col gap-2">
                {(userRole === "master" || userRole === "admin" || (userRole === "user" && (!userTeam || userTeam === "WIRING" || userTeam === "FABRIKASI"))) && (
                  <SheetClose asChild>
                    <Button 
                      variant={currentView === "update_wiring" ? "secondary" : "ghost"} 
                      className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "update_wiring" && "bg-blue-50 text-blue-600")}
                      onClick={() => setCurrentView("update_wiring")}
                    >
                      <ClipboardList className="w-4 h-4 mr-3" /> {userRole === "master" || userRole === "admin" ? "Update Wiring & Fabrikasi" : "Update Pekerjaan"}
                    </Button>
                  </SheetClose>
                )}
                {(userRole === "master" || userRole === "admin" || (userRole === "user" && (userTeam === "BUSBAR" || userTeam === "TAGGING"))) && (
                  <SheetClose asChild>
                    <Button 
                      variant={currentView === "update_busbar" ? "secondary" : "ghost"} 
                      className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "update_busbar" && "bg-blue-50 text-blue-600")}
                      onClick={() => setCurrentView("update_busbar")}
                    >
                      <ClipboardList className="w-4 h-4 mr-3" /> {userRole === "master" || userRole === "admin" ? "Update Busbar & Tagging" : "Update Pekerjaan"}
                    </Button>
                  </SheetClose>
                )}
                {(userRole === "master" || userRole === "admin" || userRole === "view") && (
                  <SheetClose asChild>
                    <Button 
                      variant={currentView === "monitoring" ? "secondary" : "ghost"} 
                      className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "monitoring" && "bg-blue-50 text-blue-600")}
                      onClick={() => setCurrentView("monitoring")}
                    >
                      <LayoutIcon className="w-4 h-4 mr-3" /> Layout Persentase
                    </Button>
                  </SheetClose>
                )}
                {(userRole === "master" || userRole === "admin") && (
                  <SheetClose asChild>
                    <Button 
                      variant={currentView === "settings" ? "secondary" : "ghost"} 
                      className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "settings" && "bg-blue-50 text-blue-600")}
                      onClick={() => setCurrentView("settings")}
                    >
                      <Settings className="w-4 h-4 mr-3" /> Setting
                    </Button>
                  </SheetClose>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 mt-auto">
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider text-red-500 hover:text-red-600 hover:bg-red-50 mb-4"
                >
                  <X className="w-4 h-4 mr-3" /> Logout System
                </Button>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">EMT Monitoring v2.0</p>
              </div>
            </SheetContent>
          </Sheet>

          {/* Sync Status Dot */}
          <div 
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-500",
              syncError ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : 
              isSyncing ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : 
              "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            )} 
            title={syncError ? `Terputus: ${syncError}` : isSyncing ? "Sedang Menghubungkan..." : "Sudah Terhubung"}
          />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-200">EMT</div>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <h1 className="font-extrabold text-sm uppercase tracking-widest text-slate-800">
              {currentView === "monitoring" ? "Layout Persentase" : 
               currentView === "update_wiring" ? (userRole === "master" || userRole === "admin" ? "Update Wiring & Fabrikasi" : "Update Pekerjaan") : 
               currentView === "update_busbar" ? (userRole === "master" || userRole === "admin" ? "Update Busbar & Tagging" : "Update Pekerjaan") : 
               currentView === "executive" ? "Executive Dashboard" : "Setting"}
            </h1>
            {syncError ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-tighter border border-red-100">
                <Activity className="w-2.5 h-2.5" /> Sync Error
              </div>
            ) : lastSyncTime && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-400 text-[8px] font-bold uppercase tracking-tighter border border-slate-100">
                <RefreshCw className={cn("w-2.5 h-2.5", isSyncing && "animate-spin")} />
                Sync: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        {(currentView === "monitoring" || currentView === "executive") && (
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <Button 
                variant={selectedWarehouse === "Warehouse 1" && currentView === "monitoring" ? "secondary" : "ghost"}
                size="sm"
                className={cn("rounded-lg text-[10px] font-black uppercase px-4 h-8", selectedWarehouse === "Warehouse 1" && currentView === "monitoring" && "bg-white shadow-sm")}
                onClick={() => {
                  setSelectedWarehouse("Warehouse 1");
                  setCurrentView("monitoring");
                }}
              >
                Warehouse 1
              </Button>
              <Button 
                variant={selectedWarehouse === "Warehouse 2" && currentView === "monitoring" ? "secondary" : "ghost"}
                size="sm"
                className={cn("rounded-lg text-[10px] font-black uppercase px-4 h-8", selectedWarehouse === "Warehouse 2" && currentView === "monitoring" && "bg-white shadow-sm")}
                onClick={() => {
                  setSelectedWarehouse("Warehouse 2");
                  setCurrentView("monitoring");
                }}
              >
                Warehouse 2
              </Button>
              <Button 
                variant={currentView === "executive" ? "secondary" : "ghost"}
                size="sm"
                className={cn("rounded-lg text-[10px] font-black uppercase px-4 h-8", currentView === "executive" && "bg-white shadow-sm")}
                onClick={() => setCurrentView("executive")}
              >
                Executive Dashboard
              </Button>
            </div>

            {currentView === "monitoring" && (userRole === "master" || userRole === "admin") && (
              <Button onClick={() => setIsAddingPanel(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5 shadow-lg shadow-blue-200 transition-all active:scale-95">
                <Plus className="w-4 h-4 mr-2" /> Add Panel
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main 
        ref={monitoringRef}
        className={cn(
          "flex justify-center min-h-[calc(100vh-64px)] relative",
          layoutTheme === "dark" ? "bg-[#020617]" : "bg-slate-100",
          isFullScreen ? "p-0 pt-0" : "pt-20 md:pt-28 pb-10 md:pb-20 px-4 md:px-12"
        )}
      >
        <AnimatePresence mode="wait">
          {currentView === "executive" && (
            <ExecutiveView 
              key="executive"
              panels={panels}
              isToolbarCollapsed={isToolbarCollapsed}
              setIsToolbarCollapsed={setIsToolbarCollapsed}
              layoutTheme={layoutTheme}
              setLayoutTheme={setLayoutTheme}
              zoomPercent={zoomPercent}
              setZoomPercent={setZoomPercent}
              handleZoomHold={handleZoomHold}
              stopZoom={stopZoom}
              isFullScreen={isFullScreen}
              toggleFullScreen={toggleFullScreen}
              lastSyncTime={lastSyncTime}
            />
          )}
          
          {currentView === "monitoring" && (
            <motion.div 
              key="monitoring"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className={cn(
                "bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden relative transition-all duration-500",
                isFullScreen 
                  ? "w-full h-full rounded-none" 
                  : "flex-1 w-full h-[calc(100vh-120px)] rounded-[40px]"
              )}
            >
               {isFullScreen && (
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={toggleFullScreen}
                  className="absolute top-6 left-1/2 -translate-x-1/2 z-[110] w-12 h-12 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white border border-white/20 backdrop-blur-xl transition-all active:scale-90 shadow-2xl"
                >
                  <X className="w-6 h-6" />
                </Button>
              )}

              {/* Collapsible Toolbar */}
              <motion.div 
                initial={false}
                animate={{ x: isToolbarCollapsed ? 48 : 0 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center"
              >
                <Button 
                  variant="secondary" 
                  size="icon" 
                  onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                  className={cn(
                    "w-6 h-14 rounded-l-xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl hover:bg-white z-10 -mr-[1px] transition-all",
                    isToolbarCollapsed ? "opacity-100" : "opacity-80 hover:opacity-100"
                  )}
                >
                  {isToolbarCollapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </Button>
                
                <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-l-2xl p-1 shadow-2xl flex flex-col items-center gap-1 w-11 max-h-[95vh] overflow-y-auto scrollbar-hide">
                  {/* Lock Toggle */}
                  <Button 
                    variant={isLocked ? "default" : "secondary"}
                    size="icon"
                    onClick={() => setIsLocked(!isLocked)}
                    title={isLocked ? "Unlock Layout" : "Lock Layout"}
                    className={cn("w-8 h-8 rounded-lg transition-all shrink-0", isLocked ? "bg-slate-900 shadow-lg shadow-slate-200" : "bg-slate-100")}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </Button>

                  <Separator className="bg-slate-100 w-5 shrink-0" />

                  {/* Theme Toggle */}
                  <Button 
                    variant="secondary"
                    size="icon"
                    onClick={() => setLayoutTheme(layoutTheme === "dark" ? "light" : "dark")}
                    title="Toggle Theme"
                    className={cn("w-8 h-8 rounded-lg transition-all shrink-0", layoutTheme === "dark" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900")}
                  >
                    {layoutTheme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  </Button>

                  <Separator className="bg-slate-100 w-5 shrink-0" />

                  {/* History Controls - Side by Side */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button 
                      variant="secondary"
                      size="icon"
                      onClick={undo}
                      disabled={history.length === 0}
                      title="Undo"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-white transition-all disabled:opacity-30"
                    >
                      <Undo className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="secondary"
                      size="icon"
                      onClick={redo}
                      disabled={redoStack.length === 0}
                      title="Redo"
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-white transition-all disabled:opacity-30"
                    >
                      <Redo className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Separator className="bg-slate-100 w-5 shrink-0" />

                  {/* Ultra Compact Controls */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {/* Scale Controls */}
                    <div className="flex flex-col gap-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md hover:bg-slate-100 select-none"
                        onMouseDown={() => handleScaleHold(0.05)}
                        onMouseUp={stopScale}
                        onMouseLeave={stopScale}
                        onContextMenu={(e) => e.preventDefault()}
                        onTouchStart={() => handleScaleHold(0.05)}
                        onTouchEnd={stopScale}
                        title="Increase Panel Size"
                      >
                        <div className="relative flex items-center justify-center">
                          <Maximize2 className="w-3 h-3 text-blue-600" />
                          <span className="absolute -top-1 -right-1 text-[6px] font-black text-blue-600">+</span>
                        </div>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md hover:bg-slate-100 select-none"
                        onMouseDown={() => handleScaleHold(-0.05)}
                        onMouseUp={stopScale}
                        onMouseLeave={stopScale}
                        onContextMenu={(e) => e.preventDefault()}
                        onTouchStart={() => handleScaleHold(-0.05)}
                        onTouchEnd={stopScale}
                        title="Decrease Panel Size"
                      >
                        <div className="relative flex items-center justify-center">
                          <Minimize2 className="w-3 h-3 text-blue-600" />
                          <span className="absolute -top-1 -right-1 text-[6px] font-black text-blue-600">-</span>
                        </div>
                      </Button>
                    </div>

                    <Separator className="bg-slate-100 w-full h-[1px]" />

                    {/* Zoom Controls */}
                    <div className="flex flex-col items-center gap-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-8 rounded-md hover:bg-slate-100 select-none"
                        onMouseDown={() => handleZoomHold(1)}
                        onMouseUp={stopZoom}
                        onMouseLeave={stopZoom}
                        onContextMenu={(e) => e.preventDefault()}
                        onTouchStart={() => handleZoomHold(1)}
                        onTouchEnd={stopZoom}
                        title="Zoom In"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                      
                      <div className="flex flex-col items-center -space-y-0.5">
                        <span className="text-[8px] font-black text-slate-900">{zoomPercent}%</span>
                        <span className="text-[6px] font-black text-blue-600">S:{panelScale.toFixed(1)}x</span>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-8 rounded-md hover:bg-slate-100 select-none"
                        onMouseDown={() => handleZoomHold(-1)}
                        onMouseUp={stopZoom}
                        onMouseLeave={stopZoom}
                        onContextMenu={(e) => e.preventDefault()}
                        onTouchStart={() => handleZoomHold(-1)}
                        onTouchEnd={stopZoom}
                        title="Zoom Out"
                      >
                        <div className="w-2.5 h-0.5 bg-slate-600 rounded-full" />
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-8 rounded-md hover:bg-slate-100"
                        onClick={() => setZoomPercent(0)}
                        title="Reset Zoom"
                      >
                        <Search className="w-3 h-3 text-slate-400" />
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-slate-100 w-5 shrink-0" />

                  {/* Save & Fullscreen */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {(userRole === "master" || userRole === "admin") && (
                      <Button 
                        onClick={handleSaveLayout} 
                        disabled={isSyncing}
                        size="icon"
                        title="Save Layout"
                        className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-lg shadow-emerald-100 transition-all active:scale-95"
                      >
                        {isSyncing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    <Button 
                      variant="secondary"
                      size="icon"
                      onClick={toggleFullScreen}
                      title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                      className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 hover:bg-white transition-all"
                    >
                      {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </motion.div>

              <div 
                ref={canvasContainerRef}
                className={cn(
                  "w-full h-full border border-slate-100 shadow-inner overflow-hidden relative transition-colors duration-500",
                  layoutTheme === "dark" ? "bg-[#02040a]" : (selectedWarehouse === "Warehouse 1" ? "bg-slate-50" : "bg-white"),
                  isFullScreen ? "rounded-none" : "rounded-[40px]",
                  zoomPercent > 0 && "cursor-move"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div 
                  className="relative"
                  style={{ 
                    width: layoutSize.width, 
                    height: layoutSize.height,
                    left: "50%",
                    top: "50%",
                    position: "absolute",
                    marginLeft: `-${layoutSize.width / 2}px`,
                    marginTop: `-${layoutSize.height / 2}px`,
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: isPanning ? "none" : "transform 0.2s ease-out"
                  }}
                >
                  {/* Common Futuristic Elements */}
                  <>
                    {/* Outer Wall */}
                    <div className={cn(
                      "absolute inset-0 border-[16px] z-0 pointer-events-none transition-colors",
                      layoutTheme === "dark" ? "border-slate-900" : "border-slate-200"
                    )} />
                    <div className={cn(
                      "absolute inset-4 border-2 z-0 pointer-events-none transition-colors",
                      layoutTheme === "dark" ? "border-cyan-500/20" : "border-slate-300/50"
                    )} />

                    {/* Cyber Grid */}
                    <div 
                      className="absolute inset-0 pointer-events-none opacity-40 transition-opacity"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, ${layoutTheme === "dark" ? "#1e293b" : "#e2e8f0"} 1px, transparent 1px),
                          linear-gradient(to bottom, ${layoutTheme === "dark" ? "#1e293b" : "#e2e8f0"} 1px, transparent 1px)
                        `,
                        backgroundSize: '100px 100px',
                      }}
                    />

                    {/* Large Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                      <div className={cn(
                        "text-[400px] font-black tracking-tighter rotate-[-10deg] whitespace-nowrap transition-colors",
                        layoutTheme === "dark" ? "text-white/[0.03]" : "text-slate-900/[0.03]"
                      )}>
                        {selectedWarehouse === "Warehouse 1" ? "WAREHOUSE 01" : "WAREHOUSE 02"}
                      </div>
                    </div>
                    
                    {/* Scanning Line */}
                    <motion.div 
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      className={cn(
                        "absolute left-0 right-0 h-[1px] z-0 pointer-events-none transition-colors",
                        layoutTheme === "dark" 
                          ? "bg-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.4)]" 
                          : "bg-slate-400/20"
                      )}
                    />

                    {/* Corner Brackets */}
                    <div className={cn(
                      "absolute top-8 left-8 w-32 h-32 border-t-8 border-l-8 rounded-tl-3xl pointer-events-none transition-colors",
                      layoutTheme === "dark" ? "border-cyan-500/40" : "border-slate-800"
                    )} />
                    <div className={cn(
                      "absolute top-8 right-8 w-32 h-32 border-t-8 border-r-8 rounded-tr-3xl pointer-events-none transition-colors",
                      layoutTheme === "dark" ? "border-cyan-500/40" : "border-slate-800"
                    )} />
                    <div className={cn(
                      "absolute bottom-8 left-8 w-32 h-32 border-b-8 border-l-8 rounded-bl-3xl pointer-events-none transition-colors",
                      layoutTheme === "dark" ? "border-cyan-500/40" : "border-slate-800"
                    )} />
                    <div className={cn(
                      "absolute bottom-8 right-8 w-32 h-32 border-b-8 border-r-8 rounded-br-3xl pointer-events-none transition-colors",
                      layoutTheme === "dark" ? "border-cyan-500/40" : "border-slate-800"
                    )} />

                    {/* Office Area Visual */}
                    <div 
                      className={cn(
                        "absolute border-4 rounded-3xl flex flex-col items-center justify-center pointer-events-none z-10 overflow-hidden transition-all",
                        layoutTheme === "dark" 
                          ? "border-red-500/60 bg-slate-950/90 backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.2)]" 
                          : "border-slate-800 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
                      )}
                      style={{
                        left: currentOfficeArea.x,
                        top: currentOfficeArea.y,
                        width: currentOfficeArea.width,
                        height: currentOfficeArea.height,
                      }}
                    >
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, ${layoutTheme === "dark" ? "#ef4444" : "#1e293b"} 20px, ${layoutTheme === "dark" ? "#ef4444" : "#1e293b"} 22px)` }} />
                      </div>
                      <div className={cn(
                        "font-black text-xs px-4 py-1 rounded-full mb-6 transition-colors",
                        layoutTheme === "dark" 
                          ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                          : "bg-slate-900 text-white border border-slate-800"
                      )}>
                        SYSTEM OFFLINE / RESTRICTED
                      </div>
                      <div className={cn(
                        "font-black text-7xl italic tracking-tighter opacity-80 rotate-[-10deg] transition-colors",
                        layoutTheme === "dark" ? "text-red-500" : "text-slate-900"
                      )}>OFFICE</div>
                      <div className={cn(
                        "font-mono text-[10px] uppercase tracking-[0.5em] mt-8 transition-colors",
                        layoutTheme === "dark" ? "text-slate-500" : "text-slate-900"
                      )}>Command & Control Unit</div>
                    </div>

                    {/* Gates for Warehouse 1 */}
                    {selectedWarehouse === "Warehouse 1" && (
                      <>
                        <div 
                          className="absolute flex flex-col items-center justify-center pointer-events-none z-0 transition-all"
                          style={{
                            left: currentOfficeArea.x,
                            top: 20,
                            width: currentOfficeArea.width,
                            height: currentOfficeArea.y - 40,
                          }}
                        >
                          <div className={cn(
                            "font-black text-5xl italic tracking-tighter transition-all",
                            layoutTheme === "dark" 
                              ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" 
                              : "text-slate-900 drop-shadow-sm"
                          )}>GATE IN</div>
                        </div>

                        <div 
                          className="absolute flex flex-col items-center justify-center pointer-events-none z-0 transition-all"
                          style={{
                            left: currentOfficeArea.x,
                            top: currentOfficeArea.y + currentOfficeArea.height + 20,
                            width: currentOfficeArea.width,
                            height: 1800 - (currentOfficeArea.y + currentOfficeArea.height) - 40,
                          }}
                        >
                          <div className={cn(
                            "font-black text-5xl italic tracking-tighter transition-all",
                            layoutTheme === "dark" 
                              ? "text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" 
                              : "text-slate-900 drop-shadow-sm"
                          )}>GATE OUT</div>
                        </div>
                      </>
                    )}

                    {/* Gates for Warehouse 2 */}
                    {selectedWarehouse === "Warehouse 2" && (
                      <div 
                        className="absolute flex flex-col items-center justify-center pointer-events-none z-0 transition-all"
                        style={{
                          left: currentOfficeArea.x,
                          top: 20,
                          width: currentOfficeArea.width,
                          height: currentOfficeArea.y - 40,
                        }}
                      >
                        <div className={cn(
                          "font-black text-5xl italic tracking-tighter transition-all text-center",
                          layoutTheme === "dark" 
                            ? "text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" 
                            : "text-slate-900 drop-shadow-sm"
                        )}>
                          GATE<br/>IN & OUT
                        </div>
                      </div>
                    )}
                  </>

                  <DndContext 
                    sensors={sensors} 
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToWindowEdges]}
                  >
                    {filteredPanels.map((panel) => (
                      <Panel 
                        key={panel.id} 
                        panel={panel} 
                        onEdit={setIsEditing} 
                        onDelete={confirmDeletePanel} 
                        onMaximize={setMaximizedPanel}
                        onDelivery={handleDelivery}
                        disabled={isLocked || userRole === "view"}
                        zoom={zoom}
                        warehouse={selectedWarehouse}
                        theme={layoutTheme}
                        scale={panelScale}
                        isDelivering={deliveringPanels.includes(panel.id)}
                      />
                    ))}
                  </DndContext>
                </div>
              </div>

              {/* Maximized Panel Modal (Inside monitoring view for Fullscreen) */}
              <AnimatePresence>
                {maximizedPanel && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
                    onClick={() => setMaximizedPanel(null)}
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border transition-colors",
                        layoutTheme === "dark" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                      )}
                    >
                      <div className={cn(
                        "p-8 border-b flex justify-between items-center",
                        layoutTheme === "dark" ? "bg-slate-50 border-slate-100" : "bg-slate-950 border-slate-800"
                      )}>
                        <div className="space-y-1">
                          <div className={cn(
                            "px-3 py-0.5 rounded-md font-black uppercase tracking-[0.2em] text-[14px] inline-block",
                            layoutTheme === "dark" ? "bg-blue-600 text-white" : "bg-cyan-500 text-slate-950"
                          )}>
                            {maximizedPanel.code}
                          </div>
                          <h2 className={cn(
                            "text-4xl font-black italic tracking-tighter uppercase",
                            layoutTheme === "dark" ? "text-slate-900" : "text-white"
                          )}>
                            {maximizedPanel.name}
                          </h2>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-[10px] font-black uppercase tracking-widest", layoutTheme === "dark" ? "text-slate-400" : "text-slate-500")}>Overall</div>
                          <div className={cn("text-3xl font-black italic tracking-tighter", layoutTheme === "dark" ? "text-blue-600" : "text-cyan-400")}>
                            {calculateTotalProgress(maximizedPanel)}%
                          </div>
                        </div>
                      </div>

                      <div className="p-8 space-y-8">
                        <div className={cn("h-3 w-full rounded-full overflow-hidden p-0.5", layoutTheme === "dark" ? "bg-slate-100" : "bg-slate-950")}>
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${calculateTotalProgress(maximizedPanel)}%` }}
                            className={cn(
                              "h-full rounded-full",
                              calculateTotalProgress(maximizedPanel) === 100 ? "bg-emerald-500" : (layoutTheme === "dark" ? "bg-blue-600" : "bg-cyan-600")
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(maximizedPanel.progress).map(([team, value]) => {
                            let colorClass = "";
                            let textClass = "";
                            let valClass = "";

                            if (team.toUpperCase() === "FABRIKASI") {
                              colorClass = layoutTheme === "dark" ? "bg-blue-50 border-blue-100" : "bg-blue-950/30 border-blue-900/50";
                              textClass = layoutTheme === "dark" ? "text-blue-600" : "text-blue-400";
                              valClass = layoutTheme === "dark" ? "text-blue-950" : "text-white";
                            } else if (team.toUpperCase() === "WIRING") {
                              colorClass = layoutTheme === "dark" ? "bg-emerald-50 border-emerald-100" : "bg-emerald-950/30 border-emerald-900/50";
                              textClass = layoutTheme === "dark" ? "text-emerald-600" : "text-emerald-400";
                              valClass = layoutTheme === "dark" ? "text-emerald-950" : "text-white";
                            } else if (team.toUpperCase() === "BUSBAR") {
                              colorClass = layoutTheme === "dark" ? "bg-amber-50 border-amber-100" : "bg-amber-950/30 border-amber-900/50";
                              textClass = layoutTheme === "dark" ? "text-amber-600" : "text-amber-400";
                              valClass = layoutTheme === "dark" ? "text-amber-950" : "text-white";
                            } else if (team.toUpperCase() === "TAGGING") {
                              colorClass = layoutTheme === "dark" ? "bg-purple-50 border-purple-100" : "bg-purple-950/30 border-purple-900/50";
                              textClass = layoutTheme === "dark" ? "text-purple-600" : "text-purple-400";
                              valClass = layoutTheme === "dark" ? "text-purple-950" : "text-white";
                            }

                            return (
                              <div key={team} className={cn("p-6 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all", colorClass)}>
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.1em]", textClass)}>{team}</span>
                                <span className={cn("text-2xl font-black tracking-tighter", valClass)}>{value}%</span>
                              </div>
                            );
                          })}
                        </div>

                        <Button 
                          onClick={() => setMaximizedPanel(null)}
                          className={cn(
                            "w-full h-12 rounded-xl font-black uppercase tracking-widest text-[12px] shadow-lg",
                            layoutTheme === "dark" ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-white text-slate-900 hover:bg-slate-50"
                          )}
                        >
                          Close View
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {currentView === "update_wiring" && (
            <motion.div 
              key="update_wiring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-7xl flex flex-col gap-6"
            >
              <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Card: Selection */}
                <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-xl p-5 md:p-8 space-y-5 md:space-y-8 w-full xl:w-1/3 shrink-0">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Project</Label>
                      <Select value={selectedProject || undefined} onValueChange={(val) => {
                        setSelectedProject(val);
                        setSelectedPanelName("");
                        setSelectedPanelId("");
                        setPendingChecklist([]);
                      }}>
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700 focus:ring-blue-500/20">
                          <SelectValue placeholder="Pilih Project..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {updatePekerjaanAvailableProjects.map(proj => (
                            <SelectItem key={proj} value={proj}>{proj}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">2. Panel Name</Label>
                      <Select 
                        key={`panel-${selectedProject}`}
                        value={selectedPanelName || undefined} 
                        onValueChange={(val) => {
                          setSelectedPanelName(val);
                          setSelectedPanelId("");
                          setPendingChecklist([]);
                        }}
                        disabled={!selectedProject}
                      >
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700 disabled:opacity-50">
                          <SelectValue placeholder={selectedProject ? "Pilih Nama Panel..." : "Pilih Project Dahulu"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {updatePekerjaanAvailablePanelNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">3. Panel Code</Label>
                      <Select 
                        key={`code-${selectedPanelName}`}
                        value={selectedPanelId || undefined} 
                        onValueChange={(val) => {
                          setSelectedPanelId(val);
                          setPendingChecklist([]);
                        }}
                        disabled={!selectedPanelName}
                      >
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700 disabled:opacity-50">
                          <SelectValue placeholder={selectedPanelName ? "Pilih Kode Panel..." : "Pilih Nama Panel Dahulu"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {updatePekerjaanAvailablePanelCodes.map(code => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">4. Pilih Team</Label>
                      <Select value={selectedBagianKerja || undefined} onValueChange={(val) => {
                        setSelectedBagianKerja(val);
                        setPendingChecklist([]);
                      }}>
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700">
                          <SelectValue placeholder="PILIH TEAM..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {masterData.teams.filter(t => t.toUpperCase() === "WIRING" || t.toUpperCase() === "FABRIKASI").map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Right Card: Checklist */}
                <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-xl min-h-[400px] lg:min-h-[600px] flex flex-col overflow-hidden flex-1 w-full">
                  <div className="p-5 md:p-8 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Daftar Pengerjaan</span>
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Item Checklist</span>
                      </div>
                    </div>
                    {matchedPanelOnLayout && selectedBagianKerja && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                          {filteredChecklistItems.length} ITEM
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-5 md:p-8">
                    {!matchedPanelOnLayout || !selectedBagianKerja ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                          <ClipboardList className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Belum Ada Item Pengerjaan</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredChecklistItems.map((item) => {
                          const isAlreadyChecked = statusChecklist.some(s => 
                            s.panelid === matchedPanelOnLayout.id && 
                            s.bagian.toUpperCase().trim() === selectedBagianKerja.toUpperCase().trim() && 
                            s.itemname.toUpperCase().trim() === item.toUpperCase().trim()
                          );
                          const isPending = pendingChecklist.includes(item);
                          
                          return (
                            <div 
                              key={item}
                              onClick={() => {
                                if (isAlreadyChecked) return;
                                setPendingChecklist(prev => 
                                  prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                                );
                              }}
                              className={cn(
                                "p-4 md:p-5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
                                isAlreadyChecked ? "bg-emerald-50 border-emerald-100 opacity-60" : 
                                isPending ? "bg-blue-50 border-blue-200 shadow-md" : "bg-white border-slate-100 hover:border-blue-200"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                  isAlreadyChecked ? "bg-emerald-500 text-white" :
                                  isPending ? "bg-blue-600 text-white" : "bg-slate-100 text-transparent"
                                )}>
                                  <Check className="w-4 h-4" />
                                </div>
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isAlreadyChecked ? "text-emerald-700" : "text-slate-700")}>
                                  {item}
                                </span>
                              </div>
                              {isAlreadyChecked && (
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-1 rounded-md">Selesai</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Button */}
              <Button 
                onClick={handleChecklistSubmit}
                disabled={pendingChecklist.length === 0 || isSyncing}
                className={cn(
                  "w-full h-14 md:h-20 rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] md:text-xs tracking-widest md:tracking-[0.3em] transition-all shadow-xl",
                  pendingChecklist.length > 0 ? "bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSyncing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    MENGIRIM DATA...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4" />
                    SUBMIT UPDATE PEKERJAAN
                  </div>
                )}
              </Button>
            </motion.div>
          )}

          {currentView === "update_busbar" && (
            <motion.div 
              key="update_busbar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-7xl flex flex-col gap-6"
            >
              <div className="flex flex-col xl:flex-row gap-6 items-start">
                <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-xl p-5 md:p-8 space-y-5 md:space-y-8 w-full xl:w-1/3 shrink-0">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Pilih Team</Label>
                      <Select value={selectedBagianKerja || undefined} onValueChange={(val) => {
                        setSelectedBagianKerja(val);
                        setPendingChecklist([]);
                      }}>
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700">
                          <SelectValue placeholder="PILIH TEAM..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {masterData.teams.filter(t => t.toUpperCase() === "BUSBAR" || t.toUpperCase() === "TAGGING").map(b => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">2. Project</Label>
                      <Select value={selectedProject || undefined} onValueChange={(val) => {
                        setSelectedProject(val);
                        setSelectedPanelName("");
                        setSelectedPanelCodes([]);
                        setPendingChecklist([]);
                      }}>
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700 focus:ring-blue-500/20">
                          <SelectValue placeholder="Pilih Project..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {busbarAvailableProjects.map(proj => (
                            <SelectItem key={proj} value={proj}>{proj}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">3. Panel Name</Label>
                      <Select 
                        key={`panel-${selectedProject}`}
                        value={selectedPanelName || undefined} 
                        onValueChange={(val) => {
                          setSelectedPanelName(val);
                          setSelectedPanelCodes([]);
                          setPendingChecklist([]);
                        }}
                        disabled={!selectedProject}
                      >
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-12 md:h-14 px-4 md:px-6 text-[10px] md:text-xs font-bold text-slate-700 disabled:opacity-50">
                          <SelectValue placeholder={selectedProject ? "Pilih Nama Panel..." : "Pilih Project Dahulu"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {busbarAvailablePanelNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex justify-between">
                        <span>4. Pilih Kode Panel (Bisa Lebih Dari Satu)</span>
                        <span className="text-blue-500">{selectedPanelCodes.length} dipilih</span>
                      </Label>
                      <ScrollArea className="h-[200px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        {!selectedPanelName ? (
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-16">
                            Pilih Nama Panel Dahulu
                          </div>
                        ) : busbarAvailablePanelCodes.length === 0 ? (
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mt-16">
                            Tidak Ada Kode Panel
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div 
                              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white cursor-pointer hover:border-blue-200 transition-all"
                              onClick={() => {
                                if (selectedPanelCodes.length === busbarAvailablePanelCodes.length) {
                                  setSelectedPanelCodes([]);
                                } else {
                                  setSelectedPanelCodes([...busbarAvailablePanelCodes]);
                                }
                              }}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                                selectedPanelCodes.length === busbarAvailablePanelCodes.length ? "bg-blue-600 text-white" : "bg-slate-100 border border-slate-200"
                              )}>
                                {selectedPanelCodes.length === busbarAvailablePanelCodes.length && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                Pilih Semua
                              </span>
                            </div>
                            {busbarAvailablePanelCodes.map(code => {
                              const isSelected = selectedPanelCodes.includes(code);
                              return (
                                <div 
                                  key={code}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                    isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100 hover:border-blue-200"
                                  )}
                                  onClick={() => {
                                    setSelectedPanelCodes(prev => 
                                      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
                                    );
                                  }}
                                >
                                  <div className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                                    isSelected ? "bg-blue-600 text-white" : "bg-slate-100 border border-slate-200"
                                  )}>
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                                    {code}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-xl min-h-[400px] lg:min-h-[600px] flex flex-col overflow-hidden flex-1 w-full">
                  <div className="p-5 md:p-8 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Daftar Pengerjaan</span>
                        <span className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">Item Checklist</span>
                      </div>
                    </div>
                    {selectedBagianKerja && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                          {filteredChecklistItems.length} ITEM
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-5 md:p-8">
                    {!selectedBagianKerja ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-30">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                          <ClipboardList className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pilih Team Dahulu</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredChecklistItems.map((item) => {
                          const isPending = pendingChecklist.includes(item);
                          
                          return (
                            <div 
                              key={item}
                              onClick={() => {
                                setPendingChecklist(prev => 
                                  prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                                );
                              }}
                              className={cn(
                                "p-4 md:p-5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
                                isPending ? "bg-blue-50 border-blue-200 shadow-md" : "bg-white border-slate-100 hover:border-blue-200"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                                  isPending ? "bg-blue-600 text-white" : "bg-slate-100 text-transparent"
                                )}>
                                  <Check className="w-4 h-4" />
                                </div>
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", "text-slate-700")}>
                                  {item}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleChecklistSubmit}
                disabled={pendingChecklist.length === 0 || isSyncing || selectedPanelCodes.length === 0}
                className={cn(
                  "w-full h-14 md:h-20 rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] md:text-xs tracking-widest md:tracking-[0.3em] transition-all shadow-xl",
                  (pendingChecklist.length > 0 && selectedPanelCodes.length > 0) ? "bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {isSyncing ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    MENGIRIM DATA...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4" />
                    SUBMIT UPDATE PEKERJAAN
                  </div>
                )}
              </Button>
            </motion.div>
          )}

          {currentView === "settings" && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-7xl"
            >
              {/* Delete Confirmation Dialog */}
              <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Konfirmasi Hapus</DialogTitle>
                    <DialogDescription>
                      Apakah Anda yakin ingin menghapus {deleteConfirm?.type === 'project' ? 'Project' : deleteConfirm?.type === 'panel' ? 'Panel' : deleteConfirm?.type === 'code' ? 'Kode Panel' : 'Team'}{" "}
                      <span className="font-bold text-slate-900">{deleteConfirm?.value}</span>? Tindakan ini tidak dapat dibatalkan.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-6 gap-3 sm:gap-0">
                    <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={isSyncing}>Batal</Button>
                    <Button 
                      onClick={executeDeleteMaster} 
                      className="bg-red-600 hover:bg-red-700 text-white" 
                      disabled={isSyncing}
                    >
                      {isSyncing ? "Menghapus..." : "Ya, Hapus"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="grid grid-cols-4 gap-6 h-[700px]">
                {/* 1. PROJECT AKTIF */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl flex flex-col overflow-hidden">
                  <div className="bg-slate-900 p-6 flex items-center justify-between">
                    <h3 className="text-white font-black uppercase tracking-tighter text-sm">1. Project Aktif</h3>
                    <span className="text-blue-400 text-[10px] font-black">{availableProjects.length} Items</span>
                  </div>
                  <div className="p-4 border-b border-slate-50">
                    <div className="relative">
                      <Input 
                        placeholder="Tambah Project..." 
                        value={settingsNewItem.project}
                        onChange={(e) => setSettingsNewItem(prev => ({ ...prev, project: e.target.value }))}
                        className="rounded-xl bg-slate-50 border-none h-12 pr-12 font-bold text-xs"
                      />
                      <Button 
                        onClick={() => handleAddMaster('project')}
                        disabled={!settingsNewItem.project || isSyncing}
                        size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-blue-600 shadow-lg shadow-blue-200"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {availableProjects.map(proj => (
                        <div 
                          key={proj}
                          onClick={() => {
                            setSettingsSelectedProject(proj);
                            setSettingsSelectedPanelName("");
                          }}
                          className={cn(
                            "group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            settingsSelectedProject === proj ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" : "bg-white border-slate-100 hover:border-blue-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className={cn("font-black uppercase text-[10px] tracking-tight", settingsSelectedProject === proj ? "text-white" : "text-slate-700")}>{proj}</span>
                            <span className={cn("px-2 py-0.5 rounded-md text-[8px] font-black", settingsSelectedProject === proj ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400")}>
                              {masterData.projects.find(p => p.name === proj)?.panels.length || 0} PNL
                            </span>
                          </div>
                          <Trash2 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMaster('project', proj);
                            }}
                            className={cn("w-3.5 h-3.5 transition-opacity", settingsSelectedProject === proj ? "text-blue-300 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100")} 
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* 2. NAMA PANEL */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl flex flex-col overflow-hidden">
                  <div className="bg-slate-900 p-6 flex items-center justify-between">
                    <h3 className="text-white font-black uppercase tracking-tighter text-sm">2. Nama Panel</h3>
                    <span className="text-blue-400 text-[10px] font-black">
                      {settingsSelectedProject ? (masterData.projects.find(p => p.name === settingsSelectedProject)?.panels.length || 0) : 0} Items
                    </span>
                  </div>
                  <div className="p-4 border-b border-slate-50">
                    <div className="relative">
                      <Input 
                        placeholder="Tambah Panel..." 
                        disabled={!settingsSelectedProject}
                        value={settingsNewItem.panel}
                        onChange={(e) => setSettingsNewItem(prev => ({ ...prev, panel: e.target.value }))}
                        className="rounded-xl bg-slate-50 border-none h-12 pr-12 font-bold text-xs disabled:opacity-50"
                      />
                      <Button 
                        onClick={() => handleAddMaster('panel')}
                        disabled={!settingsSelectedProject || !settingsNewItem.panel || isSyncing}
                        size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-blue-600 shadow-lg shadow-blue-200 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {settingsSelectedProject && (masterData.projects.find(p => p.name === settingsSelectedProject)?.panels || []).map(pnl => (
                        <div 
                          key={pnl.name}
                          onClick={() => setSettingsSelectedPanelName(pnl.name)}
                          className={cn(
                            "group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                            settingsSelectedPanelName === pnl.name ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" : "bg-white border-slate-100 hover:border-blue-200"
                          )}
                        >
                          <span className={cn("font-black uppercase text-[10px] tracking-tight", settingsSelectedPanelName === pnl.name ? "text-white" : "text-slate-700")}>{pnl.name}</span>
                          <Trash2 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMaster('panel', pnl.name);
                            }}
                            className={cn("w-3.5 h-3.5 transition-opacity", settingsSelectedPanelName === pnl.name ? "text-blue-300 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100")} 
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* 3. KODE PANEL */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl flex flex-col overflow-hidden">
                  <div className="bg-slate-900 p-6 flex items-center justify-between">
                    <h3 className="text-white font-black uppercase tracking-tighter text-sm">3. Kode Panel</h3>
                    <span className="text-blue-400 text-[10px] font-black">
                      {settingsSelectedPanelName ? (masterData.projects.find(p => p.name === settingsSelectedProject)?.panels.find(p => p.name === settingsSelectedPanelName)?.codes.length || 0) : 0} Items
                    </span>
                  </div>
                  <div className="p-4 border-b border-slate-50">
                    <div className="relative">
                      <Input 
                        placeholder="Tambah Kode..." 
                        disabled={!settingsSelectedPanelName}
                        value={settingsNewItem.code}
                        onChange={(e) => setSettingsNewItem(prev => ({ ...prev, code: e.target.value }))}
                        className="rounded-xl bg-slate-50 border-none h-12 pr-12 font-bold text-xs disabled:opacity-50"
                      />
                      <Button 
                        onClick={() => handleAddMaster('code')}
                        disabled={!settingsSelectedPanelName || !settingsNewItem.code || isSyncing}
                        size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-blue-600 shadow-lg shadow-blue-200 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {settingsSelectedPanelName && (masterData.projects.find(p => p.name === settingsSelectedProject)?.panels.find(p => p.name === settingsSelectedPanelName)?.codes || []).map(code => (
                        <div 
                          key={code}
                          className="group p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all flex items-center justify-between"
                        >
                          <span className="font-black uppercase text-[10px] tracking-tight text-slate-700">{code}</span>
                          <Trash2 
                            onClick={() => handleDeleteMaster('code', code)}
                            className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-red-500" 
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* 4. DAFTAR TEAM */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl flex flex-col overflow-hidden">
                  <div className="bg-slate-900 p-6 flex items-center justify-between">
                    <h3 className="text-white font-black uppercase tracking-tighter text-sm">4. Daftar Team</h3>
                    <span className="text-blue-400 text-[10px] font-black">{masterData.teams.length} Items</span>
                  </div>
                  <div className="p-4 border-b border-slate-50">
                    <div className="relative">
                      <Input 
                        placeholder="Tambah Team..." 
                        value={settingsNewItem.team}
                        onChange={(e) => setSettingsNewItem(prev => ({ ...prev, team: e.target.value }))}
                        className="rounded-xl bg-slate-50 border-none h-12 pr-12 font-bold text-xs"
                      />
                      <Button 
                        onClick={() => handleAddMaster('team')}
                        disabled={!settingsNewItem.team || isSyncing}
                        size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-blue-600 shadow-lg shadow-blue-200"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2">
                      {masterData.teams.map(team => (
                        <div 
                          key={team}
                          className="group p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all flex items-center justify-between"
                        >
                          <span className="font-black uppercase text-[10px] tracking-tight text-slate-700">{team}</span>
                          <Trash2 
                            onClick={() => handleDeleteMaster('team', team)}
                            className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-red-500" 
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* URL Settings at bottom - Master Only */}
              {userRole === "master" && (
                <div className="mt-8 bg-white rounded-3xl border border-slate-100 p-6 flex items-center justify-between gap-6">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Google Apps Script URL</Label>
                    <Input 
                      value={appsScriptUrl}
                      onChange={(e) => setAppsScriptUrl(e.target.value)}
                      className="rounded-xl h-12 border-slate-100 bg-slate-50/50 px-4 font-bold text-xs"
                      placeholder="https://script.google.com/macros/s/.../exec"
                    />
                  </div>
                  <Button 
                    onClick={() => {
                      localStorage.setItem("emt_apps_script_url", appsScriptUrl);
                      handleInitData(appsScriptUrl);
                    }}
                    className="h-12 rounded-xl bg-slate-900 text-white px-8 font-black uppercase text-[10px] tracking-widest mt-5"
                  >
                    Save URL
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Panel Dialog */}
      <Dialog open={!!panelToDelete} onOpenChange={(open) => {
        if (!open && !isDeletingPanel) setPanelToDelete(null);
      }}>
        <DialogContent className="sm:max-w-md rounded-[32px] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic tracking-tighter text-slate-900">Konfirmasi Hapus Panel</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium mt-2">
              Apakah Anda yakin ingin menghapus panel <span className="font-bold text-slate-900">{panels.find(p => p.id === panelToDelete)?.code}</span> dari layout? 
              Ini akan menghapus posisi di layout beserta histori pekerjaannya.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-8 flex items-center justify-end gap-3 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setPanelToDelete(null)}
              disabled={isDeletingPanel}
              className="rounded-xl w-full sm:w-auto font-bold"
            >
              Batal
            </Button>
            <Button 
              onClick={executeDeletePanel}
              disabled={isDeletingPanel}
              className="rounded-xl w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              {isDeletingPanel ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin text-white inline-block" />
                  Menghapus...
                </>
              ) : "Ya, Hapus Panel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Panel Dialog */}
      <Dialog open={isAddingPanel} onOpenChange={setIsAddingPanel}>
        <DialogContent className="sm:max-w-[500px] rounded-[40px] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-blue-600 p-10 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                <Plus className="w-8 h-8" /> Add New Panel
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-10 space-y-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Project</Label>
                <Select 
                  value={newPanelForm.project || undefined} 
                  onValueChange={(val) => setNewPanelForm(prev => ({ ...prev, project: val, name: "", code: "" }))}
                >
                  <SelectTrigger className="rounded-2xl h-12 md:h-14 border-slate-100 bg-slate-50/50 px-4 md:px-6 font-bold">
                    <SelectValue placeholder="PILIH PROJECT" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    {availableProjects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nama Panel</Label>
                <Select 
                  key={`addName-${newPanelForm.project}`}
                  value={newPanelForm.name || undefined} 
                  onValueChange={(val) => setNewPanelForm(prev => ({ ...prev, name: val, code: "" }))}
                  disabled={!newPanelForm.project}
                >
                  <SelectTrigger className="rounded-2xl h-14 border-slate-100 bg-slate-50/50 px-6 font-bold disabled:opacity-50">
                    <SelectValue placeholder={newPanelForm.project ? "PILIH NAMA PANEL" : "PILIH PROJECT DAHULU"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    {addPanelAvailablePanelNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Kode Panel</Label>
                <Select 
                  key={`addCode-${newPanelForm.name}`}
                  value={newPanelForm.code || undefined} 
                  onValueChange={(val) => setNewPanelForm(prev => ({ ...prev, code: val }))}
                  disabled={!newPanelForm.name}
                >
                  <SelectTrigger className="rounded-2xl h-14 border-slate-100 bg-slate-50/50 px-6 font-bold disabled:opacity-50">
                    <SelectValue placeholder={newPanelForm.name ? "PILIH KODE PANEL" : "PILIH NAMA PANEL DAHULU"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    {addPanelAvailablePanelCodes.map(code => <SelectItem key={code} value={code}>{code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAddingPanel(false)}
                className="flex-1 rounded-xl border-slate-200 font-bold text-slate-600 h-11"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddPanel}
                disabled={!newPanelForm.code}
                className="flex-[2] bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-lg shadow-blue-100 h-11"
              >
                Add to Layout
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
