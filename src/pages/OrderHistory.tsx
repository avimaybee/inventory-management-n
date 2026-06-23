import { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Routes, Route, useNavigate, useParams, Link, useSearchParams } from "react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, FileText, PackageOpen, 
  ExternalLink, ChevronLeft, Plus, X, ServerCrash, RotateCcw, Copy, Printer, 
  CheckCircle2, AlertTriangle, HelpCircle, Hourglass, Edit3, Save, History, ClipboardList, Trash2, AlertCircle, Archive
} from "lucide-react";
import { PRODUCTS, PACKAGING, BRANDS, CATEGORIES, FEED_TYPES } from "@/src/lib/catalog";
import { OrderItem } from "@/src/types";
import { useAuth } from "@/src/lib/auth";
import { motion, AnimatePresence } from "motion/react";

interface DBOrder {
  id: number;
  date: string;
  partyName: string;
  location: string;
  status: string;
  totalWeight: number;
  totalValue: number;
  rejectionReason?: string;
  adminRemarks?: string;
  createdBy?: string;
  isArchived: number;
  snapshot?: string;
  items: DBItem[];
  auditLogs?: DBAuditLog[];
}

interface DBItem {
  id: number;
  orderId: number;
  brand: string;
  category: string;
  feedType: string;
  product: string;
  packaging: number;
  quantity: number;
  weight: number;
  pricingBasis?: 'per_bag' | 'per_quintal';
  enteredRate?: number;
  calculatedBagRate?: number;
  calculatedLineValue?: number;
}

interface DBAuditLog {
  id: number;
  orderId: number;
  userEmail: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface PartySummary {
  partyName: string;
  location: string;
  totalOrders: number;
  totalWeight: number;
  lastOrderDate: string;
}

type PartySortField = 'partyName' | 'location' | 'totalOrders' | 'totalWeight' | 'lastOrderDate';
type SortDirection = 'asc' | 'desc';

export function OrderHistory() {
  const [orders, setOrders] = useState<DBOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken, user } = useAuth();
  const isAdmin = user?.email === 'info@neelamfeeds.in';

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load orders");
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        setError(err.message || "Unable to load history. Please try again later.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    const timer = setInterval(() => {
      fetchOrders(true);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (loading && orders === null) return <LoadingState />;

  if (error && orders === null) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full">
        <ServerCrash className="h-8 w-8 text-destructive" />
      </div>
      <p className="text-base font-semibold text-foreground">{error}</p>
      <Button onClick={() => fetchOrders()} className="mt-2 bg-secondary hover:bg-secondary/90 text-white">
        Retry Connection
      </Button>
    </div>
  );

  // If Admin, render Admin Dashboard. If Sales, render drill down history routes
  if (isAdmin) {
    return <AdminDashboard orders={orders || []} onRefresh={fetchOrders} />;
  }

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {orders && `Order history loaded. ${orders.length} orders found.`}
      </div>
      <Routes>
        <Route index element={<PartyList orders={orders} loading={loading} error={error} onRetry={() => fetchOrders()} />} />
      </Routes>
    </>
  );
}

// ------------------------------------------------------------
// ADMIN DASHBOARD
// ------------------------------------------------------------
function AdminDashboard({ orders, onRefresh }: { orders: DBOrder[], onRefresh: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState<'pending' | 'clarifications' | 'history' | 'archives'>('pending');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);
  const [archivedOrders, setArchivedOrders] = useState<DBOrder[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const { getToken } = useAuth();

  const fetchArchived = async () => {
    setArchivesLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/orders?show=archived', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setArchivesLoading(false);
    }
  };

  const handleTabChange = (tab: 'pending' | 'clarifications' | 'history' | 'archives') => {
    setActiveTab(tab);
    setSelectedOrder(null);
    if (tab === 'archives' && archivedOrders.length === 0) {
      fetchArchived();
    }
  };

  // Filter orders by tab and query
  const filteredOrders = useMemo(() => {
    const source = activeTab === 'archives' ? archivedOrders : orders;
    return source.filter(o => {
      const matchSearch = 
        o.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toString() === searchQuery;

      if (!matchSearch) return false;

      if (activeTab === 'pending') {
        return (o.status === 'submitted' || o.status === 'on_hold') && o.isArchived === 0;
      }
      if (activeTab === 'clarifications') {
        return o.status === 'clarification_needed' && o.isArchived === 0;
      }
      if (activeTab === 'history') {
        return (o.status === 'approved' || o.status === 'rejected') && o.isArchived === 0;
      }
      if (activeTab === 'archives') {
        return o.isArchived === 1;
      }
      return true;
    });
  }, [orders, archivedOrders, activeTab, searchQuery]);

  // Highlight newly appeared orders with animation
  const prevAdminIdsRef = useRef<Set<number>>(new Set());
  const [adminHighlightedIds, setAdminHighlightedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    const currentIds = new Set(filteredOrders.map(o => o.id));
    const newIds = new Set([...currentIds].filter(id => !prevAdminIdsRef.current.has(id)));
    if (newIds.size > 0) {
      setAdminHighlightedIds(newIds);
      const timer = setTimeout(() => setAdminHighlightedIds(new Set()), 2000);
      prevAdminIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }
    prevAdminIdsRef.current = currentIds;
  }, [filteredOrders]);

  return (
    <div className="p-4 lg:p-8 w-full max-w-[1600px] mx-auto gap-6 flex flex-col xl:flex-row items-start">
      
      {/* List Container */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Order Approvals & Review</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review incoming orders, correct pricing, log audits, and sync approved items to sheets.
          </p>
        </div>

        {/* Action Tabs & Search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-2">
          <div className="flex flex-wrap gap-1.5 select-none">
            <button
              onClick={() => { setActiveTab('pending'); setSelectedOrder(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              Pending ({orders.filter(o => (o.status === 'submitted' || o.status === 'on_hold') && o.isArchived === 0).length})
            </button>
            <button
              onClick={() => { setActiveTab('clarifications'); setSelectedOrder(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'clarifications' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              Clarifications ({orders.filter(o => o.status === 'clarification_needed' && o.isArchived === 0).length})
            </button>
            <button
              onClick={() => { setActiveTab('history'); setSelectedOrder(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              History ({orders.filter(o => (o.status === 'approved' || o.status === 'rejected') && o.isArchived === 0).length})
            </button>
            <button
              onClick={() => handleTabChange('archives')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'archives' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              Archived ({archivedOrders.length || '…'})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search party, city, ID…"
              className="pl-8 bg-card border-border h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Dashboard table list */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader className="bg-muted">
              <TableRow className="border-border">
                <TableHead className="w-[70px] font-semibold text-foreground text-center">ID</TableHead>
                <TableHead className="font-semibold text-foreground">Party Name</TableHead>
                <TableHead className="font-semibold text-foreground">Location</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap">Date Submitted</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Items</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Weight</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Value</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                    No orders found in this category.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(o => {
                  const isActive = selectedOrder?.id === o.id;
                  const totalBags = o.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  // Status badge coloring
                  let statusColor = "bg-muted text-muted-foreground";
                  if (o.status === "draft") statusColor = "bg-slate-100 text-slate-500 border-dashed";
                  if (o.status === "approved") statusColor = "bg-secondary/10 text-secondary";
                  if (o.status === "submitted") statusColor = "bg-amber-500/10 text-amber-600 font-bold";
                  if (o.status === "clarification_needed") statusColor = "bg-orange-500/10 text-orange-600";
                  if (o.status === "rejected") statusColor = "bg-destructive/10 text-destructive";
                  if (o.status === "on_hold") statusColor = "bg-zinc-500/10 text-zinc-600";

                  return (
                    <TableRow
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className={`cursor-pointer hover:bg-muted/50 border-border group transition-all duration-150 ${isActive ? 'bg-secondary/5 font-medium' : ''} ${adminHighlightedIds.has(o.id) ? 'animate-new-order' : ''}`}
                    >
                      <TableCell className="font-mono text-center font-bold text-secondary">#{o.id}</TableCell>
                      <TableCell className="font-bold text-foreground truncate max-w-[180px]">{o.partyName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs truncate max-w-[140px]">{o.location}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(o.date), "MMM d, h:mm a")}</TableCell>
                      <TableCell className="text-right font-medium text-xs whitespace-nowrap">{o.items.length} SKUs ({totalBags} bags)</TableCell>
                      <TableCell className="text-right font-medium text-xs text-foreground whitespace-nowrap">{o.totalWeight.toFixed(2)} Qtl</TableCell>
                      <TableCell className="text-right font-bold text-xs text-secondary whitespace-nowrap">₹{o.totalValue.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${statusColor} border-none whitespace-nowrap`}>
                          {o.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Review details Card Panel */}
      <div className="w-full xl:w-[480px] shrink-0 xl:sticky xl:top-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <AdminOrderReviewPanel order={selectedOrder} onRefresh={async () => { await onRefresh(); setSelectedOrder(null); }} />
            </motion.div>
          ) : (
            <div className="border border-border border-dashed rounded-xl p-12 text-center text-muted-foreground bg-card py-24 flex flex-col items-center justify-center space-y-3">
              <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-bold text-foreground text-sm">Select an order</p>
              <p className="text-xs max-w-[200px]">Click any row in the list to review details, override rates, view audit logs, or perform approvals.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

// Admin order review component
function AdminOrderReviewPanel({ order, onRefresh }: { order: DBOrder, onRefresh: () => Promise<void> }) {
  const { getToken } = useAuth();
  
  // Dialog controls
  const [showClarifyDialog, setShowClarifyDialog] = useState(false);
  const [clarifyRemarks, setClarifyRemarks] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customRejectionReason, setCustomRejectionReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Rates Override states
  const [editRates, setEditRates] = useState(false);
  const [itemRates, setItemRates] = useState<Record<number, { enteredRate: number, pricingBasis: 'per_bag' | 'per_quintal' }>>({});

  useEffect(() => {
    const initialRates: typeof itemRates = {};
    order.items.forEach(i => {
      initialRates[i.id] = {
        enteredRate: i.enteredRate || 0,
        pricingBasis: i.pricingBasis || 'per_bag'
      };
    });
    setItemRates(initialRates);
    setEditRates(false);
    setErrorMessage("");
  }, [order]);

  const handleRateFieldChange = (itemId: number, rate: number) => {
    setItemRates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], enteredRate: rate }
    }));
  };

  const handleRateBasisChange = (itemId: number, basis: 'per_bag' | 'per_quintal') => {
    setItemRates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], pricingBasis: basis }
    }));
  };

  // Perform calculations for overrides locally
  const tempTotals = useMemo(() => {
    let nextValue = 0;
    const computedItems = order.items.map(i => {
      const overrides = itemRates[i.id];
      if (!overrides) return { ...i };
      const basis = overrides.pricingBasis;
      const rate = overrides.enteredRate;
      
      let bagRate = 0;
      if (basis === 'per_bag') {
        bagRate = rate;
      } else {
        bagRate = rate * (i.packaging / 100);
      }
      const lineVal = bagRate * i.quantity;
      nextValue += lineVal;

      return {
        ...i,
        pricingBasis: basis,
        enteredRate: rate,
        calculatedBagRate: bagRate,
        calculatedLineValue: lineVal
      };
    });

    return {
      items: computedItems,
      totalValue: nextValue
    };
  }, [order, itemRates]);

  const handleSaveRatesOverride = async () => {
    setSaving(true);
    setErrorMessage("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Unauthenticated");

      // Build updated items payload
      const updatedItems = tempTotals.items.map(item => ({
        brand: item.brand,
        category: item.category,
        feedType: item.feedType,
        product: item.product,
        packaging: item.packaging,
        quantity: item.quantity,
        weight: item.weight,
        pricingBasis: item.pricingBasis,
        enteredRate: item.enteredRate,
        calculatedBagRate: item.calculatedBagRate,
        calculatedLineValue: item.calculatedLineValue
      }));

      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: order.id,
          items: updatedItems,
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save rate overrides");
      }

      setEditRates(false);
      await onRefresh();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to save rate overrides.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (status: string, reason?: string, remarks?: string) => {
    setSaving(true);
    setErrorMessage("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Unauthenticated");

      const payload: any = {
        id: order.id,
        status
      };
      if (reason) payload.rejectionReason = reason;
      if (remarks) payload.adminRemarks = remarks;

      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update order status");
      }

      setShowClarifyDialog(false);
      setShowRejectDialog(false);
      await onRefresh();
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to perform action.");
    } finally {
      setSaving(false);
    }
  };

  const finalRejectionReason = rejectionReason === 'Other' ? customRejectionReason : rejectionReason;

  return (
    <Card className="border border-border shadow-md bg-card">
      <CardHeader className="bg-muted/15 border-b border-border py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-mono text-xs text-secondary font-bold">ORDER SLIP #{order.id}</span>
            <CardTitle className="text-base font-bold text-foreground">Review Order Details</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        
        {/* Buyer metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Party / Buyer</div>
            <div className="font-bold text-foreground mt-0.5 text-sm">{order.partyName}</div>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Location / Branch</div>
            <div className="font-bold text-foreground mt-0.5 text-sm">{order.location}</div>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Created By</div>
            <div className="font-bold text-foreground mt-0.5">{order.createdBy || 'Unknown'}</div>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Date Created</div>
            <div className="font-bold text-foreground mt-0.5">{format(new Date(order.date), "PPP p")}</div>
          </div>
        </div>

        {/* Items Table container */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase">Order Line Items</span>
            {order.status !== 'approved' && order.status !== 'rejected' && order.isArchived === 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => editRates ? handleSaveRatesOverride() : setEditRates(true)}
                disabled={saving}
                className="h-8 text-xs font-semibold text-secondary hover:bg-secondary/10"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : editRates ? <Save className="h-3.5 w-3.5 mr-1.5" /> : <Edit3 className="h-3.5 w-3.5 mr-1.5" />}
                {editRates ? "Save Pricing" : "Override Rates"}
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow className="border-border">
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground">Product</TableHead>
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground text-right">Qty</TableHead>
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground text-right">Rate</TableHead>
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tempTotals.items.map(item => {
                  const overrides = itemRates[item.id];
                  return (
                    <TableRow key={item.id} className="hover:bg-transparent border-border">
                      <TableCell className="py-2.5 pr-1">
                        <div className="font-semibold text-xs leading-tight text-foreground">{item.product}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{item.packaging}kg bag</div>
                      </TableCell>
                      
                      <TableCell className="py-2.5 text-right font-medium text-xs tabular-nums text-foreground">
                        {item.quantity}
                      </TableCell>
                      
                      <TableCell className="py-2.5 text-right font-medium text-xs tabular-nums">
                        {editRates && overrides ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <Input
                              type="text"
                              className="h-7 w-20 text-right px-1 text-xs"
                              value={overrides.enteredRate}
                              onChange={e => handleRateFieldChange(item.id, parseFloat(e.target.value) || 0)}
                            />
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleRateBasisChange(item.id, 'per_bag')} 
                                className={`text-[9px] font-bold px-1 py-0.25 rounded ${overrides.pricingBasis === 'per_bag' ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'}`}
                              >
                                Bag
                              </button>
                              <button 
                                onClick={() => handleRateBasisChange(item.id, 'per_quintal')} 
                                className={`text-[9px] font-bold px-1 py-0.25 rounded ${overrides.pricingBasis === 'per_quintal' ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'}`}
                              >
                                Qtl
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold text-foreground">₹{item.enteredRate}</div>
                            <span className="text-[9px] text-muted-foreground block">{item.pricingBasis === 'per_bag' ? 'bag' : 'qtl'}</span>
                          </>
                        )}
                      </TableCell>
                      
                      <TableCell className="py-2.5 text-right font-bold text-xs text-secondary tabular-nums">
                        ₹{item.calculatedLineValue?.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Calculated Summaries */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total Bags</span>
            <span className="font-semibold text-foreground">{order.items.reduce((sum, i) => sum + i.quantity, 0)} bags</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total Weight (Quintals)</span>
            <span className="font-semibold text-foreground">{order.totalWeight.toFixed(2)} Qtl</span>
          </div>
          <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 text-sm">
            <span>Estimated Value</span>
            <span className="text-secondary text-base">₹{tempTotals.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded-lg flex items-start gap-2 border border-destructive/25">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action controls */}
        {order.isArchived === 0 && order.status !== 'approved' && order.status !== 'rejected' && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            
            {/* Top buttons: Approve, Seek Clarification */}
            <Button 
              disabled={saving || editRates} 
              onClick={() => handleStatusUpdate('approved')}
              className="bg-secondary hover:bg-secondary/95 text-white font-bold h-11"
            >
              Approve Order
            </Button>
            <Button 
              disabled={saving || editRates} 
              onClick={() => setShowClarifyDialog(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
            >
              Seek Clarification
            </Button>
            
            {/* Bottom buttons: Hold, Reject */}
            <Button 
              disabled={saving || editRates} 
              variant="outline"
              onClick={() => handleStatusUpdate(order.status === 'on_hold' ? 'submitted' : 'on_hold')}
              className="border-border text-foreground font-semibold h-11"
            >
              {order.status === 'on_hold' ? 'Release Hold' : 'Put on Hold'}
            </Button>
            <Button 
              disabled={saving || editRates} 
              variant="destructive"
              onClick={() => setShowRejectDialog(true)}
              className="font-bold h-11"
            >
              Reject Order
            </Button>
          </div>
        )}

        {/* Archive button - visible for any non-archived order */}
        {order.isArchived === 0 && (
          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              disabled={saving}
              onClick={async () => {
                if (!confirm('Archive this order? It will be moved to the Archived tab.')) return;
                setSaving(true);
                try {
                  const token = await getToken();
                  if (!token) throw new Error("Unauthenticated");
                  const res = await fetch('/api/orders', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ id: order.id, isArchived: 1 }),
                  });
                  if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || "Failed to archive order");
                  }
                  await onRefresh();
                } catch (e: any) {
                  setErrorMessage(e.message || "Failed to archive.");
                } finally {
                  setSaving(false);
                }
              }}
              className="w-full border-dashed text-muted-foreground h-10"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Order
            </Button>
          </div>
        )}

        {/* Chronological Audit Logs Timeline */}
        <div className="space-y-3 pt-4 border-t border-border">
          <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <History className="h-4 w-4 text-secondary" />
            <span>Order Audit History</span>
          </span>
          <div className="relative border-l border-border pl-4 ml-2.5 space-y-4 text-xs">
            {order.auditLogs && order.auditLogs.length > 0 ? (
              order.auditLogs.map(log => {
                let logIcon = <History className="h-3 w-3" />;
                let actionText = log.action;
                let bgCircle = "bg-muted text-muted-foreground";

                if (log.action === "CREATED") {
                  logIcon = <Plus className="h-3 w-3" />;
                  actionText = "Order Created";
                  bgCircle = "bg-sky-500/15 text-sky-600 border border-sky-400/30";
                } else if (log.action === "DELETED") {
                  logIcon = <Trash2 className="h-3 w-3" />;
                  actionText = "Order Soft Deleted";
                  bgCircle = "bg-destructive/15 text-destructive";
                } else if (log.action === "STATUS_CHANGE") {
                  const details = JSON.parse(log.details || '{}');
                  logIcon = <ClipboardList className="h-3 w-3" />;
                  actionText = `Status: ${details.from} ➔ ${details.to}`;
                  bgCircle = "bg-secondary/15 text-secondary border border-secondary/25";
                } else if (log.action === "PRICE_MODIFIED") {
                  logIcon = <Edit3 className="h-3 w-3" />;
                  actionText = "Negotiated Price Overridden";
                  bgCircle = "bg-amber-500/15 text-amber-600 border border-amber-400/25";
                }

                const detailsObj = JSON.parse(log.details || '{}');

                return (
                  <div key={log.id} className="relative space-y-1">
                    {/* Node Circle */}
                    <span className={`absolute -left-[27px] top-0.5 rounded-full p-1 ${bgCircle}`}>
                      {logIcon}
                    </span>
                    <div className="flex justify-between font-bold text-foreground">
                      <span>{actionText}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{format(new Date(log.timestamp), "MMM d, h:mm a")}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">by {log.userEmail}</div>
                    {detailsObj.adminRemarks && (
                      <div className="bg-amber-500/5 text-amber-800 p-2 rounded-lg mt-1 border border-amber-500/15">
                        Remarks: {detailsObj.adminRemarks}
                      </div>
                    )}
                    {detailsObj.rejectionReason && (
                      <div className="bg-destructive/5 text-destructive p-2 rounded-lg mt-1 border border-destructive/15">
                        Rejection reason: {detailsObj.rejectionReason}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-muted-foreground italic py-2">No logs recorded.</div>
            )}
          </div>
        </div>

      </CardContent>

      {/* Seek Clarification Dialog */}
      <Dialog open={showClarifyDialog} onOpenChange={setShowClarifyDialog}>
        <DialogContent className="max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Seek Clarification</DialogTitle>
            <DialogDescription>
              Please explain what details need revision or correction by the sales team. The order will be unlocked for editing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="clarify-remarks" className="text-xs font-bold text-muted-foreground uppercase">Admin Remarks</Label>
            <Textarea
              id="clarify-remarks"
              placeholder="e.g. Please check the rate for product X. Pricing basis should be quintal, not bag."
              className="bg-card border-border min-h-[100px]"
              value={clarifyRemarks}
              onChange={e => setClarifyRemarks(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClarifyDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => handleStatusUpdate('clarification_needed', undefined, clarifyRemarks)} disabled={saving || !clarifyRemarks.trim()} className="bg-secondary hover:bg-secondary/95 text-white font-bold">
              Send to Sales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this order submission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Select Reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Negotiated rate too low">Negotiated rate too low</SelectItem>
                  <SelectItem value="Buyer credit limit exceeded">Buyer credit limit exceeded</SelectItem>
                  <SelectItem value="Incorrect product category selections">Incorrect product category selections</SelectItem>
                  <SelectItem value="Other">Other (custom remark)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {rejectionReason === 'Other' && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-reject-reason" className="text-xs font-bold text-muted-foreground uppercase">Explain Reason</Label>
                <Textarea
                  id="custom-reject-reason"
                  placeholder="Provide detailed custom rejection notes…"
                  className="bg-card border-border min-h-[80px]"
                  value={customRejectionReason}
                  onChange={e => setCustomRejectionReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={saving}>Cancel</Button>
            <Button 
              onClick={() => handleStatusUpdate('rejected', finalRejectionReason)} 
              disabled={saving || !rejectionReason || (rejectionReason === 'Other' && !customRejectionReason.trim())}
              className="bg-destructive hover:bg-destructive/95 text-white font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}

// ------------------------------------------------------------
// SALES WORKFLOW COMPONENT VIEWS (PartyList, PartyOrderList, OrderDetail)
// ------------------------------------------------------------

// Read-only order detail panel for Sales — same layout as AdminOrderReviewPanel without action buttons
function SalesOrderViewPanel({ order, onRefresh, onBack }: { order: DBOrder; onRefresh: () => void; onBack: () => void }) {
  let statusColor = "bg-muted text-muted-foreground";
  if (order.status === "draft") statusColor = "bg-slate-500/10 text-slate-600 border-dashed";
  if (order.status === "approved") statusColor = "bg-secondary text-white";
  if (order.status === "submitted") statusColor = "bg-amber-500 text-white font-bold";
  if (order.status === "clarification_needed") statusColor = "bg-orange-500 text-white";
  if (order.status === "rejected") statusColor = "bg-destructive text-white";

  return (
    <Card className="border border-border shadow-md bg-card">
      <CardHeader className="bg-muted/15 border-b border-border py-4 px-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-mono text-xs text-secondary font-bold">ORDER SLIP #{order.id}</span>
            <CardTitle className="text-base font-bold text-foreground">Order Details</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${statusColor} border-none px-3 py-1`}>
              {order.status.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-6">
        
        {/* Buyer metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Party / Buyer</div>
            <div className="font-bold text-foreground mt-0.5 text-sm">{order.partyName}</div>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Location / Branch</div>
            <div className="font-bold text-foreground mt-0.5 text-sm">{order.location}</div>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Created By</div>
            <div className="font-bold text-foreground mt-0.5">{order.createdBy || 'Unknown'}</div>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider">Date Created</div>
            <div className="font-bold text-foreground mt-0.5">{format(new Date(order.date), "PPP p")}</div>
          </div>
        </div>

        {/* Items table */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase">Order Line Items</span>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow className="border-border">
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground">Product</TableHead>
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground text-right">Qty</TableHead>
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground text-right">Rate</TableHead>
                  <TableHead className="py-2 h-8 text-[11px] font-semibold text-foreground text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map(item => (
                  <TableRow key={item.id} className="hover:bg-transparent border-border">
                    <TableCell className="py-2.5 pr-1">
                      <div className="font-semibold text-xs leading-tight text-foreground">{item.product}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.packaging}kg bag</div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-medium text-xs tabular-nums text-foreground">{item.quantity}</TableCell>
                    <TableCell className="py-2.5 text-right font-medium text-xs tabular-nums">
                      <div className="font-semibold text-foreground">₹{item.enteredRate}</div>
                      <span className="text-[9px] text-muted-foreground block">{item.pricingBasis === 'per_bag' ? '/bag' : '/qtl'}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-bold text-xs text-secondary tabular-nums">
                      ₹{item.calculatedLineValue?.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Calculated Summaries */}
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total Bags</span>
            <span className="font-semibold text-foreground">{order.items.reduce((sum, i) => sum + i.quantity, 0)} bags</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Total Weight (Quintals)</span>
            <span className="font-semibold text-foreground">{order.totalWeight.toFixed(2)} Qtl</span>
          </div>
          <div className="flex justify-between font-bold text-foreground border-t border-border pt-2 text-sm">
            <span>Estimated Value</span>
            <span className="text-secondary text-base">₹{order.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        {/* Clarification / Rejection notes */}
        {order.status === 'clarification_needed' && order.adminRemarks && (
          <div className="bg-orange-500/5 text-orange-800 p-3 rounded-lg border border-orange-500/15 space-y-1">
            <div className="text-xs font-bold uppercase">Admin Remarks</div>
            <div className="text-sm">{order.adminRemarks}</div>
          </div>
        )}
        {order.status === 'rejected' && order.rejectionReason && (
          <div className="bg-destructive/5 text-destructive p-3 rounded-lg border border-destructive/15 space-y-1">
            <div className="text-xs font-bold uppercase">Rejection Reason</div>
            <div className="text-sm">{order.rejectionReason}</div>
          </div>
        )}

        {/* Audit Logs */}
        {order.auditLogs && order.auditLogs.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
              <History className="h-4 w-4 text-secondary" />
              <span>Order History</span>
            </span>
            <div className="relative border-l border-border pl-4 ml-2.5 space-y-4 text-xs">
              {order.auditLogs.map(log => {
                let logIcon = <History className="h-3 w-3" />;
                let actionText = log.action;
                let bgCircle = "bg-muted text-muted-foreground";

                if (log.action === "CREATED") { logIcon = <Plus className="h-3 w-3" />; actionText = "Created"; bgCircle = "bg-sky-500/15 text-sky-600"; }
                else if (log.action === "STATUS_CHANGE") {
                  const d = JSON.parse(log.details || '{}');
                  logIcon = <ClipboardList className="h-3 w-3" />;
                  actionText = `Status: ${d.from} ➔ ${d.to}`;
                  bgCircle = "bg-secondary/15 text-secondary";
                }
                else if (log.action === "PRICE_MODIFIED") { logIcon = <Edit3 className="h-3 w-3" />; actionText = "Price Modified"; bgCircle = "bg-amber-500/15 text-amber-600"; }

                return (
                  <div key={log.id} className="relative space-y-1">
                    <span className={`absolute -left-[27px] top-0.5 rounded-full p-1 ${bgCircle}`}>{logIcon}</span>
                    <div className="flex justify-between font-bold text-foreground">
                      <span>{actionText}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold">{format(new Date(log.timestamp), "MMM d, h:mm a")}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">by {log.userEmail}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Print button */}
        <Button variant="outline" className="w-full h-10" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print Order
        </Button>
      </CardContent>
    </Card>
  );
}

// 1. Party List View — aligned with AdminDashboard layout
function PartyList({ orders, loading, error, onRetry }: { orders: DBOrder[] | null, loading: boolean, error: string | null, onRetry: () => void }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const searchTerm = searchParams.get('q') || '';
  const view = searchParams.get('view') || 'active';
  const [selectedOrder, setSelectedOrder] = useState<DBOrder | null>(null);

  const safeOrders = orders || [];
  const filteredOrders = useMemo(() => {
    return safeOrders.filter(o => {
      const matchSearch = !searchTerm || 
        o.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toString() === searchTerm;
      if (!matchSearch) return false;
      if (view === 'history') return o.status === 'approved' || o.status === 'rejected';
      return o.status === 'draft' || o.status === 'submitted' || o.status === 'clarification_needed' || o.status === 'on_hold';
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [safeOrders, view, searchTerm]);

  // Highlight newly appeared orders with animation
  const prevIdsRef = useRef<Set<number>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());
  useEffect(() => {
    const currentIds = new Set(filteredOrders.map(o => o.id));
    const newIds = new Set([...currentIds].filter(id => !prevIdsRef.current.has(id)));
    if (newIds.size > 0) {
      setHighlightedIds(newIds);
      const timer = setTimeout(() => setHighlightedIds(new Set()), 2000);
      prevIdsRef.current = currentIds;
      return () => clearTimeout(timer);
    }
    prevIdsRef.current = currentIds;
  }, [filteredOrders]);

  return (
    <div className="p-4 lg:p-8 w-full max-w-[1600px] mx-auto gap-6 flex flex-col xl:flex-row items-start">
      
      {/* Table Container */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {view === 'active' ? 'Active Orders' : 'Order History'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {view === 'active' ? 'Drafts, submissions, and orders needing clarification.' : 'Approved and rejected orders.'}
          </p>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-2">
          <div className="flex gap-1.5 select-none">
            <button
              onClick={() => { setSearchParams(prev => { const p = new URLSearchParams(prev); p.delete('view'); return p; }); setSelectedOrder(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'active' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              Active
            </button>
            <button
              onClick={() => { setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('view', 'history'); return p; }); setSelectedOrder(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'history' ? 'bg-secondary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}
            >
              History
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search party, location, or ID…"
              className="pl-8 bg-card border-border h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('q', e.target.value); return p; })}
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableHeader className="bg-muted">
              <TableRow className="border-border">
                <TableHead className="w-[70px] font-semibold text-foreground text-center">ID</TableHead>
                <TableHead className="font-semibold text-foreground">Party Name</TableHead>
                <TableHead className="font-semibold text-foreground">Location</TableHead>
                <TableHead className="font-semibold text-foreground">Date</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Items</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Weight</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Value</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">No orders found.</TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(o => {
                  const isActive = selectedOrder?.id === o.id;
                  const totalBags = o.items.reduce((sum, i) => sum + i.quantity, 0);

                  let statusColor = "bg-muted text-muted-foreground border-none";
                  if (o.status === "draft") statusColor = "bg-slate-100 text-slate-500 border-dashed";
                  if (o.status === "approved") statusColor = "bg-secondary/10 text-secondary border-none";
                  if (o.status === "submitted") statusColor = "bg-amber-500/10 text-amber-600 font-bold border-none";
                  if (o.status === "clarification_needed") statusColor = "bg-orange-500/10 text-orange-600 border-none";
                  if (o.status === "rejected") statusColor = "bg-destructive/10 text-destructive border-none";
                  if (o.status === "on_hold") statusColor = "bg-zinc-500/10 text-zinc-600 border-none";

                  return (
                    <TableRow
                      key={o.id}
                      onClick={() => setSelectedOrder(o)}
                      className={`cursor-pointer hover:bg-muted/50 border-border transition-all duration-150 ${isActive ? 'bg-secondary/5 font-medium' : ''} ${highlightedIds.has(o.id) ? 'animate-new-order' : ''}`}
                    >
                      <TableCell className="font-mono font-bold text-secondary text-center">#{o.id}</TableCell>
                      <TableCell className="font-bold text-foreground truncate max-w-[180px]">{o.partyName}</TableCell>
                      <TableCell className="text-muted-foreground text-xs truncate max-w-[140px]">{o.location}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(o.date), "MMM d, h:mm a")}</TableCell>
                      <TableCell className="text-right font-medium text-xs whitespace-nowrap">{o.items.length} SKUs ({totalBags} bags)</TableCell>
                      <TableCell className="text-right font-medium text-xs text-foreground whitespace-nowrap">{o.totalWeight.toFixed(2)} Qtl</TableCell>
                      <TableCell className="text-right font-bold text-xs text-secondary whitespace-nowrap">₹{o.totalValue.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={statusColor}>
                          {o.status === 'clarification_needed' ? 'CLARIFICATION' : o.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Panel */}
      <div className="w-full xl:w-[480px] shrink-0 xl:sticky xl:top-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full"
            >
              <SalesOrderViewPanel order={selectedOrder} onRefresh={onRetry} onBack={() => setSelectedOrder(null)} />
            </motion.div>
          ) : (
            <div className="border border-border border-dashed rounded-xl p-12 text-center text-muted-foreground bg-card py-24 flex flex-col items-center justify-center space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground/30" />
              <p className="font-bold text-foreground text-sm">Select an order</p>
              <p className="text-xs max-w-[200px]">Click any row to view order details, items, and audit history.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

// 2. Party Order List View
function PartyOrderList({ orders, loading, error, onRetry }: { orders: DBOrder[] | null, loading: boolean, error: string | null, onRetry: () => void }) {
  const { partyName } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'active';
  const safeOrders = orders || [];
  const partyOrders = useMemo(() => 
    safeOrders.filter(o => {
      if (o.partyName !== partyName) return false;
      if (view === 'history') return o.status === 'approved' || o.status === 'rejected';
      return o.status === 'draft' || o.status === 'submitted' || o.status === 'clarification_needed' || o.status === 'on_hold';
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [safeOrders, partyName, view]
  );

  return (
    <div className="p-4 lg:p-8 w-full max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(`/history?${searchParams.toString()}`)} className="border-border">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Orders: {partyName}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {view === 'history' ? 'Approved and rejected orders.' : 'Active orders — drafts, submissions, and clarifications.'}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="border-border">
              <TableHead className="w-[100px] font-semibold text-foreground">Order ID</TableHead>
              <TableHead className="font-semibold text-foreground">Date</TableHead>
              <TableHead className="font-semibold text-foreground">Location</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Lines</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Total Bags</TableHead>
              <TableHead className="text-right font-semibold text-foreground">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partyOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">No orders placed by this party.</TableCell>
              </TableRow>
            ) : (
              partyOrders.map(order => {
                const totalBags = order.items.reduce((sum, i) => sum + i.quantity, 0);
                
                let statusColor = "bg-muted text-muted-foreground";
                if (order.status === "draft") statusColor = "bg-slate-100 text-slate-500 border-dashed";
                if (order.status === "approved") statusColor = "bg-secondary/10 text-secondary border-none";
                if (order.status === "submitted") statusColor = "bg-amber-500/10 text-amber-600 font-bold border-none";
                if (order.status === "clarification_needed") statusColor = "bg-orange-500/10 text-orange-600 border-none animate-pulse";
                if (order.status === "rejected") statusColor = "bg-destructive/10 text-destructive border-none";

                return (
                  <TableRow 
                    key={order.id} 
                    className="cursor-pointer hover:bg-muted/50 border-border font-medium"
                    onClick={() => navigate(`/history/${encodeURIComponent(partyName!)}/${order.id}`)}
                  >
                    <TableCell className="font-mono font-bold text-secondary">#{order.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(order.date), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{order.location}</TableCell>
                    <TableCell>
                      <Badge className={statusColor}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{order.items.length}</TableCell>
                    <TableCell className="text-right text-xs">{totalBags} bags</TableCell>
                    <TableCell className="text-right text-secondary font-bold text-sm">₹{order.totalValue.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 3. Individual Order Detail View (Sales)
function OrderDetail({ orders, loading, error, onRetry }: { orders: DBOrder[] | null, loading: boolean, error: string | null, onRetry: () => void }) {
  const { partyName, orderId } = useParams();
  const navigate = useNavigate();
  const safeOrders = orders || [];
  const order = useMemo(() => 
    safeOrders.find(o => o.id === Number(orderId)), 
    [safeOrders, orderId]
  );

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <h1 className="text-xl font-bold">Order not found</h1>
        <Button onClick={() => navigate('/history')} className="bg-secondary text-white">Back to History</Button>
      </div>
    );
  }

  const totalBags = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleEditResubmit = () => {
    // Maps DB items back to creation client model
    const draftItems = order.items.map(dbItem => {
      const product = PRODUCTS.find(p => p.name === dbItem.product);
      const pkg = PACKAGING.find(p => p.weightKg === dbItem.packaging);

      return {
        id: crypto.randomUUID(),
        brandId: product?.brandId || '',
        brandName: dbItem.brand,
        categoryId: '',
        categoryName: dbItem.category,
        feedTypeId: product?.feedTypeId || '',
        feedTypeName: dbItem.feedType,
        productId: product?.id || '',
        productName: dbItem.product,
        packagingId: pkg?.id || '',
        packagingName: pkg?.name || `${dbItem.packaging}kg Bag`,
        packagingWeightKg: dbItem.packaging,
        quantity: dbItem.quantity,
        weightQuintals: dbItem.weight,
        pricingBasis: dbItem.pricingBasis || 'per_bag',
        enteredRate: dbItem.enteredRate || 0,
        calculatedBagRate: dbItem.calculatedBagRate || 0,
        calculatedLineValue: dbItem.calculatedLineValue || 0,
      };
    });

    const localDraft = {
      id: order.id, // locks the id as draftId!
      partyName: order.partyName,
      location: order.location,
      items: draftItems,
      adminRemarks: order.adminRemarks || null
    };

    localStorage.setItem('new_order_draft', JSON.stringify(localDraft));
    navigate('/');
  };

  const handleRepeatOrder = () => {
    const draftItems = order.items.map(dbItem => {
      const product = PRODUCTS.find(p => p.name === dbItem.product);
      const pkg = PACKAGING.find(p => p.weightKg === dbItem.packaging);
      return {
        id: crypto.randomUUID(),
        brandId: product?.brandId || '',
        brandName: dbItem.brand,
        categoryId: '',
        categoryName: dbItem.category,
        feedTypeId: product?.feedTypeId || '',
        feedTypeName: dbItem.feedType,
        productId: product?.id || '',
        productName: dbItem.product,
        packagingId: pkg?.id || '',
        packagingName: pkg?.name || `${dbItem.packaging}kg Bag`,
        packagingWeightKg: dbItem.packaging,
        quantity: dbItem.quantity,
        weightQuintals: dbItem.weight,
        pricingBasis: dbItem.pricingBasis || 'per_bag',
        enteredRate: dbItem.enteredRate || 0,
        calculatedBagRate: dbItem.calculatedBagRate || 0,
        calculatedLineValue: dbItem.calculatedLineValue || 0,
      };
    });
    const localDraft = {
      partyName: order.partyName,
      location: order.location,
      items: draftItems,
      isRepeat: true
    };
    localStorage.setItem('new_order_draft', JSON.stringify(localDraft));
    navigate('/');
  };

  // Status pills formatting
  let statusColor = "bg-muted text-muted-foreground";
  if (order.status === "draft") statusColor = "bg-slate-500/10 text-slate-600 border-dashed";
  if (order.status === "approved") statusColor = "bg-secondary text-white";
  if (order.status === "submitted") statusColor = "bg-amber-500 text-white font-bold";
  if (order.status === "clarification_needed") statusColor = "bg-orange-500 text-white animate-pulse";
  if (order.status === "rejected") statusColor = "bg-destructive text-white";

  return (
    <div className="p-4 lg:p-8 w-full max-w-[1000px] mx-auto space-y-6">
      
      {order.status === 'clarification_needed' && order.adminRemarks && (
        <div className="bg-orange-500/10 border border-orange-500/30 text-orange-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Clarification Required by Admin</h4>
            <p className="text-xs mt-1 leading-relaxed">{order.adminRemarks}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate(`/history/${encodeURIComponent(partyName!)}`)} className="border-border">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Order #{order.id}
            </h1>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{order.partyName}</span>
              <span>&bull;</span>
              <span>{order.location}</span>
              <span>&bull;</span>
              <span>{format(new Date(order.date), "PPP")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${statusColor} border-none px-3 py-1.5 text-sm`}>
            {order.status.toUpperCase()}
          </Badge>
          
          {(order.status === 'clarification_needed' || order.status === 'draft') && (
            <Button onClick={handleEditResubmit} className="bg-secondary hover:bg-secondary/90 text-white font-bold h-9 text-xs">
              Edit & Resubmit
            </Button>
          )}

          <Button variant="outline" className="border-border text-foreground font-semibold h-9 text-xs" onClick={handleRepeatOrder}>
            <Copy className="h-4 w-4 mr-1.5" />
            Repeat Order
          </Button>
          <Button variant="outline" className="border-border text-foreground font-semibold h-9 text-xs print:hidden" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border shadow-sm overflow-hidden bg-card print:border print:shadow-none print:bg-white">
        <Table>
          <TableHeader className="bg-muted print:bg-gray-100 border-border">
            <TableRow>
              <TableHead className="font-semibold text-foreground">Product Details</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Packaging</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Basis</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Rate</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Qty</TableHead>
              <TableHead className="font-semibold text-foreground text-right">Line Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map(item => (
              <TableRow key={item.id} className="hover:bg-transparent border-border">
                <TableCell>
                  <div className="font-bold text-foreground text-sm">{item.product}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 print:text-gray-600">
                    {item.brand} &bull; {item.category}
                  </div>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground font-semibold">{item.packaging}kg</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{item.pricingBasis === 'per_bag' ? 'Bag' : 'Qtl'}</TableCell>
                <TableCell className="text-right font-medium text-xs text-foreground">₹{item.enteredRate}</TableCell>
                <TableCell className="text-right font-semibold text-xs tabular-nums text-foreground">{item.quantity} bags</TableCell>
                <TableCell className="text-right font-bold text-xs text-secondary tabular-nums">
                  ₹{item.calculatedLineValue?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <div className="bg-muted/30 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-border print:bg-gray-100 print:border-gray-300">
          <div className="text-xs font-semibold text-muted-foreground space-y-1">
            <div>Total Bags: <span className="font-bold text-foreground">{totalBags} bags</span></div>
            <div>Total Weight: <span className="font-bold text-foreground">{order.totalWeight.toFixed(2)} Qtl</span></div>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs font-semibold block mb-0.5 print:text-gray-600 uppercase">Grand Total Value</span>
            <span className="font-bold text-2xl text-secondary flex items-baseline gap-1 print:text-black">
              ₹{order.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-32 space-y-4 text-muted-foreground">
      <Loader2 className="h-8 w-8 text-secondary animate-spin" />
      <p className="text-sm font-semibold">Syncing orders history ledger…</p>
    </div>
  );
}
