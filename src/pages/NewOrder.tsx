import { useState, useRef, useEffect } from "react";
import { OrderItem } from "@/src/types";
import { getBrands, getCategories, getFeedTypes, getProducts, getPackaging, PARTIES } from "@/src/lib/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Search, Plus, Trash2, Save, ChevronsUpDown, Check, AlertCircle, Pencil, ShoppingCart, Loader2, X, Undo, CheckCircle2, ArrowRight, Printer, AlertTriangle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/src/lib/auth";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder,
  id,
  allowCreation = false,
  onCreate,
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  id?: string;
  allowCreation?: boolean;
  onCreate?: (val: string) => void;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [inputValue, open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const parent = inputRef.current?.parentElement;
      if (parent && !parent.contains(e.target as Node)) {
        setOpen(false);
        setInputValue(value);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, value]);

  const exactMatchExists = options.some(o => o.toLowerCase() === inputValue.toLowerCase().trim());
  const showCreateOption = allowCreation && inputValue.trim().length > 0 && !exactMatchExists;
  
  const filtered = options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()));
  const totalOptions = filtered.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    if (open && focusedIndex >= 0) {
      const listElement = document.getElementById(`autocomplete-list-${id}`);
      const activeElement = document.getElementById(`autocomplete-item-${id}-${focusedIndex}`);
      if (listElement && activeElement) {
        const listRect = listElement.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        
        if (activeRect.bottom > listRect.bottom) {
          listElement.scrollTop += activeRect.bottom - listRect.bottom;
        } else if (activeRect.top < listRect.top) {
          listElement.scrollTop -= listRect.top - activeRect.top;
        }
      }
    }
  }, [focusedIndex, open, id]);

  const announcement = open 
    ? `${totalOptions} result${totalOptions === 1 ? '' : 's'} available.`
    : '';

  return (
    <div className="relative w-full">
      <div className="sr-only" aria-live="polite">{announcement}</div>
      <Input 
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`autocomplete-list-${id}`}
        aria-activedescendant={open && focusedIndex >= 0 ? `autocomplete-item-${id}-${focusedIndex}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        ref={inputRef}
        aria-invalid={ariaInvalid}
        value={inputValue} 
        onChange={e => {
          setInputValue(e.target.value);
          setOpen(true);
        }} 
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setOpen(true);
            }
            return;
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => prev < totalOptions - 1 ? prev + 1 : prev);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
          } else if (e.key === 'Home') {
            e.preventDefault();
            setFocusedIndex(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            setFocusedIndex(totalOptions - 1);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setInputValue(value);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < filtered.length) {
              onChange(filtered[focusedIndex]);
            } else if (focusedIndex === filtered.length && showCreateOption) {
              const newVal = inputValue.trim();
              onChange(newVal);
              onCreate?.(newVal);
            } else if (filtered.length > 0 && !showCreateOption && focusedIndex === -1 && exactMatchExists) {
               onChange(inputValue.trim());
            } else if (inputValue.trim().length > 0) {
               onChange(inputValue.trim());
               onCreate?.(inputValue.trim());
            }
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={`w-full pr-8 bg-card border-input focus-visible:ring-ring ${ariaInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Toggle options"
        className="absolute right-0 top-0 h-full w-8 hover:bg-transparent text-muted-foreground p-0 pointer-events-auto"
        onClick={(e) => {
          e.preventDefault();
          if (document.activeElement !== inputRef.current) {
            inputRef.current?.focus();
          } else {
            if (open) {
              setOpen(false);
              setInputValue(value);
            } else {
              setOpen(true);
            }
          }
        }}
        tabIndex={-1}
      >
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </Button>
      {open && (
        <div 
          id={`autocomplete-list-${id}`}
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full z-50 bg-popover text-popover-foreground rounded-lg border border-border shadow-md outline-hidden max-h-[200px] overflow-y-auto p-1"
        >
          {totalOptions === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            <>
            {filtered.map((opt, index) => {
              const isSelected = value === opt;
              const isFocused = index === focusedIndex;
              return (
                <div 
                  key={opt}
                  role="option"
                  id={`autocomplete-item-${id}-${index}`}
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    inputRef.current?.focus();
                  }}
                  className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden ${isFocused ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  {opt}
                  {isSelected && <Check className="ml-auto h-4 w-4 text-secondary" />}
                </div>
              );
            })}
            {showCreateOption && (
              <div 
                role="option"
                id={`autocomplete-item-${id}-${filtered.length}`}
                aria-selected={false}
                onClick={() => {
                  const newVal = inputValue.trim();
                  onChange(newVal);
                  onCreate?.(newVal);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden text-secondary font-medium ${focusedIndex === filtered.length ? 'bg-secondary/10' : ''}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Use "{inputValue.trim()}"
              </div>
            )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProductSearchAutocomplete({
  searchQuery,
  onSearchQueryChange,
  onSelectProduct,
}: {
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onSelectProduct: (productId: string, packagingId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text;
    const terms = query.toLowerCase().split(' ').filter(Boolean);
    if (terms.length === 0) return text;

    const regex = new RegExp(`(${terms.map(t => escapeRegExp(t)).join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-primary/20 text-foreground font-semibold rounded-[2px] px-0.5">{part}</span> : part
    );
  };

  const options = getProducts().map(prod => {
    const feedType = getFeedTypes().find(ft => ft.id === prod.feedTypeId);
    const category = getCategories().find(c => c.id === feedType?.categoryId);
    const brand = getBrands().find(b => b.id === prod.brandId);

    const nameText = prod.name;
    const subText = `${brand?.name} • ${category?.name} • ${feedType?.name}`;

    return {
        productId: prod.id,
        searchText: `${prod.name} ${brand?.name || ''} ${category?.name || ''} ${feedType?.name || ''} ${prod.id}`,
        nameText,
        subText,
    };
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const parent = inputRef.current?.closest('.product-search-container');
      if (parent && !parent.contains(e.target as Node)) {
        setOpen(false);
        if (searchQuery) onSearchQueryChange('');
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, searchQuery, onSearchQueryChange]);

  const filtered = searchQuery
    ? options.filter(o => {
        const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
        const searchString = o.searchText.toLowerCase();
        return searchTerms.every(term => searchString.includes(term));
      }).slice(0, 50)
    : options.slice(0, 10);

  useEffect(() => {
    if (open && focusedIndex >= 0) {
      const listElement = document.getElementById(`product-search-list`);
      const activeElement = document.getElementById(`product-search-item-${focusedIndex}`);
      if (listElement && activeElement) {
        const listRect = listElement.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();
        
        if (activeRect.bottom > listRect.bottom) {
          listElement.scrollTop += activeRect.bottom - listRect.bottom;
        } else if (activeRect.top < listRect.top) {
          listElement.scrollTop -= listRect.top - activeRect.top;
        }
      }
    }
  }, [focusedIndex, open]);

  const announcement = open 
    ? `${filtered.length} result${filtered.length === 1 ? '' : 's'} available.`
    : '';

  return (
    <div className="relative w-full sm:w-80 product-search-container">
      <div className="sr-only" aria-live="polite">{announcement}</div>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" aria-hidden="true" />
      <Input 
        id="product-search-input"
        aria-label="Search for a product to add to the order"
        role="combobox"
        aria-expanded={open}
        aria-controls="product-search-list"
        aria-activedescendant={open && focusedIndex >= 0 ? `product-search-item-${focusedIndex}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        ref={inputRef}
        value={searchQuery} 
        onChange={e => {
          onSearchQueryChange(e.target.value);
          setOpen(true);
        }} 
        onFocus={() => { setOpen(true) }}
        onKeyDown={(e) => {
          if (!open) {
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
              e.preventDefault();
              setOpen(true);
            }
            return;
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
          } else if (e.key === 'Home') {
            e.preventDefault();
            setFocusedIndex(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            setFocusedIndex(filtered.length - 1);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            if (searchQuery) onSearchQueryChange('');
            inputRef.current?.blur();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered.length > 0) {
              const opt = focusedIndex >= 0 && focusedIndex < filtered.length ? filtered[focusedIndex] : filtered[0];
              onSelectProduct(opt.productId, undefined);
              onSearchQueryChange('');
              setOpen(false);
              inputRef.current?.blur();
            }
          }
        }}
        placeholder="Quick search products/SKUs…"
        className="w-full bg-background pl-9 h-9 font-normal focus-visible:ring-ring border-input"
      />
      {open && (
        <div 
          id="product-search-list"
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full sm:w-[500px] z-50 bg-popover text-popover-foreground rounded-lg border border-border shadow-md outline-hidden max-h-[300px] overflow-y-auto p-1"
        >
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No products found.
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {!searchQuery ? "Recent Products" : "Search Results"}
              </div>
              {filtered.map((opt, index) => {
                const isFocused = index === focusedIndex;
                return (
                  <div 
                    key={`${opt.productId}-${index}`}
                    role="option"
                    id={`product-search-item-${index}`}
                    aria-selected={isFocused}
                    onClick={() => {
                      onSelectProduct(opt.productId, undefined);
                      onSearchQueryChange('');
                      setOpen(false);
                      inputRef.current?.blur();
                    }}
                    className={`relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-hidden ${isFocused ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{highlightMatch(opt.nameText, searchQuery)}</span>
                      <span className="text-xs text-muted-foreground">{highlightMatch(opt.subText, searchQuery)}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface QuickAddItem {
  productId: string;
  packagingId?: string;
}

const GLOBAL_QUICK_ADDS: QuickAddItem[] = [
  { productId: 'p1', packagingId: 'pkg-50' },
  { productId: 'p3' },
  { productId: 'p4', packagingId: 'pkg-50' },
];

const PARTY_QUICK_ADDS: Record<string, QuickAddItem[]> = {
  "Ravi Enterprises": [
    { productId: 'p1', packagingId: 'pkg-50' },
    { productId: 'p2' },
  ],
  "Sharma Dairy Farms": [
    { productId: 'p3' },
    { productId: 'p5', packagingId: 'pkg-25' },
  ],
};

export function NewOrder() {
  const navigate = useNavigate();
  const { getToken, user } = useAuth();
  
  // Step-by-Step wizard control: 1 = Party, 2 = Items, 3 = Review
  const [step, setStep] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Draft states
  const [draftId, setDraftId] = useState<number | null>(null);
  const [serverDraftBanner, setServerDraftBanner] = useState<any>(null);
  const [adminRemarks, setAdminRemarks] = useState<string | null>(null);

  // Form states
  const [items, setItems] = useState<OrderItem[]>([]);
  const [partyName, setPartyName] = useState("");
  const [location, setLocation] = useState("");
  
  // Autocomplete metadata states
  const [createdParties, setCreatedParties] = useState<string[]>([]);
  const [createdLocations, setCreatedLocations] = useState<Record<string, string[]>>({});
  const [previousParties, setPreviousParties] = useState<string[]>([]);
  const [previousLocations, setPreviousLocations] = useState<Record<string, string[]>>({});

  // Submitting States
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'validating' | 'saving' | 'saved' | 'validation_error' | 'save_error'>('idle');
  const [submitMessage, setSubmitMessage] = useState("");
  const [formErrors, setFormErrors] = useState<{partyName?: string, location?: string}>({});
  const [partyLocationVerified, setPartyLocationVerified] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [savedOrderDetails, setSavedOrderDetails] = useState<{
    id: number;
    partyName: string;
    location: string;
    totalBags: number;
    totalWeight: number;
    totalValue: number;
    date: string;
    items: OrderItem[];
  } | null>(null);

  const isDirty = items.length > 0 || partyName.trim() !== '' || location.trim() !== '';

  const partyOptions = Array.from(new Set([...PARTIES.map(p => p.name), ...previousParties, ...createdParties]));
  const currentPartyObj = PARTIES.find(p => p.name === partyName);
  
  const locationOptionsForParty = partyName 
    ? Array.from(new Set([
        ...(currentPartyObj ? currentPartyObj.locations : []),
        ...(previousLocations[partyName] || []),
        ...(createdLocations[partyName] || [])
      ]))
    : [];

  // Check localStorage first (for edit/resubmit redirect), then check server drafts on mount
  useEffect(() => {
    const initData = async () => {
      // 1. Check local storage first
      const rawDraft = localStorage.getItem('new_order_draft');
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft);
          if (draft && (draft.partyName || draft.location || (draft.items && draft.items.length > 0))) {
            if (draft.partyName) setPartyName(draft.partyName);
            if (draft.location) setLocation(draft.location);
            if (draft.items) setItems(draft.items);
            if (draft.id) setDraftId(draft.id);
            if (draft.adminRemarks) setAdminRemarks(draft.adminRemarks);
            localStorage.removeItem('new_order_draft'); // clear immediately
            setStep(2); // Jump directly to products step
            return; // skip server drafts check
          }
        } catch (e) {
          // ignore
        }
      }

      // 2. Query history to load autocompletes & check unfinished drafts on server
      const token = await getToken();
      if (!token) return;
      try {
        const res = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const ordersData = await res.json();
          if (Array.isArray(ordersData)) {
            const pList: string[] = [];
            const lMap: Record<string, string[]> = {};
            ordersData.forEach((o: any) => {
              if (o.partyName) pList.push(o.partyName);
              if (o.partyName && o.location) {
                if (!lMap[o.partyName]) lMap[o.partyName] = [];
                if (!lMap[o.partyName].includes(o.location)) {
                  lMap[o.partyName].push(o.location);
                }
              }
            });
            setPreviousParties(Array.from(new Set(pList)));
            setPreviousLocations(lMap);

            const draft = ordersData.find((o: any) => o.status === 'draft' && o.createdBy === user?.email);
            if (draft) {
              setServerDraftBanner(draft);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch history:", e);
      }
    };
    initData();
  }, [getToken, user]);

  const loadDraftIntoForm = (draft: any) => {
    setDraftId(draft.id);
    setPartyName(draft.partyName);
    setLocation(draft.location);
    setAdminRemarks(draft.adminRemarks || null);

    const clientItems = draft.items.map((i: any) => ({
      id: crypto.randomUUID(),
      brandId: '',
      brandName: i.brand,
      categoryId: '',
      categoryName: i.category,
      feedTypeId: '',
      feedTypeName: i.feedType,
      productId: '',
      productName: i.product,
      packagingId: '',
      packagingName: `${i.packaging}kg Bag`,
      packagingWeightKg: i.packaging,
      quantity: i.quantity,
      weightQuintals: i.weight,
      pricingBasis: i.pricingBasis || 'per_bag',
      enteredRate: i.enteredRate || 0,
      calculatedBagRate: i.calculatedBagRate || 0,
      calculatedLineValue: i.calculatedLineValue || 0,
    }));
    setItems(clientItems);
    setServerDraftBanner(null);
    setStep(2);
  };

  const handleDiscardServerDraft = async (dId: number) => {
    const token = await getToken();
    if (!token) return;
    try {
      await fetch(`/api/orders?id=${dId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setServerDraftBanner(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Autoselect location if there is only 1 option
  useEffect(() => {
    if (!partyName) {
      if (location) setLocation('');
      return;
    }
    
    if (locationOptionsForParty.length === 1 && location !== locationOptionsForParty[0]) {
      setLocation(locationOptionsForParty[0]);
    } else if (locationOptionsForParty.length > 0 && location && !locationOptionsForParty.includes(location)) {
      setLocation('');
    }
  }, [partyName]);

  // Form State Cascading Variables
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedFeedTypeId, setSelectedFeedTypeId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>("");
  
  // Pricing states
  const [pricingBasis, setPricingBasis] = useState<'per_bag' | 'per_quintal'>('per_bag');
  const [enteredRate, setEnteredRate] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");

  // Edit in list states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>("");
  const [editingRate, setEditingRate] = useState<string>("");
  const [editingPricingBasis, setEditingPricingBasis] = useState<'per_bag' | 'per_quintal'>('per_bag');

  const [lastDeletedItem, setLastDeletedItem] = useState<{ item: OrderItem, index: number } | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [mergeAnnouncement, setMergeAnnouncement] = useState("");

  const quantityRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Available options helpers
  const availableBrands = getBrands();

  const allProductsForBrand = selectedBrandId ? getProducts(selectedBrandId) : [];
  const validFeedTypeIdsForBrand = new Set(allProductsForBrand.map(p => p.feedTypeId));
  
  const availableCategories = selectedBrandId ? getCategories().filter(c => {
    const feedTypesForCat = getFeedTypes(c.id);
    return feedTypesForCat.some(ft => validFeedTypeIdsForBrand.has(ft.id));
  }) : [];

  const availableFeedTypes = selectedCategoryId ? getFeedTypes(selectedCategoryId).filter(ft => {
    return validFeedTypeIdsForBrand.has(ft.id);
  }) : [];

  const availableProducts = selectedFeedTypeId ? getProducts(selectedBrandId, selectedFeedTypeId) : [];
  const availablePackaging = selectedProductId ? getPackaging().filter(pkg => !pkg.productId || pkg.productId === selectedProductId) : [];

  // Reset Quantity when Packaging size or Product is changed
  useEffect(() => {
    setQuantity("");
  }, [selectedPackagingId, selectedProductId]);

  // Reset search when brand changes
  useEffect(() => {
    setSearchQuery("");
  }, [selectedBrandId]);

  // Wizard cascade auto-selection logic
  useEffect(() => {
    if (selectedBrandId && !selectedCategoryId && availableCategories.length === 1) {
      setSelectedCategoryId(availableCategories[0].id);
    }
  }, [selectedBrandId, selectedCategoryId, availableCategories]);

  useEffect(() => {
    if (selectedCategoryId && !selectedFeedTypeId && availableFeedTypes.length === 1) {
      setSelectedFeedTypeId(availableFeedTypes[0].id);
    }
  }, [selectedCategoryId, selectedFeedTypeId, availableFeedTypes]);

  useEffect(() => {
    if (selectedFeedTypeId && !selectedProductId && availableProducts.length === 1) {
      setSelectedProductId(availableProducts[0].id);
    }
  }, [selectedFeedTypeId, selectedProductId, availableProducts]);

  useEffect(() => {
    if (selectedProductId && !selectedPackagingId) {
      if (availablePackaging.length === 1) {
        setSelectedPackagingId(availablePackaging[0].id);
      } else if (availablePackaging.some(p => p.id === "pkg-50")) {
        setSelectedPackagingId("pkg-50");
      }
    }
  }, [selectedProductId, selectedPackagingId, availablePackaging]);

  // Pricing calculations
  const currentPkg = getPackaging().find(p => p.id === selectedPackagingId);
  const rateNum = parseFloat(enteredRate) || 0;
  const qtyNum = parseInt(quantity, 10) || 0;
  
  const calculatedBagRate = currentPkg 
    ? pricingBasis === 'per_bag' 
      ? rateNum 
      : rateNum * (currentPkg.weightKg / 100)
    : 0;

  const derivedLineValue = calculatedBagRate * qtyNum;
  
  const derivedQuintals = currentPkg && qtyNum > 0 ? ((qtyNum * currentPkg.weightKg) / 100).toFixed(2) : "0.00";
  const derivedKg = currentPkg && qtyNum > 0 ? (qtyNum * currentPkg.weightKg) : 0;
  
  const totalOrderWeight = items.reduce((sum, item) => sum + item.weightQuintals, 0);
  const totalOrderValue = items.reduce((sum, item) => sum + (item.calculatedLineValue || 0), 0);

  const quickAddItems = partyName && PARTY_QUICK_ADDS[partyName] 
    ? PARTY_QUICK_ADDS[partyName] 
    : GLOBAL_QUICK_ADDS;

  const handleBrandChange = (val: string) => {
    setSelectedBrandId(val);
    setSelectedCategoryId("");
    setSelectedFeedTypeId("");
    setSelectedProductId("");
    setSelectedPackagingId("");
    setQuantity("");
    setSearchQuery("");
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategoryId(val);
    setSelectedFeedTypeId("");
    setSelectedProductId("");
    setSelectedPackagingId("");
    setQuantity("");
    setSearchQuery("");
  };

  const handleFeedTypeChange = (val: string) => {
    setSelectedFeedTypeId(val);
    setSelectedProductId("");
    setSelectedPackagingId("");
    setQuantity("");
    setSearchQuery("");
  };

  const handleProductChange = (val: string) => {
    setSelectedProductId(val);
    setSelectedPackagingId("");
    setQuantity("");
    setSearchQuery("");
  };

  // Focus rate input once packaging is selected
  useEffect(() => {
    if (selectedProductId && selectedPackagingId) {
      document.getElementById('rate-input')?.focus();
    }
  }, [selectedProductId, selectedPackagingId]);

  const handleAutocompleteSelect = (productId: string, packagingId?: string) => {
    setSearchQuery("");
    const prod = getProducts().find(p => p.id === productId);
    if (prod) {
      const feedType = getFeedTypes().find(ft => ft.id === prod.feedTypeId);
      if (feedType) {
        setSelectedBrandId(prod.brandId);
        setSelectedCategoryId(feedType.categoryId);
        setSelectedFeedTypeId(feedType.id);
        setSelectedProductId(prod.id);
        
        const validPackagings = getPackaging().filter(pkg => !pkg.productId || pkg.productId === prod.id);

        if (packagingId) {
          setSelectedPackagingId(packagingId);
          setTimeout(() => quantityRef.current?.focus(), 100);
        } else {
           if (!selectedPackagingId || !validPackagings.some(p => p.id === selectedPackagingId)) {
             if (validPackagings.length === 1) {
               setSelectedPackagingId(validPackagings[0].id);
               setTimeout(() => quantityRef.current?.focus(), 100);
             } else {
               setSelectedPackagingId("");
               setTimeout(() => document.getElementById('packaging-trigger')?.focus(), 100);
             }
           } else {
             setTimeout(() => quantityRef.current?.focus(), 100);
           }
        }
      }
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId || !selectedPackagingId || !quantity) return;

    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) return;

    const product = getProducts().find(p => p.id === selectedProductId);
    if (!product) return;

    const feedType = getFeedTypes().find(ft => ft.id === product.feedTypeId)!;
    const category = getCategories().find(c => c.id === feedType.categoryId)!;
    const brand = getBrands().find(b => b.id === product.brandId)!;
    const packaging = getPackaging().find(p => p.id === selectedPackagingId)!;
    
    const existingIndex = items.findIndex(
      i => i.productId === product.id && i.packagingId === packaging.id
    );

    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      const newQty = existing.quantity + qtyVal;
      const newWeight = (newQty * packaging.weightKg) / 100;
      
      const newItems = [...items];
      newItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        weightQuintals: newWeight,
        calculatedLineValue: (existing.calculatedBagRate || 0) * newQty,
      };
      
      setItems(newItems);
      setHighlightedItemId(existing.id);
      setMergeAnnouncement(`Merged ${qtyVal} bags into existing line. New total: ${newQty} bags.`);
      setTimeout(() => setHighlightedItemId(null), 3000);
    } else {
      const weight = (qtyVal * packaging.weightKg) / 100;
      const newItem: OrderItem = {
        id: crypto.randomUUID(),
        brandId: brand.id,
        brandName: brand.name,
        categoryId: category.id,
        categoryName: category.name,
        feedTypeId: feedType.id,
        feedTypeName: feedType.name,
        productId: product.id,
        productName: product.name,
        packagingId: packaging.id,
        packagingName: packaging.name,
        packagingWeightKg: packaging.weightKg,
        quantity: qtyVal,
        weightQuintals: weight,
        pricingBasis,
        enteredRate: rateNum,
        calculatedBagRate,
        calculatedLineValue: derivedLineValue,
      };
      setItems([...items, newItem]);
    }
    
    setSelectedFeedTypeId("");
    setSelectedProductId("");
    setSelectedPackagingId("");
    setQuantity("");
    setEnteredRate("");
    setSearchQuery("");

    setTimeout(() => {
      document.getElementById('product-search-input')?.focus();
    }, 0);
  };

  const handleRemoveItem = (itemToRemove: OrderItem, index: number) => {
    setLastDeletedItem({ item: itemToRemove, index });
    setItems(items.filter(i => i.id !== itemToRemove.id));
    setTimeout(() => {
      setLastDeletedItem(prev => (prev?.item.id === itemToRemove.id ? null : prev));
    }, 6000);
  };

  const handleUndoRemove = () => {
    if (!lastDeletedItem) return;
    const newItems = [...items];
    newItems.splice(lastDeletedItem.index, 0, lastDeletedItem.item);
    setItems(newItems);
    const idToFocus = lastDeletedItem.item.id;
    setLastDeletedItem(null);
    setTimeout(() => {
      document.getElementById(`edit-btn-${idToFocus}-desktop`)?.focus();
    }, 10);
  };

  const startEditing = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditingQuantity(item.quantity.toString());
    setEditingRate(item.enteredRate?.toString() || "");
    setEditingPricingBasis(item.pricingBasis || "per_bag");
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const saveEditing = (item: OrderItem) => {
    const qty = parseInt(editingQuantity, 10);
    const rateVal = parseFloat(editingRate) || 0;
    if (isNaN(qty) || qty <= 0) {
      setEditingItemId(null);
      return;
    }

    const nextBagRate = editingPricingBasis === 'per_bag' 
      ? rateVal 
      : rateVal * (item.packagingWeightKg / 100);

    setItems(items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          quantity: qty,
          weightQuintals: (qty * i.packagingWeightKg) / 100,
          pricingBasis: editingPricingBasis,
          enteredRate: rateVal,
          calculatedBagRate: nextBagRate,
          calculatedLineValue: nextBagRate * qty,
        };
      }
      return i;
    }));
    setEditingItemId(null);
  };

  const validateStep1 = () => {
    const errors: {partyName?: string, location?: string} = {};
    if (!partyName.trim()) errors.partyName = "Party Name is required.";
    if (!location.trim()) errors.location = "Location is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    const token = await getToken();
    if (!token) {
      setSubmitStatus('save_error');
      setSubmitMessage("Not authenticated.");
      return;
    }

    setSubmitStatus('saving');
    setSubmitMessage("Saving draft to server…");

    try {
      const url = '/api/orders';
      const method = draftId ? 'PUT' : 'POST';
      const payload: any = {
        partyName,
        location,
        items,
        status: 'draft'
      };
      if (draftId) payload.id = draftId;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to save draft");

      if (!draftId && data.orderId) {
        setDraftId(data.orderId);
      }

      setSubmitStatus('idle');
      setSubmitMessage("Draft saved successfully!");
      setTimeout(() => setSubmitMessage(""), 3000);
    } catch (err: any) {
      console.error(err);
      setSubmitStatus('save_error');
      setSubmitMessage(err.message || "Failed to save draft.");
    }
  };

  const proceedToReview = () => {
    if (items.length === 0) {
      setSubmitStatus('validation_error');
      setSubmitMessage("Please add at least one line item.");
      return;
    }
    setSubmitStatus('idle');
    setSubmitMessage("");
    setStep(3);
  };

  const handleConfirmSubmit = async () => {
    if (submitStatus === 'saving' || submitStatus === 'saved') return;
    const token = await getToken();
    if (!token) {
      setSubmitStatus('save_error');
      setSubmitMessage("Not authenticated.");
      return;
    }

    setSubmitStatus('saving');
    setSubmitMessage("Submitting order…");

    try {
      const url = '/api/orders';
      const method = draftId ? 'PUT' : 'POST';
      const payload: any = {
        partyName,
        location,
        items,
        status: 'submitted'
      };
      if (draftId) payload.id = draftId;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit order");

      setSavedOrderDetails({
        id: draftId || data.orderId,
        partyName,
        location,
        totalBags: items.reduce((sum, i) => sum + i.quantity, 0),
        totalWeight: totalOrderWeight,
        totalValue: totalOrderValue,
        date: new Date().toISOString(),
        items
      });
      
      setSubmitStatus('saved');
      setSubmitMessage("Order submitted successfully!");
      
      setPartyName('');
      setLocation('');
      setItems([]);
      setDraftId(null);
      setAdminRemarks(null);
      setPartyLocationVerified(false);
    } catch (err: any) {
      console.error(err);
      setSubmitStatus('save_error');
      setSubmitMessage(err.message || "Failed to submit order.");
    }
  };

  const getQuantityError = (val: string) => {
    if (!val) return "Quantity is required";
    if (val.includes('.') || val.includes(',')) return "Whole bags only";
    const num = Number(val);
    if (isNaN(num)) return "Invalid number";
    if (num <= 0) return "Must be greater than 0";
    if (num > 50000) return "Quantity too high";
    return null;
  };

  const quantityError = selectedProductId && selectedPackagingId && quantity !== "" ? getQuantityError(quantity) : null;
  const isQuantityValid = selectedProductId && selectedPackagingId && quantity !== "" && getQuantityError(quantity) === null;

  const discardForm = async () => {
    if (draftId) {
      const token = await getToken();
      if (token) {
        await fetch(`/api/orders?id=${draftId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }
    setPartyName('');
    setLocation('');
    setItems([]);
    setDraftId(null);
    setAdminRemarks(null);
    setSubmitMessage('');
    setSubmitStatus('idle');
    setFormErrors({});
    setShowDiscardConfirm(false);
    setPartyLocationVerified(false);
    setStep(1);
  };

  const resetForm = () => {
    setSavedOrderDetails(null);
    setSubmitStatus('idle');
    setSubmitMessage('');
    setStep(1);
  };

  if (savedOrderDetails) {
    return (
      <div className="max-w-2xl mx-auto w-full p-4 lg:p-6 pb-32 lg:pb-6 print:pb-0">
        <div className="bg-card w-full border border-border rounded-xl p-6 lg:p-8 flex flex-col items-center text-center print:border-none print:p-0 shadow-sm">
          <div className="h-16 w-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-6 shrink-0 print:hidden animate-bounce">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">Order Confirmed</h2>
          <p className="text-muted-foreground mb-6 print:mb-4">
            Order for <span className="font-semibold text-foreground">{savedOrderDetails.partyName}</span> in <span className="font-semibold text-foreground">{savedOrderDetails.location}</span> has been successfully submitted for review.
          </p>

          <div className="w-full bg-muted/30 rounded-lg p-4 mb-6 space-y-3 shrink-0 text-left border border-border print:border print:bg-white print:text-black">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground text-xs font-semibold print:text-gray-600 uppercase">Order ID</span>
              <span className="font-mono font-bold text-secondary">#{savedOrderDetails.id}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground text-xs font-semibold print:text-gray-600 uppercase">Date</span>
              <span className="font-medium text-foreground">{new Date(savedOrderDetails.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground text-xs font-semibold print:text-gray-600 uppercase">Location</span>
              <span className="font-medium text-foreground">{savedOrderDetails.location}</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto mb-6 print:mb-4">
            <table className="w-full text-sm print:text-xs">
              <thead>
                <tr className="border-b border-border print:border-gray-300">
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Product</th>
                  <th className="text-right py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Price Basis</th>
                  <th className="text-right py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Rate</th>
                  <th className="text-right py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Qty</th>
                  <th className="text-right py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody>
                {savedOrderDetails.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/50 print:border-gray-200">
                    <td className="py-2.5 px-1 text-left">
                      <div className="font-semibold text-foreground">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">{item.brandName} • {item.packagingWeightKg}kg</div>
                    </td>
                    <td className="py-2.5 px-1 text-right text-muted-foreground">{item.pricingBasis === 'per_bag' ? 'Bag' : 'Qtl'}</td>
                    <td className="py-2.5 px-1 text-right font-medium text-foreground">₹{item.enteredRate?.toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-medium text-foreground tabular-nums">{item.quantity} bags</td>
                    <td className="py-2.5 px-1 text-right font-semibold text-secondary tabular-nums">₹{item.calculatedLineValue?.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border print:border-gray-800 font-bold text-foreground bg-muted/10">
                  <td colSpan={3} className="py-3 px-1 text-left font-bold text-secondary">Total Value</td>
                  <td className="py-3 px-1 text-right tabular-nums">{savedOrderDetails.totalBags} bags</td>
                  <td className="py-3 px-1 text-right tabular-nums text-secondary">₹{savedOrderDetails.totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="w-full flex flex-col gap-3 print:hidden">
            <Button onClick={() => window.print()} size="lg" className="w-full font-semibold bg-secondary hover:bg-secondary/90 text-white">
              <Printer className="h-4 w-4 mr-2" />
              Print Order Slip
            </Button>
            <Button onClick={resetForm} size="lg" className="w-full font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border border-border">
              <Plus className="h-4 w-4 mr-2" />
              Create Another Order
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate(`/history/${encodeURIComponent(savedOrderDetails.partyName)}`)} className="w-full">
              View Order History
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderOrderCart = (isMobile: boolean = false) => (
    <div className={isMobile ? "flex flex-col h-full bg-background" : "hidden lg:flex w-[380px] xl:w-[420px] shrink-0 flex-col lg:sticky lg:top-4 max-h-[calc(100vh-8rem)]"}>
      <div className={isMobile ? "flex flex-col h-full overflow-hidden" : "border border-border rounded-xl bg-card flex flex-col max-h-full relative overflow-hidden shadow-sm"}>
        <div className="py-3 px-4 border-b bg-card border-border z-10 shrink-0 flex justify-between items-center">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-secondary" />
            <span>Items Selected</span>
          </h2>
          <span className="text-xs font-semibold bg-secondary/15 text-secondary px-2.5 py-0.5 rounded-full">
            {items.length} items
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2 py-16">
              <div className="bg-muted p-3 rounded-full mb-2">
                <ShoppingCart className="h-5 w-5 opacity-40 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Your order is empty</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">Fill the fields on the left step and click "Add item" to insert products.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="py-2 h-9 text-xs font-semibold text-foreground">Product</TableHead>
                  <TableHead className="py-2 h-9 text-xs font-semibold text-foreground text-right">Qty</TableHead>
                  <TableHead className="py-2 h-9 text-xs font-semibold text-foreground text-right">Rate</TableHead>
                  <TableHead className="py-2 h-9 text-xs font-semibold text-foreground text-right">Value</TableHead>
                  <TableHead className="py-2 h-9 w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={`group relative border-border transition-colors duration-300 ${highlightedItemId === item.id ? 'bg-primary/10' : ''}`}>
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-[13px] leading-tight text-foreground">{item.productName}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {item.brandName} &bull; {item.packagingWeightKg}kg
                      </div>
                    </TableCell>
                    
                    {editingItemId === item.id ? (
                      <TableCell colSpan={4} className="py-2 px-2 align-middle">
                        <div className="flex flex-col gap-2 p-2 bg-muted/50 rounded-lg">
                          <div className="flex gap-2 items-center">
                            <div className="flex-1">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Qty</Label>
                              <Input
                                ref={editInputRef}
                                type="text"
                                className="h-8 text-right px-2"
                                value={editingQuantity}
                                onChange={e => setEditingQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-[10px] text-muted-foreground font-semibold">Rate</Label>
                              <Input
                                type="text"
                                className="h-8 text-right px-2"
                                value={editingRate}
                                onChange={e => setEditingRate(e.target.value.replace(/[^0-9.]/g, ''))}
                              />
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground font-medium">Basis:</span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => setEditingPricingBasis('per_bag')} 
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${editingPricingBasis === 'per_bag' ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'}`}
                              >
                                Bag
                              </button>
                              <button 
                                onClick={() => setEditingPricingBasis('per_quintal')} 
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${editingPricingBasis === 'per_quintal' ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'}`}
                              >
                                Qtl
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-1.5 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setEditingItemId(null)} className="h-7 text-xs text-muted-foreground">Cancel</Button>
                            <Button size="sm" onClick={() => saveEditing(item)} className="h-7 text-xs bg-secondary hover:bg-secondary/90 text-white">Save</Button>
                          </div>
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="py-2.5 text-right font-medium text-[13px] tabular-nums text-foreground">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium text-[12px] tabular-nums text-muted-foreground">
                          ₹{item.enteredRate}
                          <span className="text-[10px] block opacity-70">{item.pricingBasis === 'per_bag' ? 'bag' : 'qtl'}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-bold text-[13px] tabular-nums text-secondary">
                          ₹{item.calculatedLineValue?.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </TableCell>
                        <TableCell className="py-2.5 pr-2 w-[40px] align-middle">
                          <div className="flex flex-col gap-1">
                            <Button id={`edit-btn-${item.id}-${isMobile?'mobile':'desktop'}`} variant="ghost" size="icon" aria-label={`Edit`} className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEditing(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Remove`} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item, items.indexOf(item))}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {lastDeletedItem && (
            <div className="sticky bottom-4 mx-4 mt-4 bg-foreground text-background text-xs p-2.5 rounded-lg shadow-md flex items-center justify-between z-50">
              <span className="truncate pr-2 font-medium">Removed {lastDeletedItem.item.productName}</span>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-secondary hover:bg-muted-foreground/10 px-2 font-bold" onClick={handleUndoRemove}>
                <Undo className="h-3 w-3 mr-1" /> Undo
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card shrink-0 space-y-4">
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Total bags</span>
              <span className="font-semibold text-foreground tabular-nums">{items.reduce((sum, i) => sum + i.quantity, 0)} bags</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total weight</span>
              <span className="font-semibold text-foreground tabular-nums">{totalOrderWeight.toFixed(2)} Qtl</span>
            </div>
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-border">
              <span className="font-bold text-foreground text-sm">Estimated Value</span>
              <span className="font-bold text-lg text-secondary tabular-nums">₹{totalOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          {submitMessage && submitStatus !== 'idle' && (
            <div className={`text-xs p-2.5 rounded-md flex items-start gap-2 ${
              submitStatus === 'saved' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
              submitStatus === 'validation_error' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
              submitStatus === 'save_error' ? 'bg-destructive/10 text-destructive' :
              'bg-muted text-muted-foreground'
            }`}>
              {(submitStatus === 'validation_error' || submitStatus === 'save_error') ? <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> : 
               submitStatus === 'saved' ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : null}
              <span className="leading-snug">{submitMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="lg"
              onClick={handleSaveDraft}
              disabled={submitStatus === 'saving'}
              className="flex-1 border-border font-semibold h-11"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            
            {step === 2 && (
              <Button 
                size="lg"
                onClick={proceedToReview}
                className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-semibold h-11"
              >
                Review Order
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto w-full p-4 lg:p-8 flex flex-col gap-6 pb-32">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {draftId ? `Editing Draft Order (#${draftId})` : "Create New Feed Order"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Follow the steps below to populate, calculate, and submit the order.
            </p>
          </div>
          
          <div className="flex items-center gap-2 select-none self-start md:self-auto">
            <button 
              onClick={() => step > 1 && setStep(1)}
              disabled={step === 1}
              className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                step === 1 ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground hover:bg-muted-foreground/15'
              }`}
            >
              1
            </button>
            <span className="h-0.5 w-8 bg-border"></span>
            <button 
              onClick={() => step > 2 && setStep(2)}
              disabled={step <= 2}
              className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                step === 2 ? 'bg-secondary text-white' : step > 2 ? 'bg-secondary/20 text-secondary' : 'bg-muted text-muted-foreground'
              }`}
            >
              2
            </button>
            <span className="h-0.5 w-8 bg-border"></span>
            <div 
              className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-all ${
                step === 3 ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              3
            </div>
          </div>
        </div>

        {adminRemarks && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Clarification Requested by Admin</h4>
              <p className="text-xs mt-1 leading-relaxed">{adminRemarks}</p>
            </div>
          </div>
        )}

        {serverDraftBanner && (
          <div className="bg-secondary/10 border border-secondary/20 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-secondary shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-foreground">Incomplete Draft Detected</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have a draft for <span className="font-semibold text-foreground">{serverDraftBanner.partyName}</span> ({serverDraftBanner.location}) saved on the server.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button size="sm" variant="ghost" className="h-9 hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-1 sm:flex-none" onClick={() => handleDiscardServerDraft(serverDraftBanner.id)}>Discard</Button>
              <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-white font-semibold h-9 flex-1 sm:flex-none" onClick={() => loadDraftIntoForm(serverDraftBanner)}>Resume Draft</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            
            {/* Step 1: Party Details Selection */}
            <div className={step === 1 ? "" : "hidden"}>
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: step === 1 ? 1 : 0, x: step === 1 ? 0 : -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">Party Details</CardTitle>
                    <CardDescription>Select or enter the client business name and location.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="party-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Party Name <span className="text-destructive">*</span></Label>
                        <AutocompleteInput 
                          id="party-name"
                          value={partyName}
                          onChange={(v) => { 
                            if (formErrors.partyName) setFormErrors(prev => ({...prev, partyName: undefined})); 
                            setPartyName(v); 
                          }}
                          options={partyOptions}
                          placeholder="Select or type corporate buyer name…"
                          aria-invalid={!!formErrors.partyName}
                          allowCreation={true}
                          onCreate={(val) => setCreatedParties(prev => [...prev, val])}
                        />
                        {formErrors.partyName && <span className="text-xs text-destructive font-medium block mt-1">{formErrors.partyName}</span>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location <span className="text-destructive">*</span></Label>
                        <AutocompleteInput 
                          id="location"
                          value={location}
                          onChange={(v) => { 
                            if (formErrors.location) setFormErrors(prev => ({...prev, location: undefined})); 
                            setLocation(v); 
                          }}
                          options={partyName ? locationOptionsForParty : []}
                          placeholder={partyName ? "Select or type city…" : "Please enter party name first"}
                          aria-invalid={!!formErrors.location}
                          allowCreation={!!partyName}
                          onCreate={(val) => setCreatedLocations(prev => ({...prev, [partyName]: [...(prev[partyName] || []), val]}))}
                        />
                        {formErrors.location && <span className="text-xs text-destructive font-medium block mt-1">{formErrors.location}</span>}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        size="lg"
                        className="bg-secondary hover:bg-secondary/90 text-white font-semibold h-11 px-8"
                        onClick={() => {
                          if (validateStep1()) {
                            setStep(2);
                          }
                        }}
                      >
                        Next: Add Products
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Step 2: Line Items Wizard */}
            <div className={step === 2 ? "" : "hidden"}>
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: step === 2 ? 1 : 0, x: step === 2 ? 0 : -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="border border-border rounded-xl bg-card shadow-sm">
                  <div className="py-3.5 px-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/10">
                    <div>
                      <h2 className="text-base font-bold text-foreground">Add Line Item</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Selected Party: {partyName} &bull; {location}</p>
                    </div>
                    <ProductSearchAutocomplete 
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      onSelectProduct={handleAutocompleteSelect} 
                    />
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Quick adds row */}
                    {quickAddItems.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center" aria-label="Frequently Used Items">
                        <span className="text-xs text-muted-foreground font-semibold mr-1">Quick Add:</span>
                        {quickAddItems.slice(0, 5).map(item => {
                          const prod = getProducts().find(p => p.id === item.productId);
                          if (!prod) return null;
                          let displayPkg = '';
                          const validPkgs = getPackaging().filter(pkg => !pkg.productId || pkg.productId === prod.id);
                          if (item.packagingId) {
                            displayPkg = getPackaging().find(p => p.id === item.packagingId)?.name || '';
                          } else if (validPkgs.length === 1) {
                            displayPkg = validPkgs[0].name;
                          }
                          const label = `${prod.name} (${displayPkg})`;
                          return (
                            <Button 
                              key={`${item.productId}-${item.packagingId || 'any'}`}
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleAutocompleteSelect(item.productId, item.packagingId)} 
                              className="h-7 text-xs bg-background border-border hover:bg-muted font-medium py-0"
                              title={`Quickly populate ${prod.name}${displayPkg ? ` with ${displayPkg}` : ''}`}
                              aria-label={`Quickly populate ${prod.name}${displayPkg ? ` with ${displayPkg}` : ''}`}
                            >
                              {prod.name}
                              {displayPkg && <span className="text-muted-foreground ml-1">({displayPkg})</span>}
                              <Plus className="ml-1 h-3 w-3 text-secondary" />
                            </Button>
                          );
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label id="label-brand" className="text-xs font-semibold">Brand</Label>
                        <Select value={selectedBrandId} onValueChange={handleBrandChange}>
                          <SelectTrigger aria-labelledby="label-brand" className="bg-card border-border"><SelectValue placeholder="Select brand">{availableBrands.find(b => b.id === selectedBrandId)?.name}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {availableBrands.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label id="label-category" className="text-xs font-semibold">Category</Label>
                        <Select value={selectedCategoryId} onValueChange={handleCategoryChange} disabled={!selectedBrandId}>
                          <SelectTrigger aria-labelledby="label-category" className="bg-card border-border"><SelectValue placeholder={!selectedBrandId ? "Select brand first" : "Select category"}>{availableCategories.find(c => c.id === selectedCategoryId)?.name}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {availableCategories.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label id="label-feed-type" className="text-xs font-semibold">Feed Type</Label>
                        <Select value={selectedFeedTypeId} onValueChange={handleFeedTypeChange} disabled={!selectedCategoryId}>
                          <SelectTrigger aria-labelledby="label-feed-type" className="bg-card border-border"><SelectValue placeholder={!selectedCategoryId ? "Select category first" : "Select feed type"}>{availableFeedTypes.find(ft => ft.id === selectedFeedTypeId)?.name}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {availableFeedTypes.map(ft => (
                              <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                      <div className="space-y-1.5 md:col-span-5">
                        <Label id="label-product" className="text-xs font-semibold">Product</Label>
                        <Select value={selectedProductId} onValueChange={handleProductChange} disabled={!selectedFeedTypeId}>
                          <SelectTrigger aria-labelledby="label-product" className="bg-card border-border"><SelectValue placeholder={!selectedFeedTypeId ? "Select feed type first" : "Select product"}>{availableProducts.find(p => p.id === selectedProductId)?.name}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {availableProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 md:col-span-3">
                        <Label id="label-packaging" className="text-xs font-semibold">Packaging</Label>
                        <Select value={selectedPackagingId} onValueChange={(val) => {
                          setSelectedPackagingId(val);
                        }} disabled={!selectedProductId}>
                          <SelectTrigger id="packaging-trigger" aria-labelledby="label-packaging" className="bg-card border-border"><SelectValue placeholder={!selectedProductId ? "Select product first" : "Select packaging"}>{availablePackaging.find(pkg => pkg.id === selectedPackagingId)?.name}</SelectValue></SelectTrigger>
                          <SelectContent>
                            {availablePackaging.map(pkg => (
                              <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 md:col-span-2 relative">
                        <Label htmlFor="quantity-input" className="text-xs font-semibold">Qty (bags)</Label>
                        <Input 
                          id="quantity-input"
                          ref={quantityRef}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder=""
                          aria-invalid={!!quantityError}
                          className="bg-card border-border text-right font-medium tabular-nums focus-visible:ring-ring"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                          disabled={!selectedProductId || !selectedPackagingId}
                        />
                        {quantityError && quantity !== "" && (
                          <div className="absolute -bottom-5 left-0 text-[10px] text-destructive whitespace-nowrap">{quantityError}</div>
                        )}
                      </div>

                      <div className="md:col-span-2 text-right py-2 px-1 text-xs text-muted-foreground font-semibold tabular-nums">
                        {derivedKg > 0 ? `${derivedKg} kg / ${derivedQuintals} Qtl` : '0 kg'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-muted/20 p-4 rounded-xl border border-border">
                      <div className="sm:col-span-4 space-y-1.5">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Pricing Basis</Label>
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setPricingBasis('per_bag')}
                            className={`flex-1 font-semibold ${pricingBasis === 'per_bag' ? 'bg-secondary text-white border-secondary hover:bg-secondary/95 hover:text-white' : 'bg-background text-foreground'}`}
                          >
                            Per Bag
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setPricingBasis('per_quintal')}
                            className={`flex-1 font-semibold ${pricingBasis === 'per_quintal' ? 'bg-secondary text-white border-secondary hover:bg-secondary/95 hover:text-white' : 'bg-background text-foreground'}`}
                          >
                            Per Quintal
                          </Button>
                        </div>
                      </div>

                      <div className="sm:col-span-4 space-y-1.5 relative">
                        <Label htmlFor="rate-input" className="text-xs font-bold text-muted-foreground uppercase">Rate (₹)</Label>
                        <Input 
                          id="rate-input"
                          type="text"
                          placeholder="0.00"
                          className="bg-card border-border text-right font-medium tabular-nums focus-visible:ring-ring"
                          value={enteredRate}
                          onChange={e => setEnteredRate(e.target.value.replace(/[^0-9.]/g, ''))}
                          disabled={!selectedProductId}
                        />
                      </div>

                      <div className="sm:col-span-4 flex flex-col justify-end text-right px-1">
                        {selectedProductId && selectedPackagingId && rateNum > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Bag Rate: <span className="font-bold text-foreground">₹{calculatedBagRate.toFixed(2)}</span></div>
                            <div className="text-[13px] font-bold text-secondary">Subtotal: ₹{derivedLineValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={() => setStep(1)}
                        className="border-border font-semibold h-11"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Party
                      </Button>

                      <Button 
                        onClick={handleAddItem} 
                        disabled={!isQuantityValid}
                        className="bg-secondary hover:bg-secondary/90 text-white font-bold h-11 px-8"
                        name="Add Item"
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Step 3: Review & Final Confirmation */}
            <div className={step === 3 ? "" : "hidden"}>
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-foreground">Order Verification</CardTitle>
                    <CardDescription>Verify all client details and computed totals before submitting.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Party</div>
                        <div className="font-semibold text-foreground text-sm mt-0.5">{partyName}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-muted-foreground uppercase">Location</div>
                        <div className="font-semibold text-foreground text-sm mt-0.5">{location}</div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted">
                          <TableRow className="border-border">
                            <TableHead className="text-xs py-2 h-8 font-semibold text-foreground">Product</TableHead>
                            <TableHead className="text-xs py-2 h-8 font-semibold text-foreground text-right">Packaging</TableHead>
                            <TableHead className="text-xs py-2 h-8 font-semibold text-foreground text-right">Rate</TableHead>
                            <TableHead className="text-xs py-2 h-8 font-semibold text-foreground text-right">Qty</TableHead>
                            <TableHead className="text-xs py-2 h-8 font-semibold text-foreground text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id} className="hover:bg-transparent border-border">
                              <TableCell className="py-2.5">
                                <div className="font-semibold text-[13px] leading-tight text-foreground">{item.productName}</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">{item.brandName}</div>
                              </TableCell>
                              <TableCell className="py-2.5 text-right text-xs text-muted-foreground font-semibold">{item.packagingWeightKg}kg</TableCell>
                              <TableCell className="py-2.5 text-right font-medium text-xs text-foreground">
                                ₹{item.enteredRate} / {item.pricingBasis === 'per_bag' ? 'bag' : 'qtl'}
                              </TableCell>
                              <TableCell className="py-2.5 text-right font-medium text-xs text-foreground tabular-nums">{item.quantity} bags</TableCell>
                              <TableCell className="py-2.5 text-right font-bold text-xs text-secondary tabular-nums">
                                ₹{item.calculatedLineValue?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="rounded-lg bg-secondary/10 p-4 flex flex-col gap-2 border border-secondary/20">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total Items</span>
                        <span className="font-semibold text-foreground">{items.length} items</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total Quantity</span>
                        <span className="font-semibold text-foreground">{items.reduce((sum, i) => sum + i.quantity, 0)} bags</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Total Weight</span>
                        <span className="font-semibold text-foreground">{totalOrderWeight.toFixed(2)} Qtl</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-foreground border-t border-secondary/20 pt-2 mt-1">
                        <span>Grand Total Value</span>
                        <span className="text-secondary text-lg">
                          ₹{totalOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 p-4 bg-muted/30 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors select-none">
                      <input 
                        type="checkbox" 
                        checked={partyLocationVerified}
                        onChange={(e) => setPartyLocationVerified(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 rounded-sm border-input text-secondary focus:ring-secondary"
                      />
                      <span className="text-sm">
                        <span className="font-bold text-foreground block mb-0.5">Lock Verification</span>
                        <span className="text-muted-foreground text-xs leading-snug">I confirm that the client name, billing address, quantities, and negotiated pricing rates are verified and accurate.</span>
                      </span>
                    </label>

                    {submitMessage && submitStatus === 'save_error' && (
                      <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md flex items-start gap-2 border border-destructive/25">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="leading-snug">{submitMessage}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={() => setStep(2)}
                        disabled={submitStatus === 'saving'}
                        className="border-border font-semibold h-11"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Items
                      </Button>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          size="lg"
                          onClick={handleSaveDraft}
                          disabled={submitStatus === 'saving'}
                          className="border-border font-semibold h-11"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button 
                          size="lg"
                          disabled={submitStatus === 'saving' || !partyLocationVerified}
                          onClick={handleConfirmSubmit}
                          className="bg-secondary hover:bg-secondary/90 text-white font-bold h-11 px-8 relative"
                        >
                          <div className={`flex items-center justify-center transition-opacity ${submitStatus === 'saving' ? 'opacity-0' : 'opacity-100'}`}>
                            <Check className="mr-2 h-4 w-4" />
                            Confirm & Submit
                          </div>
                          {submitStatus === 'saving' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Submitting…
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              )}
            </div>

          </AnimatePresence>
        </div>

        {renderOrderCart(false)}
      </div>

      <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] ${step === 2 ? "" : "hidden"}`}>
        <div className="max-w-[1400px] mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm px-1">
            <div className="font-semibold text-foreground">
              {items.length} items &bull; {items.reduce((sum, i) => sum + i.quantity, 0)} bags
            </div>
            <div className="font-bold text-lg text-secondary">
              ₹{totalOrderValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="lg" className="flex-1 font-semibold h-12">
                    <ShoppingCart className="h-4 w-4 mr-2 text-secondary" />
                    Cart ({items.length})
                  </Button>
                }
              />
              <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col">
                <SheetHeader className="sr-only">
                  <SheetTitle>Current Order</SheetTitle>
                  <SheetDescription>Review draft order line items.</SheetDescription>
                </SheetHeader>
                {isCartOpen && renderOrderCart(true)}
              </SheetContent>
            </Sheet>

            <Button 
              size="lg" 
              onClick={proceedToReview}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-white font-semibold h-12"
            >
              Proceed to Review
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {(items.length > 0 || partyName || location) && step > 1 && (
        <div className="flex justify-start max-w-[1000px] mt-6">
          <Button 
            variant={showDiscardConfirm ? "destructive" : "ghost"} 
            onClick={() => {
              if (showDiscardConfirm) discardForm();
              else setShowDiscardConfirm(true);
            }}
            onBlur={() => setShowDiscardConfirm(false)}
            className="font-medium text-xs text-muted-foreground hover:text-destructive h-10 transition-colors"
          >
            {showDiscardConfirm ? 'Click again to confirm Discard order draft' : 'Discard order draft'}
          </Button>
        </div>
      )}
    </div>
  );
}
