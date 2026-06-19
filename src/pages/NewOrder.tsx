import { useState, useRef, useEffect } from "react";
import { OrderItem } from "@/src/types";
import { getBrands, getCategories, getFeedTypes, getProducts, getPackaging, PARTIES, Party } from "@/src/lib/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate } from "react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Search, Plus, Trash2, Save, ChevronsUpDown, Check, AlertCircle, Pencil, ShoppingCart, Loader2, X, Undo, CheckCircle2, ArrowRight, Printer } from "lucide-react";
import { useAuth } from "@/src/lib/auth";

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
        setInputValue(value); // Revert to confirmed value on blur
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

  // Auto-scroll logic for key navigation
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
               // Exact match but didn't arrow down
               onChange(inputValue.trim());
            }
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={`w-full pr-8 ${ariaInvalid ? "border-destructive focus-visible:ring-destructive" : "bg-background"}`}
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
          className="absolute top-full left-0 mt-1 w-full z-50 bg-popover text-popover-foreground rounded-lg border shadow-md outline-hidden max-h-[200px] overflow-y-auto p-1"
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
                  {isSelected && <Check className="ml-auto h-4 w-4" />}
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
                className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden text-primary font-medium ${focusedIndex === filtered.length ? 'bg-primary/10' : ''}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create "{inputValue.trim()}"
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
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text;
    const terms = query.toLowerCase().split(' ').filter(Boolean);
    if (terms.length === 0) return text;

    const regex = new RegExp(`(${terms.map(t => escapeRegExp(t)).join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-primary/20 text-primary font-semibold rounded-[2px] px-0.5">{part}</span> : part
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

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery, open]);

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
        placeholder="Search SKU, product, brand, feed type…"
        className="w-full bg-background pl-9 h-9 font-normal"
      />
      {open && (
        <div 
          id="product-search-list"
          role="listbox"
          className="absolute top-full left-0 mt-1 w-full sm:w-[500px] z-50 bg-popover text-popover-foreground rounded-lg border shadow-md outline-hidden max-h-[300px] overflow-y-auto p-1"
        >
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No products found.
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {!searchQuery ? "Recent Products" : "Products"}
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
                    className={`relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden ${isFocused ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{highlightMatch(opt.nameText, searchQuery)}</span>
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
  const { getToken } = useAuth();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [partyName, setPartyName] = useState("");
  const [location, setLocation] = useState("");
  const [createdParties, setCreatedParties] = useState<string[]>([]);
  const [createdLocations, setCreatedLocations] = useState<Record<string, string[]>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'validating' | 'saving' | 'saved' | 'validation_error' | 'save_error'>('idle');
  const [submitMessage, setSubmitMessage] = useState("");
  const [formErrors, setFormErrors] = useState<{partyName?: string, location?: string}>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [partyLocationVerified, setPartyLocationVerified] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [savedOrderDetails, setSavedOrderDetails] = useState<{
    id: number;
    partyName: string;
    location: string;
    totalBags: number;
    totalWeight: number;
    date: string;
    items: OrderItem[];
  } | null>(null);
  const isDirty = items.length > 0 || partyName.trim() !== '' || location.trim() !== '';
  
  const partyOptions = [...PARTIES.map(p => p.name), ...createdParties];
  const currentPartyObj = PARTIES.find(p => p.name === partyName);
  const locationOptionsForParty = partyName 
    ? [...(currentPartyObj ? currentPartyObj.locations : []), ...(createdLocations[partyName] || [])]
    : [];

  useEffect(() => {
    const rawDraft = localStorage.getItem('new_order_draft');
    if (rawDraft) {
      try {
        const draft = JSON.parse(rawDraft);
        if (draft && (draft.partyName || draft.location || (draft.items && draft.items.length > 0))) {
          if (draft.partyName) setPartyName(draft.partyName);
          if (draft.location) setLocation(draft.location);
          if (draft.items) setItems(draft.items);
          if (draft.isRepeat) setIsRepeat(true);
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 5000);
        }
      } catch (e) {
        // failed to parse
      }
    }
  }, []);

  useEffect(() => {
    if (submitStatus === 'saved') return;
    
    if (isDirty) {
      const draftObj: any = { partyName, location, items };
      if (isRepeat) draftObj.isRepeat = true;
      localStorage.setItem('new_order_draft', JSON.stringify(draftObj));
    }
  }, [partyName, location, items, isDirty, submitStatus, isRepeat]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (submitStatus === 'saved') return;
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, submitStatus]);

  useEffect(() => {
    if (!partyName) {
        if (location) setLocation('');
        return;
    }
    
    if (locationOptionsForParty.length === 1 && location !== locationOptionsForParty[0]) {
        setLocation(locationOptionsForParty[0]);
        setMergeAnnouncement(`Location auto-selected to ${locationOptionsForParty[0]}`);
    } else if (locationOptionsForParty.length > 0 && location && !locationOptionsForParty.includes(location)) {
        setLocation('');
        setMergeAnnouncement(`Location cleared. Not valid for ${partyName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyName]);

  // Cascading Line Item Form State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedFeedTypeId, setSelectedFeedTypeId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedPackagingId, setSelectedPackagingId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>("");
  const [lastDeletedItem, setLastDeletedItem] = useState<{ item: OrderItem, index: number } | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [mergeAnnouncement, setMergeAnnouncement] = useState("");

  const quantityRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);

  // Computed Available Options
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

  // Cascading Auto-selection logic
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

  // Focus quantity when product and packaging are resolved
  useEffect(() => {
    if (selectedProductId && selectedPackagingId) {
      quantityRef.current?.focus();
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

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const product = getProducts().find(p => p.id === selectedProductId);
    if (!product) return;

    const feedType = getFeedTypes().find(ft => ft.id === product.feedTypeId)!;
    const category = getCategories().find(c => c.id === feedType.categoryId)!;
    const brand = getBrands().find(b => b.id === product.brandId)!;
    const packaging = getPackaging().find(p => p.id === selectedPackagingId)!;
    
    // Check for existing item with same product and packaging
    const existingItemIndex = items.findIndex(
      i => i.productId === product.id && i.packagingId === packaging.id
    );

    if (existingItemIndex >= 0) {
      const existingItem = items[existingItemIndex];
      const newQuantity = existingItem.quantity + qtyNum;
      const newWeightQuintals = (newQuantity * packaging.weightKg) / 100;
      
      const newItems = [...items];
      newItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        weightQuintals: newWeightQuintals
      };
      
      setItems(newItems);
      setHighlightedItemId(existingItem.id);
      setMergeAnnouncement(`Merged ${qtyNum} bags into existing line for ${product.name} ${packaging.name}. New total: ${newQuantity} bags.`);
      
      setTimeout(() => {
        setHighlightedItemId(null);
      }, 3000);
      
    } else {
      const weightQuintals = (qtyNum * packaging.weightKg) / 100;
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
        quantity: qtyNum,
        weightQuintals
      };

      setItems([...items, newItem]);
    }
    
    // Reset flow. Keep Brand and Category for speed, as users often order
    // multiple products in the same category (e.g. multiple cattle feeds).
    setSelectedFeedTypeId("");
    setSelectedProductId("");
    setSelectedPackagingId("");
    setQuantity("");
    setSearchQuery("");

    // Focus next logical element - search is the most flexible
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
    const insertIndex = Math.min(lastDeletedItem.index, newItems.length);
    newItems.splice(insertIndex, 0, lastDeletedItem.item);
    setItems(newItems);
    
    const idToFocus = lastDeletedItem.item.id;
    setLastDeletedItem(null);
    setTimeout(() => {
      document.getElementById(`edit-btn-${idToFocus}`)?.focus();
    }, 10);
  };

  const startEditing = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditingQuantity(item.quantity.toString());
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const cancelEditing = (itemId?: string) => {
    setEditingItemId(null);
    setEditingQuantity("");
    if (itemId) {
      setTimeout(() => {
        document.getElementById(`edit-btn-${itemId}`)?.focus();
      }, 0);
    }
  };

  const saveEditing = (item: OrderItem) => {
    const qty = parseInt(editingQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      cancelEditing(item.id);
      return;
    }

    setItems(items.map(i => {
      if (i.id === item.id) {
        return {
          ...i,
          quantity: qty,
          weightQuintals: (qty * i.packagingWeightKg) / 100
        };
      }
      return i;
    }));
    setEditingItemId(null);
    setEditingQuantity("");
    setTimeout(() => {
      document.getElementById(`edit-btn-${item.id}`)?.focus();
    }, 10);
  };

  const handleReviewRequest = () => {
    if (submitStatus === 'saving' || submitStatus === 'saved') return;
    setSubmitStatus('validating');
    
    const errors: {partyName?: string, location?: string} = {};
    if (!partyName.trim()) errors.partyName = "Party Name is required.";
    if (!location.trim()) errors.location = "Location is required.";
    if (items.length === 0) {
      setSubmitStatus('validation_error');
      setSubmitMessage("Cannot save an empty order. Please add at least one line item.");
      return;
    }
    
    const invalidItemsCount = items.filter(i => i._invalid).length;
    if (invalidItemsCount > 0) {
      setSubmitStatus('validation_error');
      setSubmitMessage(`Please clear or remove ${invalidItemsCount} unavailable item(s) before saving.`);
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitStatus('validation_error');
      setSubmitMessage("Please correct the highlighted fields before saving.");
      if (errors.partyName) setTimeout(() => document.getElementById('party-name')?.focus(), 0);
      else if (errors.location) setTimeout(() => document.getElementById('location')?.focus(), 0);
      return;
    }
    
    setFormErrors({});
    setSubmitStatus('idle'); // clear any validation error
    setSubmitMessage("");
    setShowReviewDialog(true);
  };

  const executeSaveOrder = async () => {
    if (submitStatus === 'saving' || submitStatus === 'saved') return;
    const token = await getToken();
    if (!token) {
      setSubmitStatus('save_error');
      setSubmitMessage("Not authenticated. Please sign in again.");
      return;
    }
    setSubmitStatus('saving');
    setSubmitMessage("Saving order…");
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ partyName, location, items })
      });
      
      const data = await res.json();
      
      if (res.status === 401) {
        setSubmitStatus('save_error');
        setSubmitMessage("Session expired. Please sign in again.");
        return;
      }
      
      if (!res.ok) throw new Error(data.error || "Failed to save order");

      setSavedOrderDetails({
        id: data.orderId,
        partyName,
        location,
        totalBags: items.reduce((sum, i) => sum + i.quantity, 0),
        totalWeight: totalOrderWeight,
        date: new Date().toISOString(),
        items
      });
      
      setSubmitStatus('saved');
      setSubmitMessage("Order submitted successfully!");
      
      localStorage.removeItem('new_order_draft');
      setShowReviewDialog(false);
      
      // Clear form so it's ready for another order
      setPartyName('');
      setLocation('');
      setItems([]);
      setFormErrors({});
      setShowDiscardConfirm(false);
      setDraftRestored(false);
      setIsRepeat(false);
      setPartyLocationVerified(false);
      
    } catch (err: any) {
      console.error(err);
      setSubmitStatus('save_error');
      setSubmitMessage(err.message || "Failed to save order. Please try again.");
    }
  };

  const currentPkg = getPackaging().find(p => p.id === selectedPackagingId);
  const getQuantityError = (val: string) => {
    if (!val) return "Quantity is required";
    if (val.includes('.') || val.includes(',')) return "Whole bags only";
    
    const num = Number(val);
    if (isNaN(num)) return "Invalid number";
    if (num <= 0) return "Must be greater than 0";
    if (num > 10000) return "Check quantity, seems too high";
    return null;
  };

  const quantityError = selectedProductId && selectedPackagingId && quantity !== "" ? getQuantityError(quantity) : null;
  const isQuantityValid = selectedProductId && selectedPackagingId && quantity !== "" && getQuantityError(quantity) === null;

  const qNum = parseInt(quantity, 10) || 0;
  const derivedQuintals = currentPkg && qNum > 0 && !quantityError ? ((qNum * currentPkg.weightKg) / 100).toFixed(2) : "0.00";
  const derivedKg = currentPkg && qNum > 0 && !quantityError ? (qNum * currentPkg.weightKg) : 0;
  const totalOrderWeight = items.reduce((sum, item) => sum + item.weightQuintals, 0);


  const quickAddItems = partyName && PARTY_QUICK_ADDS[partyName] 
    ? PARTY_QUICK_ADDS[partyName] 
    : GLOBAL_QUICK_ADDS;

  const discardDraft = () => {
    setPartyName('');
    setLocation('');
    setItems([]);
    setSubmitMessage('');
    setSubmitStatus('idle');
    setFormErrors({});
    setShowDiscardConfirm(false);
    setDraftRestored(false);
    setIsRepeat(false);
    setPartyLocationVerified(false);
    localStorage.removeItem('new_order_draft');
    setMergeAnnouncement("Order discarded");
  };

  const resetForm = () => {
    setSavedOrderDetails(null);
    setSubmitStatus('idle');
    setSubmitMessage('');
  };

  if (savedOrderDetails) {
    return (
      <div className="max-w-2xl mx-auto w-full p-4 lg:p-6 pb-32 lg:pb-6 print:pb-0">
        <div className="bg-card w-full border rounded-lg p-6 lg:p-8 flex flex-col items-center text-center print:border-none print:p-0">
          <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-6 shrink-0 print:hidden">
            <CheckCircle2 className="h-8 w-8" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2">Order Confirmed</h2>
          <p className="text-muted-foreground mb-6 print:mb-4">
            Your order for <span className="font-medium text-foreground">{savedOrderDetails.partyName}</span> in <span className="font-medium text-foreground">{savedOrderDetails.location}</span> has been successfully placed.
          </p>

          <div className="w-full bg-secondary/5 rounded-lg p-4 mb-6 space-y-3 shrink-0 text-left border overflow-hidden print:border print:bg-white print:text-black">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground text-xs font-semibold print:text-gray-600">Order ID</span>
              <span className="font-mono font-medium">#{savedOrderDetails.id}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground text-xs font-semibold print:text-gray-600">Date</span>
              <span className="font-medium">{new Date(savedOrderDetails.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground text-xs font-semibold print:text-gray-600">Location</span>
              <span className="font-medium">{savedOrderDetails.location}</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto mb-6 print:mb-4">
            <table className="w-full text-sm print:text-xs">
              <thead>
                <tr className="border-b border-border print:border-gray-300">
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Product</th>
                  <th className="text-left py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Brand</th>
                  <th className="text-center py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Pkg</th>
                  <th className="text-right py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Qty</th>
                  <th className="text-right py-2 px-1 font-semibold text-muted-foreground print:text-gray-600">Wt (Qtl)</th>
                </tr>
              </thead>
              <tbody>
                {savedOrderDetails.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-border/50 print:border-gray-200">
                    <td className="py-1.5 px-1 text-left font-medium">{item.productName}</td>
                    <td className="py-1.5 px-1 text-left text-muted-foreground print:text-gray-600">{item.brandName}</td>
                    <td className="py-1.5 px-1 text-center text-muted-foreground print:text-gray-600">{item.packagingWeightKg}kg</td>
                    <td className="py-1.5 px-1 text-right font-medium tabular-nums">{item.quantity}</td>
                    <td className="py-1.5 px-1 text-right font-medium tabular-nums">{item.weightQuintals.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border print:border-gray-800 font-bold">
                  <td colSpan={3} className="py-2 px-1 text-left">Total</td>
                  <td className="py-2 px-1 text-right tabular-nums">{savedOrderDetails.totalBags}</td>
                  <td className="py-2 px-1 text-right tabular-nums">{savedOrderDetails.totalWeight.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="w-full flex flex-col gap-3 print:hidden">
            <Button onClick={() => window.print()} size="lg" className="w-full font-semibold">
              <Printer className="h-4 w-4 mr-2" />
              Print Order
            </Button>
            <Button onClick={resetForm} size="lg" className="w-full font-semibold">
              <Plus className="h-4 w-4 mr-2" />
              Create Another Order
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate(`/history/${encodeURIComponent(savedOrderDetails.partyName)}/${savedOrderDetails.id}`)} className="w-full">
              View Order
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderOrderCart = (isMobile: boolean = false) => (
    <div className={isMobile ? "flex flex-col h-full bg-background" : "hidden lg:flex w-[360px] xl:w-[400px] shrink-0 flex-col lg:sticky lg:top-4 max-h-[calc(100vh-8rem)]"}>
      <div className={isMobile ? "flex flex-col h-full overflow-hidden" : "border border-border rounded-xl bg-card flex flex-col max-h-full relative overflow-hidden shadow-sm"}>
        <div className="py-3 px-4 border-b bg-card z-10 shrink-0">
          <h2 className="text-base font-semibold flex justify-between items-center">
            <span>Current Order</span>
            <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
              {items.length} line items
            </span>
          </h2>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-auto p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-2 py-12">
              <div className="bg-muted p-3 rounded-full mb-2">
                <ShoppingCart className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-sm font-medium text-foreground">Your order is empty</p>
              <p className="text-[13px] max-w-[200px]">Search or select items from the left panel to begin.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2.5 h-9 text-xs">Product</TableHead>
                  <TableHead className="py-2.5 h-9 text-xs text-right">Qty</TableHead>
                  <TableHead className="py-2.5 h-9 text-xs text-right">Weight</TableHead>
                  <TableHead className="py-2.5 h-9 w-[48px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={`group relative transition-colors duration-500 ${highlightedItemId === item.id ? 'bg-primary/10' : ''} ${item._invalid ? 'bg-destructive/5' : ''}`}>
                    <TableCell className="py-2.5">
                      <div className="font-medium text-[13px] leading-tight break-words">{item.productName}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {item.brandName} &bull; {item.categoryName} &bull; {item.feedTypeName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="text-[10px] text-secondary tracking-tight font-medium bg-secondary/10 inline-flex px-1.5 py-0.5 rounded-sm">
                          {item.packagingName}
                        </div>
                        {item._invalid && (
                          <div className="text-[10px] text-destructive tracking-tight font-medium bg-destructive/10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm">
                            <AlertCircle className="h-3 w-3" />
                            {item._invalidReason || 'Item unavailable'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {editingItemId === item.id ? (
                      <TableCell colSpan={3} className="py-2.5 align-top">
                        <div className="flex items-center gap-2 justify-end mt-[-2px]">
                          <Input
                            ref={editInputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="h-10 w-16 text-right tabular-nums px-2"
                            value={editingQuantity}
                            onChange={e => setEditingQuantity(e.target.value.replace(/[^0-9]/g, ''))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEditing(item);
                              if (e.key === 'Escape') cancelEditing(item.id);
                            }}
                            aria-label="Edit Quantity"
                          />
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => saveEditing(item)} className="h-10 w-10 text-green-600 hover:text-green-700 hover:bg-green-50" aria-label="Save quantity">
                              <Check className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => cancelEditing(item.id)} className="h-10 w-10 text-muted-foreground hover:text-foreground" aria-label="Cancel editing">
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="py-2.5 text-right align-top tabular-nums">
                          <div className="font-semibold text-sm">{item.quantity}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">bags</div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right align-top tabular-nums">
                          <div className="font-semibold text-sm">{item.weightQuintals.toFixed(2)}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">Qtl</div>
                        </TableCell>
                        <TableCell className="py-2.5 pr-2 w-[48px] align-top">
                          <div className="flex flex-col gap-1 mt-[-2px]">
                            <Button id={`edit-btn-${item.id}-${isMobile?'mobile':'desktop'}`} variant="ghost" size="icon" aria-label={`Edit ${item.productName}`} className="h-10 w-10 text-muted-foreground hover:text-foreground transition-colors" onClick={() => startEditing(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label={`Remove ${item.productName}`} className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => {
                              const index = items.findIndex(i => i.id === item.id);
                              handleRemoveItem(item, index);
                              // Move focus away from deleted button
                              const searchInput = document.getElementById('product-search-input');
                              searchInput?.focus();
                            }}>
                              <Trash2 className="h-4 w-4" />
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
            <div className="sticky bottom-4 mx-4 mt-4 bg-foreground text-background text-sm p-3 rounded-lg shadow-md flex items-center justify-between z-50">
              <span className="truncate pr-2 font-medium">Removed {lastDeletedItem.item.productName}</span>
              <Button size="sm" variant="ghost" className="h-10 text-xs hover:bg-background/20 text-background hover:text-background font-medium px-2" onClick={() => {
                handleUndoRemove();
              }}>
                <Undo className="h-4 w-4 mr-1.5" /> Undo
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card shrink-0 space-y-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total line items</span>
              <span className="font-medium text-foreground tabular-nums">{items.length}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total bags</span>
              <span className="font-medium text-foreground tabular-nums">{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
            </div>
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-border">
              <span className="font-medium text-foreground">Total weight</span>
              <span className="font-bold text-lg text-secondary tabular-nums">{totalOrderWeight.toFixed(2)} <span className="text-muted-foreground text-sm font-normal">Qtl</span></span>
            </div>
          </div>
          {submitMessage && submitStatus !== 'idle' && (
            <div className={`text-sm p-3 rounded-md flex items-start gap-2 ${
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
          <Button 
            size="lg" 
            onClick={handleReviewRequest} 
            disabled={submitStatus === 'saving' || submitStatus === 'saved'} 
            className="w-full font-semibold relative h-12"
          >
            <div className={`flex items-center justify-center transition-opacity ${submitStatus === 'saving' ? 'opacity-0' : 'opacity-100'}`}>
              {submitStatus === 'save_error' ? <Undo className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {submitStatus === 'save_error' ? 'Review & retry' : 'Save order'}
            </div>
            {submitStatus === 'saving' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </div>
            )}
          </Button>
          
          {(items.length > 0 || partyName || location) && submitStatus !== 'saved' && (
            <Button 
              variant={showDiscardConfirm ? "destructive" : "ghost"} 
              onClick={() => {
                if (showDiscardConfirm) discardDraft();
                else setShowDiscardConfirm(true);
              }}
              onBlur={() => setShowDiscardConfirm(false)}
              className="w-full mt-2 h-12"
            >
              {showDiscardConfirm ? 'Click to Confirm Discard' : 'Discard Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full p-4 lg:p-6 gap-6 pb-32 lg:pb-6 items-start">
      <h1 className="sr-only">New Order</h1>
      <div className="sr-only" aria-live="polite">{mergeAnnouncement}</div>
      {/* Left Column: Entry Forms */}
      <div className="flex-1 flex flex-col gap-6 w-full">
        {draftRestored && (
          <div className="bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-300 p-3 rounded-lg text-sm font-medium flex items-center justify-between border border-sky-100 dark:border-sky-800">
            <span>Draft restored from your recent session.</span>
            <Button variant="ghost" size="sm" onClick={() => setDraftRestored(false)} className="h-6 w-6 p-0 hover:bg-sky-200/50 dark:hover:bg-sky-800/50">
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        )}
        
        {/* Structural Order Header */}
        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 items-start sm:items-center">
          <div className="space-y-1.5 flex-1 w-full">
            <Label htmlFor="party-name" className="text-xs font-semibold text-muted-foreground">Party name <span className="text-destructive" aria-hidden="true">*</span></Label>
            <AutocompleteInput 
              id="party-name"
              value={partyName}
              onChange={(v) => { if (formErrors.partyName) setFormErrors(prev => ({...prev, partyName: undefined})); setPartyName(v); }}
              options={partyOptions}
              placeholder="Select or type party…"
              aria-invalid={!!formErrors.partyName}
              allowCreation={true}
              onCreate={(val) => setCreatedParties(prev => [...prev, val])}
            />
            {formErrors.partyName && <span className="text-xs text-destructive font-medium block mt-1">{formErrors.partyName}</span>}
          </div>
          <div className="space-y-1.5 flex-1 w-full">
            <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground">Location <span className="text-destructive" aria-hidden="true">*</span></Label>
            <AutocompleteInput 
              id="location"
              value={location}
              onChange={(v) => { if (formErrors.location) setFormErrors(prev => ({...prev, location: undefined})); setLocation(v); }}
              options={partyName ? locationOptionsForParty : []}
              placeholder={partyName ? "Select or type location…" : "Select a party first"}
              aria-invalid={!!formErrors.location}
              allowCreation={!!partyName}
              onCreate={(val) => setCreatedLocations(prev => ({...prev, [partyName]: [...(prev[partyName] || []), val]}))}
            />
            {formErrors.location && <span className="text-xs text-destructive font-medium block mt-1">{formErrors.location}</span>}
          </div>
        </div>

        {/* Add Line Item Section */}
        <div className="border border-border rounded-xl bg-card">
          <div className="py-3 px-4 border-b flex flex-col sm:flex-row justify-between items-start gap-4">
            <h2 className="text-base font-semibold pt-1">Add Line Item</h2>
            <ProductSearchAutocomplete 
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onSelectProduct={handleAutocompleteSelect} 
            />
          </div>
          <div className="p-4 flex flex-col gap-5">
            {/* Quick Add row */}
            {quickAddItems.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center" aria-label="Frequently Used Items">
                <span className="text-xs text-muted-foreground font-semibold mr-1">Frequently used:</span>
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
                  
                  const labelContext = `${prod.name}${displayPkg ? ` with ${displayPkg}` : ''}`;
                  
                  return (
                    <Button 
                      key={`${item.productId}-${item.packagingId || 'any'}`}
                      variant="outline" 
                      size="sm" 
                      aria-label={`Quickly populate ${labelContext}`}
                      onClick={() => handleAutocompleteSelect(item.productId, item.packagingId)} 
                      className="h-auto py-1 text-xs bg-background text-left max-w-[200px] flex items-center"
                      title={labelContext}
                    >
                      <span className="truncate">{prod.name}</span>
                      {displayPkg && <span className="text-muted-foreground ml-1 shrink-0">({displayPkg})</span>}
                      <Plus className="ml-1 h-3 w-3 shrink-0" aria-hidden="true" />
                    </Button>
                  );
                })}
              </div>
            )}

            {/* Entry Form */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 focus-within:text-secondary">
                  <Label id="label-brand" className="text-xs font-semibold">Brand</Label>
                  <Select value={selectedBrandId} onValueChange={handleBrandChange}>
                    <SelectTrigger aria-labelledby="label-brand" className="bg-background"><SelectValue placeholder="Select brand">{availableBrands.find(b => b.id === selectedBrandId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {availableBrands.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 focus-within:text-secondary">
                  <Label id="label-category" className="text-xs font-semibold">Category</Label>
                  <Select value={selectedCategoryId} onValueChange={handleCategoryChange} disabled={!selectedBrandId}>
                    <SelectTrigger aria-labelledby="label-category" ref={categoryTriggerRef} className="bg-background disabled:opacity-50"><SelectValue placeholder={!selectedBrandId ? "Select brand first" : "Select category"}>{availableCategories.find(c => c.id === selectedCategoryId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {availableCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 focus-within:text-secondary">
                  <Label id="label-feed-type" className="text-xs font-semibold">Feed type</Label>
                  <Select value={selectedFeedTypeId} onValueChange={handleFeedTypeChange} disabled={!selectedCategoryId}>
                    <SelectTrigger aria-labelledby="label-feed-type" className="bg-background disabled:opacity-50"><SelectValue placeholder={!selectedCategoryId ? "Select category first" : "Select feed type"}>{availableFeedTypes.find(ft => ft.id === selectedFeedTypeId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {availableFeedTypes.map(ft => (
                        <SelectItem key={ft.id} value={ft.id}>{ft.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="space-y-1.5 focus-within:text-secondary flex-1">
                  <Label id="label-product" className="text-xs font-semibold">Product</Label>
                  <Select value={selectedProductId} onValueChange={handleProductChange} disabled={!selectedFeedTypeId}>
                    <SelectTrigger aria-labelledby="label-product" className="bg-background disabled:opacity-50"><SelectValue placeholder={!selectedFeedTypeId ? "Select feed type first" : "Select product"}>{availableProducts.find(p => p.id === selectedProductId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {availableProducts.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 focus-within:text-secondary w-full sm:w-36">
                  <Label id="label-packaging" className="text-xs font-semibold">Packaging</Label>
                  <Select value={selectedPackagingId} onValueChange={(val) => {
                    setSelectedPackagingId(val);
                    setQuantity("");
                  }} disabled={!selectedProductId}>
                    <SelectTrigger id="packaging-trigger" aria-labelledby="label-packaging" className="bg-background disabled:opacity-50"><SelectValue placeholder={!selectedProductId ? "Select product first" : "Select packaging"}>{availablePackaging.find(pkg => pkg.id === selectedPackagingId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>
                      {availablePackaging.map(pkg => (
                        <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 focus-within:text-secondary w-full sm:w-28 relative">
                  <Label htmlFor="quantity-input" className="text-xs font-semibold flex justify-between">
                    <span>Qty (bags)</span>
                  </Label>
                  <Input 
                    id="quantity-input"
                    ref={quantityRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder=""
                    aria-invalid={!!quantityError}
                    aria-errormessage={quantityError ? "quantity-error" : undefined}
                    className="bg-background text-right font-medium tabular-nums"
                    value={quantity}
                    onChange={e => {
                      setQuantity(e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (isQuantityValid) {
                          handleAddItem();
                        }
                      }
                    }}
                    disabled={!selectedProductId || !selectedPackagingId}
                  />
                  {quantityError && quantity !== "" && (
                    <div id="quantity-error" className="absolute -bottom-5 left-0 text-[10px] text-destructive whitespace-nowrap">{quantityError}</div>
                  )}
                </div>
                <div className="w-full sm:w-auto flex flex-col justify-end shrink-0 pl-1">
                  <div className="text-[11px] text-muted-foreground mb-1 mt-1 text-right sm:text-center w-full px-1 truncate max-w-[120px]" aria-live="polite">
                    {derivedKg > 0 ? `${derivedKg.toLocaleString()} kg / ${derivedQuintals} Qtl` : '0 kg'}
                  </div>
                  <Button 
                    onClick={handleAddItem} 
                    className="font-medium shrink-0 w-full sm:w-[100px] h-12 sm:h-auto"
                    disabled={!isQuantityValid}
                    aria-label={quantityError && quantity !== "" ? `Cannot add item: ${quantityError}` : 'Add item'}
                  >
                    Add item
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Current Order Panel */}
      {renderOrderCart(false)}

      {/* Mobile Sticky Action Area */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm px-1">
            <div className="font-medium text-foreground">
              {items.length} items <span className="text-muted-foreground mx-1">•</span> {items.reduce((sum, i) => sum + i.quantity, 0)} bags
            </div>
            <div className="font-bold text-lg text-secondary">
              {totalOrderWeight.toFixed(2)} <span className="text-muted-foreground text-sm font-normal">Qtl</span>
            </div>
          </div>
          {submitMessage && submitStatus !== 'idle' && (
            <div className={`text-xs p-2.5 rounded-md flex items-start gap-2 ${
              submitStatus === 'saved' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
              submitStatus === 'validation_error' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
              submitStatus === 'save_error' ? 'bg-destructive/10 text-destructive' :
              'bg-muted text-muted-foreground'
            }`}>
              {(submitStatus === 'validation_error' || submitStatus === 'save_error') ? <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : 
               submitStatus === 'saved' ? <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : null}
              <span className="leading-snug">{submitMessage}</span>
            </div>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button size="lg" className="w-full font-semibold h-12 relative">
                View & Edit Order Summary
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col sm:max-w-none">
              <SheetHeader className="sr-only">
                <SheetTitle>Current Order</SheetTitle>
                <SheetDescription>Review and modify your order items before submitting.</SheetDescription>
              </SheetHeader>
              {renderOrderCart(true)}
            </SheetContent>
          </Sheet>

        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={(open) => !open && submitStatus !== 'saving' && setShowReviewDialog(false)}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30 shrink-0">
            <DialogTitle>Review order</DialogTitle>
            <DialogDescription>
              Please verify your order details before confirming.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Party</div>
                <div className="font-medium">{partyName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">Location</div>
                <div className="font-medium">{location}</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground flex justify-between">
                <span>Line items</span>
                <span>{items.length} total</span>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs py-2 h-8">Product</TableHead>
                      <TableHead className="text-xs py-2 h-8 text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} className="hover:bg-transparent">
                        <TableCell className="py-2.5">
                          <div className="font-medium text-[13px] leading-tight break-words">{item.productName}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {item.packagingName}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-medium tabular-nums align-top">
                          {item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <div className="rounded-lg bg-secondary/10 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total bags</span>
                <span className="font-medium tabular-nums">{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total weight</span>
                <span className="text-secondary tabular-nums">
                  {totalOrderWeight.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">Qtl</span>
                </span>
              </div>
            </div>
            
            {isRepeat && (
              <label className="flex items-start gap-3 p-4 bg-muted/30 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={partyLocationVerified}
                  onChange={(e) => setPartyLocationVerified(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-primary text-primary focus:ring-primary"
                />
                <span className="text-sm">
                  <span className="font-medium block mb-0.5">Verify order details</span>
                  <span className="text-muted-foreground">I have verified that the party ({partyName}) and location ({location}) are correct for this new order.</span>
                </span>
              </label>
            )}

            {submitMessage && submitStatus === 'save_error' && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="leading-snug">{submitMessage}</span>
              </div>
            )}
          </div>
          
          <DialogFooter className="px-6 py-4 border-t bg-card shrink-0 grid sm:grid-cols-2 gap-2 sm:space-x-0">
            <Button 
              variant="outline" 
              onClick={() => setShowReviewDialog(false)}
              disabled={submitStatus === 'saving'}
            >
              Back to edit
            </Button>
            <Button 
              onClick={executeSaveOrder}
              disabled={submitStatus === 'saving' || (isRepeat && !partyLocationVerified)}
              className="relative"
            >
              <div className={`flex items-center justify-center transition-opacity ${submitStatus === 'saving' ? 'opacity-0' : 'opacity-100'}`}>
                {submitStatus === 'save_error' ? <Undo className="h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {submitStatus === 'save_error' ? 'Retry Save' : 'Confirm & Save'}
              </div>
              {submitStatus === 'saving' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

