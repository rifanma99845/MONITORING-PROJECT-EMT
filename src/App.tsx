import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, Undo, Redo, Trash2, Edit2, Settings2, Maximize2, Minimize2, Menu, Layout as LayoutIcon, ClipboardList, Settings, Search, Check, Send, Lock, Unlock, ChevronRight, ChevronLeft, X, Sun, Moon, BarChart3, Activity, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
import { fetchAppData, loginUser, registerUser, saveLayout, submitChecklist, updateMasterData, submitUpdateHistory, PengerjaanItem, StatusChecklist, type MasterData } from "./services/spreadsheetService";

// --- Components ---

interface PanelProps {
  panel: PanelData;
  onEdit: (panel: PanelData | null) => void;
  onDelete: (id: string) => void;
  isOverlay?: boolean;
  disabled?: boolean;
  zoom: number;
  warehouse?: string;
  theme?: "dark" | "light";
  scale: number;
}

const Panel: React.FC<PanelProps> = ({ panel, onEdit, onDelete, isOverlay, disabled, zoom, warehouse, theme = "dark", scale }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: panel.id,
    disabled: disabled
  });

  const style = transform ? {
    transform: `translate3d(${transform.x / zoom}px, ${transform.y / zoom}px, 0)`,
    transition: isDragging ? "none" : "transform 0.2s ease-out",
  } : undefined;

  const totalProgress = calculateTotalProgress(panel);
  const isW1 = warehouse === "Warehouse 1";
  const isDark = theme === "dark";

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
        "rounded-xl border overflow-hidden select-none group transition-all panel-item",
        isDark 
          ? "bg-slate-900/80 backdrop-blur-md border-slate-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
          : "bg-white border-slate-200 shadow-sm",
        !isDragging && "transition-all",
        isDragging && "z-[100] border-blue-600 shadow-none ring-0",
        !isDragging && !disabled && (isDark ? "cursor-grab hover:shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:border-blue-500/50" : "cursor-grab hover:shadow-xl hover:border-blue-200"),
        disabled && "cursor-default"
      )}
      {...attributes}
      {...listeners}
    >
      <div style={{ width: 200, height: 215 }}>
        {/* Header: Code & Name */}
        <div className={cn("px-4 py-3 border-b relative transition-colors", isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200")}>
        {isDark && (
          <>
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/50" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/50" />
          </>
        )}
        <div className="flex justify-between items-center mb-1">
          <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] transition-colors", isDark ? "text-cyan-400" : "text-blue-600")}>{panel.code}</span>
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse transition-all",
            totalProgress === 100 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : (isDark ? "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" : "bg-blue-600")
          )} />
        </div>
        <h3 className={cn("text-[11px] font-black truncate leading-tight uppercase tracking-tight transition-colors", isDark ? "text-white" : "text-slate-900")}>{panel.name}</h3>
        </div>
      
        {/* Progress Grid */}
        <div className={cn("p-4 space-y-3 relative transition-colors", isDark ? "bg-slate-900/50" : "bg-white")}>
          {isDark && (
            <>
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-500/50" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/50" />
            </>
          )}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
              <span className={cn("transition-colors", isDark ? "text-slate-500" : "text-slate-800")}>Progress</span>
              <span className={cn("transition-colors", isDark ? "text-cyan-400" : "text-blue-700")}>{totalProgress}%</span>
            </div>
            <div className={cn("h-2 w-full rounded-full overflow-hidden p-0.5 transition-colors", isDark ? "bg-slate-950" : "bg-slate-100")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${totalProgress}%` }}
                className={cn(
                  "h-full rounded-full transition-colors",
                  totalProgress === 100 ? "bg-emerald-500" : (isDark ? "bg-cyan-600" : "bg-blue-600")
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
                colorClass = isDark ? "bg-blue-950/30 border-blue-900/50" : "bg-blue-50/50 border-blue-100/50";
                textClass = isDark ? "text-blue-400" : "text-blue-600";
                valClass = isDark ? "text-white" : "text-blue-900";
              } else if (team.toUpperCase() === "WIRING") {
                colorClass = isDark ? "bg-emerald-950/30 border-emerald-900/50" : "bg-emerald-50/50 border-emerald-100/50";
                textClass = isDark ? "text-emerald-400" : "text-emerald-600";
                valClass = isDark ? "text-white" : "text-emerald-900";
              } else if (team.toUpperCase() === "BUSBAR") {
                colorClass = isDark ? "bg-amber-950/30 border-amber-900/50" : "bg-amber-50/50 border-amber-100/50";
                textClass = isDark ? "text-amber-400" : "text-amber-600";
                valClass = isDark ? "text-white" : "text-amber-900";
              } else if (team.toUpperCase() === "TAGGING") {
                colorClass = isDark ? "bg-purple-950/30 border-purple-900/50" : "bg-purple-50/50 border-purple-100/50";
                textClass = isDark ? "text-purple-400" : "text-purple-600";
                valClass = isDark ? "text-white" : "text-purple-900";
              }

              return (
                <div key={team} className={cn("flex flex-col items-center p-2 rounded-xl border transition-colors", colorClass)}>
                  <span className={cn("text-[7px] font-black uppercase tracking-tighter transition-colors", textClass)}>{shortName}</span>
                  <span className={cn("text-[10px] font-black transition-colors", valClass)}>{value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover Actions Overlay */}
      <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 pointer-events-none">
        <div className={cn("p-2 rounded-2xl shadow-2xl border flex gap-1.5 pointer-events-auto scale-90 group-hover:scale-100 transition-transform", isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100")}>
          <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl", isDark ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-50")} onClick={(e) => { e.stopPropagation(); onEdit(panel); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDelete(panel.id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem("emt_user"));
  const [userRole, setUserRole] = useState<string | null>(() => localStorage.getItem("emt_role"));
  const [historyUserName, setHistoryUserName] = useState(user || "");
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({ fullName: "", team: "", username: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (user) setHistoryUserName(user);
  }, [user]);
  
  const [panels, setPanels] = useState<PanelData[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<PanelData | null>(null);
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

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      stopZoom();
      stopScale();
    };
  }, [stopZoom, stopScale]);
  const [currentView, setCurrentView] = useState("monitoring"); 
  const [selectedWarehouse, setSelectedWarehouse] = useState<"Warehouse 1" | "Warehouse 2">("Warehouse 1");
  const [layoutTheme, setLayoutTheme] = useState<"dark" | "light">("dark");
  const [isLocked, setIsLocked] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const PANEL_WIDTH = 200 * panelScale;
  const PANEL_HEIGHT = 215 * panelScale;
  const PANEL_PADDING = 20 * panelScale;

  const checkCollision = (pos1: { x: number, y: number }, pos2: { x: number, y: number }) => {
    return !(
      pos1.x + PANEL_WIDTH + PANEL_PADDING < pos2.x ||
      pos1.x > pos2.x + PANEL_WIDTH + PANEL_PADDING ||
      pos1.y + PANEL_HEIGHT + PANEL_PADDING < pos2.y ||
      pos1.y > pos2.y + PANEL_HEIGHT + PANEL_PADDING
    );
  };
  
  const [isAddingPanel, setIsAddingPanel] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const monitoringRef = useRef<HTMLDivElement>(null);
  
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

  const ExecutiveView = () => {
    const w1Summary = panels.filter(p => p.warehouse === "Warehouse 1");
    const w2Summary = panels.filter(p => p.warehouse === "Warehouse 2");

    const calculateSummary = (warehousePanels: PanelData[]) => {
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
        key="executive"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full max-w-7xl min-h-[80vh] bg-[#020617] rounded-[48px] border border-slate-800 shadow-2xl overflow-hidden relative p-12 flex flex-col gap-12"
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
              "w-6 h-14 rounded-l-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl hover:bg-slate-900 z-10 -mr-[1px] transition-all",
              isToolbarCollapsed ? "opacity-100" : "opacity-80 hover:opacity-100"
            )}
          >
            {isToolbarCollapsed ? <ChevronLeft className="w-3 h-3 text-cyan-400" /> : <ChevronRight className="w-3 h-3 text-cyan-400" />}
          </Button>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-l-2xl p-1.5 shadow-2xl flex flex-col items-center gap-2 w-11">
            {/* Theme Toggle */}
            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setLayoutTheme(layoutTheme === "dark" ? "light" : "dark")}
              className={cn("w-8 h-8 rounded-lg transition-all", layoutTheme === "dark" ? "text-cyan-400 hover:bg-cyan-400/10" : "text-slate-400 hover:bg-slate-800")}
            >
              {layoutTheme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </Button>

            <div className="w-6 h-[1px] bg-slate-800" />

            {/* Zoom Controls */}
            <div className="flex flex-col gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 select-none"
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
                <span className="text-[8px] font-black text-cyan-400">{zoomPercent}%</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10 select-none"
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
                className="w-8 h-8 rounded-lg text-slate-500 hover:text-cyan-400"
              >
                <Search className="w-3 h-3" />
              </Button>
            </div>

            <div className="w-6 h-[1px] bg-slate-800" />

            {/* Fullscreen */}
            <Button 
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10"
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
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span className="text-cyan-400 font-black tracking-[0.4em] uppercase text-xs">System Status: Active</span>
            </div>
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter">
              Executive <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-magenta-500">Dashboard</span>
            </h2>
          </div>
          <div className="text-right">
            <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Last Sync: {new Date().toLocaleTimeString()}</p>
            <p className="text-slate-400 font-black text-lg uppercase tracking-tighter">EMT MONITORING v2.0</p>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-12 relative z-10">
          {[
            { label: "Warehouse 1", data: s1, color: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/20", gradId: "grad1" },
            { label: "Warehouse 2", data: s2, color: "from-magenta-500 to-purple-600", glow: "shadow-magenta-500/20", gradId: "grad2" }
          ].map((wh, idx) => (
            <div key={wh.label} className={cn("bg-slate-900/50 border border-slate-800 rounded-[40px] p-10 backdrop-blur-xl flex flex-col gap-8 shadow-2xl", wh.glow)}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{wh.label}</h3>
                <div className={cn("px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r text-white", wh.color)}>
                  Live Feed
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg width="192" height="192" className="rotate-[-90deg]">
                    <circle cx="96" cy="96" r="88" stroke="#1e293b" strokeWidth="12" fill="transparent" />
                    <motion.circle
                      cx="96" cy="96" r="88" stroke={`url(#${wh.gradId})`} strokeWidth="12" fill="transparent"
                      strokeDasharray={88 * 2 * Math.PI}
                      initial={{ strokeDashoffset: 88 * 2 * Math.PI }}
                      animate={{ strokeDashoffset: 88 * 2 * Math.PI - (wh.data.total / 100) * (88 * 2 * Math.PI) }}
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
                    <span className="text-5xl font-black text-white">{wh.data.total}%</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-4">
                  {Object.entries(wh.data.teams).map(([team, val]) => (
                    <div key={team} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{team}</span>
                        <span className="text-xs font-black text-white">{val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          className={cn("h-full rounded-full bg-gradient-to-r", wh.color)}
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
  };

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
    teams: ["FABRIKASI", "WIRING", "BUSBAR"] 
  });
  const [pengerjaanData, setPengerjaanData] = useState<PengerjaanItem[]>([]);
  const [statusChecklist, setStatusChecklist] = useState<StatusChecklist[]>([]);
  
  // Form states
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedPanelName, setSelectedPanelName] = useState("");
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [selectedBagianKerja, setSelectedBagianKerja] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingChecklist, setPendingChecklist] = useState<string[]>([]);

  // Apps Script URL Configuration
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => 
    localStorage.getItem("emt_apps_script_url") || 
    (import.meta as any).env?.VITE_APPS_SCRIPT_URL || 
    "https://script.google.com/macros/s/AKfycbx1Sh54121UlLX9lNHPX43_AxYSXIOdiU7KoQrYH4Eyi3230drokGDEyf9l57n3YDTC/exec"
  );

  // Settings UI States
  const [settingsSelectedProject, setSettingsSelectedProject] = useState("");
  const [settingsSelectedPanelName, setSettingsSelectedPanelName] = useState("");
  const [settingsNewItem, setSettingsNewItem] = useState({ project: "", panel: "", code: "", team: "" });

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

  const handleDeleteMaster = async (type: 'project' | 'panel' | 'code' | 'team', value: string) => {
    if (!appsScriptUrl || !window.confirm("Apakah Anda yakin ingin menghapus item ini?")) return;
    setIsSyncing(true);
    
    const newMaster = { ...masterData };
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
    setZoomPercent(0);
    setPanOffset({ x: 0, y: 0 });
  }, [isFullScreen]);

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
      if (monitoringRef.current) {
        const { width, height } = monitoringRef.current.getBoundingClientRect();
        // Fit the 3000x1800 layout into the available container space with minimal padding
        const padding = isFullScreen ? 20 : 60;
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
    if (monitoringRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateBaseZoom();
      });
      resizeObserver.observe(monitoringRef.current);
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
          const panelStatus = (data.status || []).filter(s => s.panelid === p.id);
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
    } catch (error) {
      console.error("Failed to initialize data:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const url = appsScriptUrl;
    if (url) handleInitData(url);
  }, [handleInitData, appsScriptUrl]);

  const handleLogin = async () => {
    // Master Account Bypass
    if (loginData.username === "rifanma45" && loginData.password === "maul45") {
      setUser("rifanma45");
      setUserRole("master");
      localStorage.setItem("emt_user", "rifanma45");
      localStorage.setItem("emt_role", "master");
      setLoginError("");
      return;
    }

    if (!appsScriptUrl) {
      setLoginError("Silakan masukkan URL Apps Script di Setting terlebih dahulu");
      return;
    }
    const res = await loginUser(appsScriptUrl, loginData);
    if (res.status === "success" && res.user) {
      setUser(res.user);
      setUserRole(res.role || "user");
      localStorage.setItem("emt_user", res.user);
      localStorage.setItem("emt_role", res.role || "user");
      setLoginError("");
    } else {
      setLoginError(res.message || "Login Gagal");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    localStorage.removeItem("emt_user");
    localStorage.removeItem("emt_role");
  };

  const handleRegister = async () => {
    if (!appsScriptUrl) return;
    
    // Validation
    if (!registerData.fullName || !registerData.team || !registerData.username || !registerData.password) {
      setLoginError("Semua field wajib diisi");
      return;
    }
    
    if (registerData.username.length < 8 || !/\d/.test(registerData.username)) {
      setLoginError("Username minimal 8 karakter dan wajib ada minimal 1 angka");
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
    if (!user || !appsScriptUrl || !matchedPanelOnLayout || !selectedBagianKerja || pendingChecklist.length === 0) return;
    
    setIsSyncing(true);
    
    // 1. Update Real-time Status (Existing System)
    const successStatus = await submitChecklist(appsScriptUrl, {
      panelId: matchedPanelOnLayout.id,
      project: selectedProject,
      panelName: selectedPanelName,
      panelCode: selectedPanelId,
      bagian: selectedBagianKerja,
      items: pendingChecklist,
      user
    });

    // 2. Submit to Update History (New Feature)
    const successHistory = await submitUpdateHistory(appsScriptUrl, {
      username: user,
      project: selectedProject,
      panelName: selectedPanelName,
      panelCode: selectedPanelId,
      team: selectedBagianKerja,
      bagian: selectedBagianKerja,
      items: pendingChecklist
    });

    if (successStatus && successHistory) {
      setPendingChecklist([]);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);
    if (delta.x === 0 && delta.y === 0) return;

    const activePanel = panels.find(p => p.id === active.id);
    if (!activePanel) return;

    let newX = activePanel.position.x + delta.x / zoom;
    let newY = activePanel.position.y + delta.y / zoom;

    // Clamp to layout boundaries
    newX = Math.max(0, Math.min(newX, layoutSize.width - PANEL_WIDTH));
    newY = Math.max(0, Math.min(newY, layoutSize.height - PANEL_HEIGHT));

    // Collision detection
    const hasCollision = panels.some(p => 
      p.id !== active.id && 
      p.warehouse === selectedWarehouse && 
      checkCollision({ x: newX, y: newY }, p.position)
    );

    // Office restriction for Warehouse 1
    const inOffice = selectedWarehouse === "Warehouse 1" && isInsideOffice({ x: newX, y: newY });

    if (hasCollision || inOffice) {
      // Revert or block move
      return;
    }

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

  const deletePanel = (id: string) => {
    saveToHistory(panels);
    setPanels(prev => prev.filter(p => p.id !== id));
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
                className="rounded-2xl h-14 border-slate-100 bg-slate-50/50 px-6 font-bold"
                placeholder="USERNAME"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Password</Label>
              <Input 
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                className="rounded-2xl h-14 border-slate-100 bg-slate-50/50 px-6 font-bold"
                placeholder="••••••••"
              />
            </div>
            {loginError && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{loginError}</p>}
            
            <Button 
              onClick={handleLogin}
              className="w-full h-16 rounded-2xl bg-blue-600 shadow-xl shadow-blue-200 font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-700 transition-all"
            >
              Login System
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
            
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Nama Lengkap</Label>
                <Input 
                  value={registerData.fullName}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="rounded-xl h-12 border-slate-100 bg-slate-50/50 px-5 font-bold"
                  placeholder="NAMA LENGKAP"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Team</Label>
                <Select 
                  value={registerData.team} 
                  onValueChange={(val) => setRegisterData(prev => ({ ...prev, team: val }))}
                >
                  <SelectTrigger className="rounded-xl h-12 border-slate-100 bg-slate-50/50 px-5 font-bold uppercase text-[10px]">
                    <SelectValue placeholder="PILIH TEAM" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    {masterData.teams.map(team => (
                      <SelectItem key={team} value={team} className="font-bold uppercase text-[10px] py-3">{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Username (Min 8 Karakter & 1 Angka)</Label>
                <Input 
                  value={registerData.username}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                  className="rounded-xl h-12 border-slate-100 bg-slate-50/50 px-5 font-bold"
                  placeholder="USERNAME"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Password (Min 8 Karakter Kombinasi)</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    className="rounded-xl h-12 border-slate-100 bg-slate-50/50 px-5 pr-12 font-bold"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-3">Konfirmasi Password</Label>
                <div className="relative">
                  <Input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="rounded-xl h-12 border-slate-100 bg-slate-50/50 px-5 pr-12 font-bold"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
  const filteredPanels = panels.filter(p => p.warehouse === selectedWarehouse);
  const availableProjects = masterData.projects.map(p => p.name.toUpperCase());
  const panelsOnLayout = panels.filter(p => p.project.toUpperCase() === selectedProject.toUpperCase());
  const selectedPanelPengerjaan = pengerjaanData.find(p => p.namapanel.toUpperCase().trim() === selectedPanelName.toUpperCase().trim());
  const checklistItems = (selectedPanelPengerjaan 
    ? (selectedPanelPengerjaan as any)[selectedBagianKerja.toLowerCase().trim()]?.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean) || []
    : []) as string[];

  const filteredChecklistItems = checklistItems.filter(item => 
    item.toUpperCase().includes(searchQuery.toUpperCase())
  );

  const addPanelAvailablePanelNames = masterData.projects.find(p => p.name.toUpperCase() === newPanelForm.project.toUpperCase())?.panels.map(p => p.name.toUpperCase()) || [];
  const addPanelAvailablePanelCodes = (masterData.projects.find(p => p.name.toUpperCase() === newPanelForm.project.toUpperCase())?.panels.find(p => p.name.toUpperCase() === newPanelForm.name.toUpperCase())?.codes.map(c => c.toUpperCase()) || []).filter(code => !panels.some(p => p.code.toUpperCase() === code));

  const updatePekerjaanAvailablePanelNames = Array.from(new Set(
    panels
      .filter(p => p.project.toUpperCase() === selectedProject.toUpperCase())
      .map(p => p.name.toUpperCase())
  ));

  const updatePekerjaanAvailablePanelCodes = panels
    .filter(p => 
      p.project.toUpperCase() === selectedProject.toUpperCase() && 
      p.name.toUpperCase() === selectedPanelName.toUpperCase()
    )
    .map(p => p.code.toUpperCase());
  
  // Find the panel on layout that matches the selected criteria
  const matchedPanelOnLayout = panels.find(p => 
    p.project.toUpperCase() === selectedProject.toUpperCase() && 
    p.name.toUpperCase() === selectedPanelName.toUpperCase() && 
    p.code.toUpperCase() === selectedPanelId.toUpperCase()
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header / Toolbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-6">
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
                </SheetHeader>
                {user && (
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">
                      {user.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest leading-none mb-1">Logged in as</p>
                      <p className="text-xs font-black truncate">{user}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 px-4 py-6 space-y-1">
                {(userRole === "master" || userRole === "admin" || userRole === "user") && (
                  <Button 
                    variant={currentView === "update" ? "secondary" : "ghost"} 
                    className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "update" && "bg-blue-50 text-blue-600")}
                    onClick={() => setCurrentView("update")}
                  >
                    <ClipboardList className="w-4 h-4 mr-3" /> Update Pekerjaan
                  </Button>
                )}
                {(userRole === "master" || userRole === "admin" || userRole === "view") && (
                  <Button 
                    variant={currentView === "monitoring" ? "secondary" : "ghost"} 
                    className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "monitoring" && "bg-blue-50 text-blue-600")}
                    onClick={() => setCurrentView("monitoring")}
                  >
                    <LayoutIcon className="w-4 h-4 mr-3" /> Layout Persentase
                  </Button>
                )}
                {(userRole === "master" || userRole === "admin") && (
                  <Button 
                    variant={currentView === "settings" ? "secondary" : "ghost"} 
                    className={cn("w-full justify-start rounded-xl h-11 font-bold uppercase text-[10px] tracking-wider", currentView === "settings" && "bg-blue-50 text-blue-600")}
                    onClick={() => setCurrentView("settings")}
                  >
                    <Settings className="w-4 h-4 mr-3" /> Setting
                  </Button>
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

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-200">EMT</div>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <h1 className="font-extrabold text-sm uppercase tracking-widest text-slate-800">
              {currentView === "monitoring" ? "Layout Persentase" : 
               currentView === "update" ? "Update Pekerjaan" : 
               currentView === "executive" ? "Executive Dashboard" : "Setting"}
            </h1>
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
      <main className="pt-28 pb-20 px-12 flex justify-center min-h-[calc(100vh-64px)]">
        <AnimatePresence mode="wait">
          {currentView === "executive" && <ExecutiveView />}
          
          {currentView === "monitoring" && (
            <motion.div 
              key="monitoring"
              ref={monitoringRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "bg-white border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden relative transition-all duration-500",
                isFullScreen 
                  ? "fixed inset-0 z-[100] rounded-none w-screen h-screen" 
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
                        "font-black text-xs px-4 py-1 rounded-full mb-6 animate-pulse transition-colors",
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
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToWindowEdges]}
                  >
                    {filteredPanels.map((panel) => (
                      <Panel 
                        key={panel.id} 
                        panel={panel} 
                        onEdit={setIsEditing} 
                        onDelete={deletePanel} 
                        disabled={isLocked || userRole === "view"}
                        zoom={zoom}
                        warehouse={selectedWarehouse}
                        theme={layoutTheme}
                        scale={panelScale}
                      />
                    ))}
                  </DndContext>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === "update" && (
            <motion.div 
              key="update"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-7xl flex flex-col gap-6"
            >
              <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Card: Selection */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl p-8 space-y-8 w-full xl:w-1/3 shrink-0">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">1. Project</Label>
                      <Select value={selectedProject} onValueChange={(val) => {
                        setSelectedProject(val);
                        setSelectedPanelName("");
                        setSelectedPanelId("");
                        setPendingChecklist([]);
                        setSearchQuery("");
                      }}>
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 px-6 text-xs font-bold text-slate-700 focus:ring-blue-500/20">
                          <SelectValue placeholder="Pilih Project..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {availableProjects.map(proj => (
                            <SelectItem key={proj} value={proj}>{proj}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">2. Panel Name</Label>
                      <Select 
                        value={selectedPanelName} 
                        onValueChange={(val) => {
                          setSelectedPanelName(val);
                          setSelectedPanelId("");
                          setPendingChecklist([]);
                          setSearchQuery("");
                        }}
                        disabled={!selectedProject}
                      >
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 px-6 text-xs font-bold text-slate-700 disabled:opacity-50">
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
                        value={selectedPanelId} 
                        onValueChange={(val) => {
                          setSelectedPanelId(val);
                          setPendingChecklist([]);
                          setSearchQuery("");
                        }}
                        disabled={!selectedPanelName}
                      >
                        <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 px-6 text-xs font-bold text-slate-700 disabled:opacity-50">
                          <SelectValue placeholder={selectedPanelName ? "Pilih Kode Panel..." : "Pilih Nama Panel Dahulu"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          {updatePekerjaanAvailablePanelCodes.map(code => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Right Card: Checklist */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl min-h-[600px] flex flex-col overflow-hidden flex-1 w-full">
                  <div className="p-8 border-b border-slate-50">
                    <div className="relative flex items-center gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input 
                          placeholder={matchedPanelOnLayout ? "CARI ITEM PENGERJAAN..." : "LENGKAPI CONFIG DI ATAS DAHULU"} 
                          disabled={!matchedPanelOnLayout}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="rounded-2xl bg-slate-50/50 border-none h-14 pl-12 font-bold text-[10px] uppercase tracking-widest disabled:opacity-50"
                        />
                      </div>
                      <div className="w-48">
                        <Select value={selectedBagianKerja} onValueChange={(val) => {
                          setSelectedBagianKerja(val);
                          setPendingChecklist([]);
                          setSearchQuery("");
                        }}>
                          <SelectTrigger className="rounded-2xl border-slate-100 bg-slate-50/50 h-14 px-6 text-xs font-bold text-slate-700">
                            <SelectValue placeholder="PILIH TEAM" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                            {masterData.teams.map(b => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-8">
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
                                "p-5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer",
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
                  "w-full h-20 rounded-[24px] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-xl",
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

          {currentView === "settings" && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-7xl"
            >
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
                  value={newPanelForm.project} 
                  onValueChange={(val) => setNewPanelForm(prev => ({ ...prev, project: val, name: "", code: "" }))}
                >
                  <SelectTrigger className="rounded-2xl h-14 border-slate-100 bg-slate-50/50 px-6 font-bold">
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
                  value={newPanelForm.name} 
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
                  value={newPanelForm.code} 
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
