import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Routes, Route, useNavigate, useParams, Link, useSearchParams } from "react-router";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, FileText, PackageOpen, ExternalLink, ChevronLeft, Plus, X, ServerCrash, RotateCcw, Copy } from "lucide-react";
import { PRODUCTS, PACKAGING, BRANDS, CATEGORIES, FEED_TYPES } from "@/src/lib/catalog";
import { OrderItem } from "@/src/types";

interface DBOrder {
  id: number;
  date: string;
  partyName: string;
  location: string;
  status: string;
  totalWeight: number;
  items: DBItem[];
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

  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    fetch('/api/orders')
      .then(res => {
        if (!res.ok) throw new Error("Failed to load orders");
        return res.json();
      })
      .then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Unable to load history. Please try again later.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {loading && "Loading order history…"}
        {error && `Error: ${error}`}
        {!loading && !error && orders && `Order history loaded. ${orders.length} orders found.`}
      </div>
      <Routes>
        <Route index element={<PartyList orders={orders} loading={loading} error={error} onRetry={fetchOrders} />} />
        <Route path=":partyName" element={<PartyOrderList orders={orders} loading={loading} error={error} onRetry={fetchOrders} />} />
        <Route path=":partyName/:orderId" element={<OrderDetail orders={orders} loading={loading} error={error} onRetry={fetchOrders} />} />
      </Routes>
    </>
  );
}

// 1. Party List View
function PartyList({ orders, loading, error, onRetry }: { orders: DBOrder[] | null, loading: boolean, error: string | null, onRetry: () => void }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const searchTerm = searchParams.get('q') || '';
  const sortField = (searchParams.get('sort') as PartySortField) || 'lastOrderDate';
  const sortDirection = (searchParams.get('dir') as SortDirection) || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const ITEMS_PER_PAGE = 20;

  const [localSearch, setLocalSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (localSearch) {
          newParams.set('q', localSearch);
        } else {
          newParams.delete('q');
        }
        if (localSearch !== searchTerm) {
          newParams.set('page', '1');
        }
        return newParams;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchParams, searchTerm]);

  const safeOrders = orders || [];
  const hasEverLoaded = orders !== null;

  const partySummaries: PartySummary[] = useMemo(() => Object.values(
    safeOrders.reduce((acc, order) => {
      if (!acc[order.partyName]) {
        acc[order.partyName] = {
          partyName: order.partyName,
          location: order.location,
          totalOrders: 0,
          totalWeight: 0,
          lastOrderDate: order.date
        };
      }
      acc[order.partyName].totalOrders += 1;
      acc[order.partyName].totalWeight += order.totalWeight;
      if (new Date(order.date) > new Date(acc[order.partyName].lastOrderDate)) {
        acc[order.partyName].lastOrderDate = order.date;
      }
      return acc;
    }, {} as Record<string, PartySummary>)
  ), [orders]);

  const sortedParties = useMemo(() => {
    const filtered = partySummaries.filter(party => 
      party.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      party.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'partyName': comparison = a.partyName.localeCompare(b.partyName); break;
        case 'location': comparison = a.location.localeCompare(b.location); break;
        case 'totalOrders': comparison = a.totalOrders - b.totalOrders; break;
        case 'totalWeight': comparison = a.totalWeight - b.totalWeight; break;
        case 'lastOrderDate': comparison = new Date(a.lastOrderDate).getTime() - new Date(b.lastOrderDate).getTime(); break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [partySummaries, searchTerm, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedParties.length / ITEMS_PER_PAGE));
  const validPage = Math.max(1, Math.min(page, totalPages));
  
  const paginatedParties = useMemo(() => {
    const startIdx = (validPage - 1) * ITEMS_PER_PAGE;
    return sortedParties.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [sortedParties, validPage]);

  const handleSort = (field: PartySortField) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (field === sortField) {
        newParams.set('dir', sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        newParams.set('sort', field);
        newParams.set('dir', field === 'lastOrderDate' ? 'desc' : 'asc');
      }
      newParams.set('page', '1');
      return newParams;
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', newPage.toString());
      return newParams;
    });
  };

  const renderSortIcon = (field: PartySortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/30" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-secondary" />
      : <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-secondary" />;
  };

  const ariaSort = (field: PartySortField) => {
    if (sortField !== field) return "none";
    return sortDirection === 'asc' ? "ascending" : "descending";
  };

  if (error && !hasEverLoaded) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full">
        <ServerCrash className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{error}</p>
        <p className="text-sm text-muted-foreground w-full max-w-sm">
          Please check your connection or wait a few moments and try again.
        </p>
      </div>
      <Button onClick={onRetry} disabled={loading} className="mt-2">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        Retry Connection
      </Button>
    </div>
  );

  if (loading && !hasEverLoaded) return <LoadingState />;

  if (safeOrders.length === 0 && !searchTerm) {
    return (
      <div className="p-4 lg:p-8 w-full md:h-[calc(100vh-140px)] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center max-w-sm space-y-6 text-center border border-border bg-card p-8 lg:p-12 rounded-2xl shadow-sm">
          <div className="bg-secondary/10 p-5 rounded-full">
            <PackageOpen className="h-10 w-10 text-secondary" />
          </div>
          <div className="space-y-2">
             <h1 className="text-2xl font-semibold tracking-tight">No orders yet</h1>
             <p className="text-muted-foreground text-sm">Your order history is empty. Start by creating a new incoming order.</p>
          </div>
          <Button onClick={() => navigate('/')} size="lg" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create First Order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order History by Party</h1>
          <p className="text-muted-foreground text-sm">
            Select a party to view their order history and contents.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input 
            type="search"
            aria-label="Search party or location"
            placeholder="Search party or location…"
            className="pl-8 bg-background pr-10"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {localSearch && (
            <button 
              aria-label="Clear search"
              onClick={() => {
                setLocalSearch("");
                setSearchParams(prev => {
                  const p = new URLSearchParams(prev);
                  p.delete('q');
                  return p;
                });
              }}
              className="absolute right-2 top-1.5 h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead aria-sort={ariaSort('partyName')}>
                <button 
                  className="flex items-center w-full hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
                  onClick={() => handleSort('partyName')}
                >
                  Party Name {renderSortIcon('partyName')}
                </button>
              </TableHead>
              <TableHead aria-sort={ariaSort('location')}>
                <button 
                  className="flex items-center w-full hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
                  onClick={() => handleSort('location')}
                >
                  Location {renderSortIcon('location')}
                </button>
              </TableHead>
              <TableHead aria-sort={ariaSort('lastOrderDate')}>
                <button 
                  className="flex items-center w-full hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
                  onClick={() => handleSort('lastOrderDate')}
                >
                  Last Order {renderSortIcon('lastOrderDate')}
                </button>
              </TableHead>
              <TableHead className="text-right" aria-sort={ariaSort('totalOrders')}>
                <button 
                  className="flex items-center justify-end w-full hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
                  onClick={() => handleSort('totalOrders')}
                >
                  Total Orders {renderSortIcon('totalOrders')}
                </button>
              </TableHead>
              <TableHead className="text-right" aria-sort={ariaSort('totalWeight')}>
                <button 
                  className="flex items-center justify-end w-full hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
                  onClick={() => handleSort('totalWeight')}
                >
                  Total Weight {renderSortIcon('totalWeight')}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedParties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-[400px] text-center">
                  <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                    <div className="bg-muted p-4 rounded-full">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-medium text-foreground">No matches found</p>
                      <p className="text-sm">No parties matched "{searchTerm}"</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setLocalSearch("");
                        setSearchParams(prev => {
                          const p = new URLSearchParams(prev);
                          p.delete('q');
                          return p;
                        });
                      }}
                      className="mt-2"
                    >
                      Clear Search
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedParties.map(party => (
                <TableRow 
                  key={party.partyName} 
                  className="cursor-pointer hover:bg-muted/50 group" 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    navigate(`/history/${encodeURIComponent(party.partyName)}?${params.toString()}`);
                  }}
                >
                  <TableCell className="font-medium text-secondary">{party.partyName}</TableCell>
                  <TableCell className="text-muted-foreground">{party.location}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(party.lastOrderDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right font-medium">{party.totalOrders}</TableCell>
                  <TableCell className="text-right font-medium text-secondary">
                    {party.totalWeight.toFixed(2)} q
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(validPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(validPage * ITEMS_PER_PAGE, sortedParties.length)}</span> of <span className="font-medium">{sortedParties.length}</span> parties
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11 sm:h-9 px-4"
              onClick={() => handlePageChange(validPage - 1)}
              disabled={validPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm font-medium px-2">
              Page {validPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              className="h-11 sm:h-9 px-4"
              onClick={() => handlePageChange(validPage + 1)}
              disabled={validPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Party Order List View
function PartyOrderList({ orders, loading, error, onRetry }: { orders: DBOrder[] | null, loading: boolean, error: string | null, onRetry: () => void }) {
  const { partyName } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const safeOrders = orders || [];
  const hasEverLoaded = orders !== null;

  const partyOrders = useMemo(() => 
    safeOrders.filter(o => o.partyName === partyName).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
    [safeOrders, partyName]
  );

  const handleBack = () => {
    navigate(`/history?${searchParams.toString()}`);
  };

  const handleOrderClick = (orderId: number) => {
    navigate(`/history/${encodeURIComponent(partyName!)}/${orderId}?${searchParams.toString()}`);
  };

  if (error && !hasEverLoaded) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full">
        <ServerCrash className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{error}</p>
        <p className="text-sm text-muted-foreground w-full max-w-sm">
          Please check your connection or wait a few moments and try again.
        </p>
      </div>
      <Button onClick={onRetry} disabled={loading} className="mt-2">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        Retry Connection
      </Button>
    </div>
  );

  if (loading && !hasEverLoaded) return <LoadingState />;

  if (safeOrders.length === 0) {
    return (
      <div className="p-4 lg:p-8 w-full space-y-6">
        <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center border border-border bg-card rounded-xl shadow-sm">
           <PackageOpen className="h-10 w-10 text-muted-foreground/50" />
           <div className="space-y-1">
             <h1 className="text-xl font-semibold tracking-tight">No orders yet</h1>
             <p className="text-muted-foreground text-sm">Create the first order to see it here.</p>
           </div>
           <Button onClick={() => navigate('/')} className="mt-2">Create order</Button>
        </div>
      </div>
    );
  }

  if (partyOrders.length === 0) {
    return (
      <div className="p-4 lg:p-8 w-full space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleBack} aria-label="Go back to order history">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Party not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleBack} aria-label="Go back to order history">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Orders: {partyName}</h1>
            <p className="text-muted-foreground text-sm">
              Review all orders placed by this party.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[100px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead className="text-right">Total Bags</TableHead>
              <TableHead className="text-right">Total Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partyOrders.map(order => {
              const totalBags = order.items.reduce((sum, i) => sum + i.quantity, 0);
              return (
                <TableRow 
                  key={order.id} 
                  className="group hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <TableCell className="font-medium text-secondary">
                    #{order.id}
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(order.date), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-secondary/10 text-secondary border-none">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{order.items.length}</TableCell>
                  <TableCell className="text-right font-medium">{totalBags}</TableCell>
                  <TableCell className="text-right font-medium text-secondary">
                    {(order.totalWeight).toFixed(2)} Qtl
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// 3. Individual Order Detail View
function OrderDetail({ orders, loading, error, onRetry }: { orders: DBOrder[] | null, loading: boolean, error: string | null, onRetry: () => void }) {
  const { partyName, orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleBack = () => {
    navigate(`/history/${encodeURIComponent(partyName!)}?${searchParams.toString()}`);
  };

  const safeOrders = orders || [];
  const hasEverLoaded = orders !== null;

  const order = useMemo(() => 
    safeOrders.find(o => o.id === Number(orderId)), 
    [safeOrders, orderId]
  );

  if (error && !hasEverLoaded) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full">
        <ServerCrash className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">{error}</p>
        <p className="text-sm text-muted-foreground w-full max-w-sm">
          Please check your connection or wait a few moments and try again.
        </p>
      </div>
      <Button onClick={onRetry} disabled={loading} className="mt-2">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        Retry Connection
      </Button>
    </div>
  );

  if (loading && !hasEverLoaded) return <LoadingState />;

  if (!order) {
    return (
      <div className="p-4 lg:p-8 w-full space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleBack} aria-label="Go back to order history">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Order not found</h1>
        </div>
      </div>
    );
  }

  const totalBags = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleRepeatOrder = () => {
    const newItems: OrderItem[] = order.items.map(dbItem => {
      const product = PRODUCTS.find(p => p.name === dbItem.product);
      const pkg = PACKAGING.find(p => p.weightKg === dbItem.packaging);
      
      let _invalid = false;
      let _invalidReason = undefined;

      if (!product || !pkg) {
        _invalid = true;
        _invalidReason = 'Product or packaging no longer available in catalog';
        
        // Still attempt to salvage what we can for UI display
        return {
          id: Math.random().toString(36).substring(7),
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
          _invalid,
          _invalidReason,
        };
      }

      const feedType = FEED_TYPES.find(f => f.id === product.feedTypeId);
      const category = CATEGORIES.find(c => c.id === feedType?.categoryId);
      const brand = BRANDS.find(b => b.id === product.brandId);

      return {
        id: Math.random().toString(36).substring(7),
        brandId: brand?.id || '',
        brandName: brand?.name || dbItem.brand,
        categoryId: category?.id || '',
        categoryName: category?.name || dbItem.category,
        feedTypeId: feedType?.id || '',
        feedTypeName: feedType?.name || dbItem.feedType,
        productId: product.id,
        productName: product.name,
        packagingId: pkg.id,
        packagingName: pkg.name,
        packagingWeightKg: pkg.weightKg,
        quantity: dbItem.quantity,
        weightQuintals: dbItem.weight,
        _invalid,
        _invalidReason,
      };
    });

    const draft = {
      partyName: order.partyName,
      location: order.location,
      items: newItems,
      isRepeat: true
    };

    localStorage.setItem('new_order_draft', JSON.stringify(draft));
    navigate('/');
  };

  return (
    <div className="p-4 lg:p-8 w-full space-y-6 max-w-[1000px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={handleBack} className="shrink-0" aria-label="Go back to party orders">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <PackageOpen className="h-5 w-5 text-muted-foreground" />
              Order #{order.id}
            </h1>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{order.partyName}</span>
              <span>•</span>
              <span>{order.location}</span>
              <span>•</span>
              <span>{format(new Date(order.date), "PPP p")}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="bg-secondary/10 text-secondary border-none px-3 py-1.5 text-sm">
            {order.status}
          </Badge>
          <Button variant="outline" className="h-11 sm:h-9 px-4" onClick={handleRepeatOrder}>
            <Copy className="h-4 w-4 mr-2" />
            Repeat order
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Product details</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map(item => (
              <TableRow key={item.id} className="hover:bg-transparent">
                <TableCell>
                  <div className="font-medium text-sm">{item.product}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {item.brand} • {item.category} • {item.feedType}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{item.packaging}kg</TableCell>
                <TableCell className="text-right font-medium text-sm">{item.quantity}</TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {item.weight.toFixed(2)} Qtl
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="bg-muted/50 p-4 flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4 border-t border-border">
          <div className="text-sm font-medium text-foreground flex items-center gap-2">
            <span>Total items:</span>
            <span className="text-muted-foreground font-normal">{totalBags} bags</span>
          </div>
          <div className="text-sm flex flex-col sm:items-end">
            <span className="text-muted-foreground text-xs font-semibold mb-0.5">Total weight</span>
            <span className="font-bold text-2xl text-secondary flex items-baseline gap-1">
              {order.totalWeight.toFixed(2)} <span className="text-sm text-muted-foreground font-normal">Qtl</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4 text-muted-foreground">
      <Loader2 className="h-8 w-8 text-secondary animate-spin" />
      <p className="text-sm font-medium">Loading…</p>
    </div>
  );
}
