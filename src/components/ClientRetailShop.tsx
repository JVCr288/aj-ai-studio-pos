import React, { useState, useMemo, useEffect } from 'react';
import { ClientProduct, ClientCartItem, BookingState, WorkspaceView } from '../types';
import {
  CLIENT_PRODUCT_CATEGORIES,
  INITIAL_CLIENT_PRODUCTS,
} from '../data/clientProductsData';
import {
  ShoppingBag,
  Sparkles,
  Search,
  Plus,
  Check,
  Package,
  Clock,
  Layers,
  ArrowRight,
  X,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Receipt,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Eye,
} from 'lucide-react';

interface ClientRetailShopProps {
  bookingState: BookingState;
  onNavigateToBooking?: () => void;
  onNavigateToStudioGear?: () => void;
  workspaceView?: WorkspaceView;
}

const STORAGE_KEY = 'akk_client_retail_products_v1';
const CART_STORAGE_KEY = 'akk_client_cart_v1';

export const ClientRetailShop: React.FC<ClientRetailShopProps> = ({
  bookingState,
  onNavigateToBooking,
  onNavigateToStudioGear,
  workspaceView = 'compact',
}) => {
  // Products list from localStorage or fallback
  const [products, setProducts] = useState<ClientProduct[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return INITIAL_CLIENT_PRODUCTS;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  // Cart state
  const [cart, setCart] = useState<ClientCartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Modals
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<ClientProduct | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [orderConfirmedData, setOrderConfirmedData] = useState<{
    orderId: string;
    items: ClientCartItem[];
    totalMMK: number;
    guestName: string;
    clientPhone: string;
    date: string;
  } | null>(null);

  // Client info for checkout
  const [checkoutName, setCheckoutName] = useState(bookingState.guestName || '');
  const [checkoutPhone, setCheckoutPhone] = useState(bookingState.clientPhone || '');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdMyanmarName, setNewProdMyanmarName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<ClientProduct['category']>('frames_canvas');
  const [newProdPrice, setNewProdPrice] = useState<number>(50000);
  const [newProdStock, setNewProdStock] = useState<number>(10);
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdLeadTime, setNewProdLeadTime] = useState('2 to 3 Days');
  const [newProdDimensions, setNewProdDimensions] = useState('12 x 18 inches');
  const [newProdImageUrl, setNewProdImageUrl] = useState(
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80'
  );
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdMyanmarDesc, setNewProdMyanmarDesc] = useState('');
  const [newProdFeatures, setNewProdFeatures] = useState('High quality finish\nHandcrafted in studio\nUV protective coating');

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = prod.name.toLowerCase().includes(q);
        const matchMyan = prod.myanmarName.toLowerCase().includes(q);
        const matchSku = prod.sku.toLowerCase().includes(q);
        const matchDesc = prod.description.toLowerCase().includes(q);
        if (!matchName && !matchMyan && !matchSku && !matchDesc) return false;
      }

      // Category
      if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
        return false;
      }

      // Stock
      if (onlyInStock && prod.stockCount <= 0 && prod.availability !== 'made_to_order') {
        return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, onlyInStock]);

  // Cart actions
  const addToCart = (product: ClientProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as ClientCartItem[];
    });
  };

  const cartTotalMMK = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + item.product.priceMMK * item.quantity,
      0
    );
  }, [cart]);

  const totalCartItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Quick stock adjuster for studio staff
  const handleAdjustStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const updated = Math.max(0, item.stockCount + delta);
          return {
            ...item,
            stockCount: updated,
            availability: updated === 0 && item.availability !== 'made_to_order' ? 'out_of_stock' : item.availability,
          };
        }
        return item;
      })
    );
  };

  // Add new product submit
  const handleAddNewProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || !newProdMyanmarName.trim()) return;

    const newProduct: ClientProduct = {
      id: `prod-custom-${Date.now()}`,
      name: newProdName.trim(),
      myanmarName: newProdMyanmarName.trim(),
      category: newProdCategory,
      priceMMK: Number(newProdPrice) || 50000,
      stockCount: Number(newProdStock) || 5,
      availability: Number(newProdStock) > 0 ? 'in_stock' : 'pre_order',
      sku: newProdSku.trim() || `AKK-RET-${Math.floor(1000 + Math.random() * 9000)}`,
      leadTime: newProdLeadTime.trim() || '2 to 3 Days',
      dimensions: newProdDimensions.trim() || undefined,
      imageUrl: newProdImageUrl.trim() || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
      description: newProdDescription.trim() || 'Studio archival fine art retail item.',
      myanmarDescription: newProdMyanmarDesc.trim() || 'စတူဒီယို သီးသန့် အဆင့်မြင့် ပစ္စည်း ဖြစ်ပါသည်။',
      features: newProdFeatures
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    };

    setProducts((prev) => [newProduct, ...prev]);
    setIsAddProductModalOpen(false);

    // Reset form
    setNewProdName('');
    setNewProdMyanmarName('');
    setNewProdPrice(50000);
    setNewProdStock(10);
    setNewProdSku('');
    setNewProdDescription('');
    setNewProdMyanmarDesc('');
  };

  // Reset default products
  const handleResetCatalog = () => {
    if (window.confirm('Reset retail catalog back to default studio items?')) {
      setProducts(INITIAL_CLIENT_PRODUCTS);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Confirm client order checkout
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderId = `ORD-RET-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderConfirmedData({
      orderId,
      items: [...cart],
      totalMMK: cartTotalMMK,
      guestName: checkoutName || bookingState.guestName || 'Valued Client',
      clientPhone: checkoutPhone || bookingState.clientPhone || '09-XXXXXXXXX',
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    });

    // Deduct stock
    setProducts((prev) =>
      prev.map((item) => {
        const inCart = cart.find((c) => c.product.id === item.id);
        if (inCart) {
          const newStock = Math.max(0, item.stockCount - inCart.quantity);
          return {
            ...item,
            stockCount: newStock,
            availability: newStock === 0 && item.availability !== 'made_to_order' ? 'out_of_stock' : item.availability,
          };
        }
        return item;
      })
    );

    // Clear cart
    setCart([]);
    setIsCartDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#071423] text-[#F1F5F9] flex flex-col pb-16">
      {/* Top Breadcrumb & Status Bar */}
      <div className="border-b border-[#1E3A4F] bg-[#0B1B2B]/80 backdrop-blur-sm sticky top-18 z-40">
        <div
          className={`w-full mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-ui transition-[max-width] duration-300 ${
            workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-[#7E8F9F] font-ui">STORE</span>
            <span className="text-[#1E3A4F]">/</span>
            <span className="text-[#38BDF8] font-ui font-semibold tracking-wide">
              Client Retail Boutique (ရောင်းချသော ပစ္စည်းများ)
            </span>
            <span className="text-[#1E3A4F]">•</span>
            <span className="text-[#7E8F9F] text-[11px] font-ui">
              {products.length} products in registry
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {onNavigateToStudioGear && (
              <button
                type="button"
                onClick={onNavigateToStudioGear}
                className="px-2.5 py-1 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#94A3B8] hover:text-[#F1F5F9] font-ui text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Switch to Studio Gear / Equipment Inventory"
              >
                <Package className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>စတူဒီယိုသုံး ပစ္စည်းများ (Studio Gear)</span>
              </button>
            )}

            {/* Cart Trigger Button */}
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="px-3 py-1 rounded-lg bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] font-ui font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer relative shadow-sm focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              title="View Client Order Bag"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>မှာယူမည့် စာရင်း</span>
              {totalCartItemsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#38BDF8] text-[#071423] text-[10px] font-bold">
                  {totalCartItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <main
        className={`w-full mx-auto px-4 sm:px-6 pt-6 flex-1 space-y-6 transition-[max-width] duration-300 ${
          workspaceView === 'full' ? 'max-w-[1720px]' : 'max-w-[1240px]'
        }`}
      >
        {/* Header Hero Section */}
        <section className="glass-plate hairline-copper-top border border-[rgba(120,165,190,0.18)] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8] text-xs font-ui font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AKK Studio Atelier Store &amp; Add-ons</span>
              </div>
              <h1 className="font-ui font-bold text-2xl sm:text-3xl text-[#F1F5F9] tracking-tight">
                Client ကို ရောင်းချ ပေးသော ပစ္စည်းများ
              </h1>
              <p className="text-[#7E8F9F] text-sm font-ui leading-relaxed">
                ပြတိုက်အဆင့် ဖလိုတင်း ကင်းဗတ်စ် မှန်ဘောင်များ၊ အီတလီ သားရေချုပ်
                အယ်လ်ဘမ်များ၊ လေဆာထွင်း သစ်သား USB Drive များနှင့် 35mm ဖလင်လိပ်
                များကို ဈေးနှုန်း MMK ဖြင့် စနစ်တကျ ရွေးချယ် မှာယူနိုင်ပါသည်။
              </p>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>ပစ္စည်းအသစ် ထည့်သွင်းမည်</span>
              </button>

              <button
                type="button"
                onClick={handleResetCatalog}
                className="px-3 py-2.5 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] font-ui text-xs flex items-center space-x-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                title="Reset to initial catalog"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#7E8F9F]" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 pt-5 border-t border-[#1E3A4F]/80 grid grid-cols-2 sm:grid-cols-4 gap-4 font-ui text-xs">
            <div className="bg-[#102538]/60 rounded-xl p-3 border border-[#1E3A4F]/60">
              <span className="text-[#7E8F9F] text-[11px] block">
                Total Products
              </span>
              <span className="font-ui font-bold text-lg text-[#F1F5F9] tabular-nums">
                {products.length} Items
              </span>
            </div>
            <div className="bg-[#102538]/60 rounded-xl p-3 border border-[#1E3A4F]/60">
              <span className="text-[#7E8F9F] text-[11px] block">
                In Stock &amp; Ready
              </span>
              <span className="font-ui font-bold text-lg text-[#34D399] tabular-nums">
                {products.filter((p) => p.stockCount > 0).length} Ready
              </span>
            </div>
            <div className="bg-[#102538]/60 rounded-xl p-3 border border-[#1E3A4F]/60">
              <span className="text-[#7E8F9F] text-[11px] block">
                Made to Order / Handcrafted
              </span>
              <span className="font-ui font-bold text-lg text-[#38BDF8] tabular-nums">
                {products.filter((p) => p.availability === 'made_to_order').length} Custom
              </span>
            </div>
            <div className="bg-[#102538]/60 rounded-xl p-3 border border-[#1E3A4F]/60">
              <span className="text-[#7E8F9F] text-[11px] block">
                Cart Items Selected
              </span>
              <span className="font-ui font-bold text-lg text-[#38BDF8] tabular-nums">
                {totalCartItemsCount} In Bag
              </span>
            </div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="glass-plate border border-[rgba(120,165,190,0.16)] rounded-2xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7E8F9F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ရှာဖွေရန်... (Search product, Myanmar name, or SKU like AKK-CAN-1624)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] placeholder-[#7E8F9F] text-xs font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8F9F] hover:text-[#F1F5F9]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* In-Stock Toggle */}
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-xs font-ui text-[#94A3B8] cursor-pointer select-none bg-[#102538] px-3.5 py-2 rounded-xl border border-[#1E3A4F] hover:border-[#38BDF8]/40 transition-colors">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded border-[#1E3A4F] text-[#38BDF8] focus:ring-0 bg-[#030F1E]"
                />
                <span>လက်ကျန်ရှိသော ပစ္စည်းများသာ (In Stock Only)</span>
              </label>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {CLIENT_PRODUCT_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-ui text-xs whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 focus:outline-none focus:ring-1 focus:ring-[#38BDF8] ${
                    isSelected
                      ? 'bg-[#38BDF8] text-[#071423] font-semibold shadow-sm'
                      : 'bg-[#102538] hover:bg-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F]'
                  }`}
                >
                  <span>{cat.myanmarLabel}</span>
                  <span className="text-[10px] opacity-75">({cat.label})</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Product Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const inCart = cart.find((item) => item.product.id === product.id);

            return (
              <div
                key={product.id}
                className="bg-[#0B1B2B] border border-[#1E3A4F] hover:border-[#38BDF8]/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 group"
              >
                {/* Product Image Stage */}
                <div className="relative h-56 w-full bg-[#030F1E] overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B2B] via-transparent to-black/30" />

                  {/* Badges Top Left & Right */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {product.badge && (
                      <span className="font-ui text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#38BDF8] text-[#071423] tracking-wide shadow-sm uppercase">
                        {product.badge}
                      </span>
                    )}
                    <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#030F1E]/80 backdrop-blur-sm border border-[#1E3A4F] text-[#94A3B8]">
                      {product.sku}
                    </span>
                  </div>

                  {/* Stock Availability Pill */}
                  <div className="absolute top-3 right-3">
                    {product.availability === 'in_stock' && (
                      <span className="font-ui text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#34D399]/20 border border-[#34D399]/40 text-[#34D399]">
                        လက်ကျန် {product.stockCount} ခု
                      </span>
                    )}
                    {product.availability === 'made_to_order' && (
                      <span className="font-ui text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#38BDF8]">
                        မှာယူလုပ်ဆောင်
                      </span>
                    )}
                    {product.availability === 'out_of_stock' && (
                      <span className="font-ui text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FB7185]/20 border border-[#FB7185]/40 text-[#FB7185]">
                        ပစ္စည်းကုန်
                      </span>
                    )}
                  </div>

                  {/* Dimensions bottom pill */}
                  {product.dimensions && (
                    <div className="absolute bottom-3 left-3">
                      <span className="font-ui text-[10px] text-[#94A3B8] bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                        {product.dimensions}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-ui font-bold text-base text-[#F1F5F9] group-hover:text-[#38BDF8] transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <div className="font-ui font-medium text-xs text-[#94A3B8] line-clamp-1">
                      {product.myanmarName}
                    </div>

                    <p className="text-[#7E8F9F] text-xs font-ui leading-relaxed line-clamp-2">
                      {product.myanmarDescription || product.description}
                    </p>

                    {/* Features Snippet */}
                    <div className="pt-2 space-y-1">
                      {product.features.slice(0, 2).map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-center text-[11px] font-ui text-[#7E8F9F]"
                        >
                          <Check className="w-3 h-3 text-[#38BDF8] mr-1.5 flex-shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price & Actions Bottom */}
                  <div className="pt-3 border-t border-[#1E3A4F] space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-ui text-lg sm:text-xl font-bold text-[#38BDF8] tabular-nums">
                          {product.priceMMK.toLocaleString()} MMK
                        </span>
                        {product.originalPriceMMK && (
                          <span className="ml-2 font-ui text-xs text-[#7E8F9F] line-through tabular-nums">
                            {product.originalPriceMMK.toLocaleString()} MMK
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-ui text-[11px] text-[#7E8F9F] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#7E8F9F]" />
                          {product.leadTime}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProductForDetail(product)}
                        className="btn-secondary-action !h-10 !text-xs !py-1 !px-2 font-ui font-medium"
                        title="View detailed product specifications and options"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>View Product</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        className={`btn-primary-action !h-10 !text-xs !py-1 !px-2 font-ui font-semibold ${
                          inCart
                            ? '!bg-[#34D399] hover:!bg-[#34D399]/90 !text-[#071423] !border-[#34D399]'
                            : ''
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}</span>
                      </button>
                    </div>

                    {/* Quick Staff Stock Adjuster (Compact) */}
                    <div className="pt-1 flex items-center justify-between text-[11px] font-ui text-[#7E8F9F]">
                      <span>Staff Stock:</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(product.id, -1)}
                          disabled={product.stockCount <= 0}
                          className="w-5 h-5 rounded bg-[#102538] hover:bg-[#1E3A4F] disabled:opacity-30 border border-[#1E3A4F] text-[#F1F5F9] flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                          title="Reduce stock -1"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-[#F1F5F9] tabular-nums">
                          {product.stockCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(product.id, 1)}
                          className="w-5 h-5 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#F1F5F9] flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                          title="Increase stock +1"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Empty Search Result Fallback */}
        {filteredProducts.length === 0 && (
          <div className="bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-[#7E8F9F] mx-auto" />
            <h3 className="font-ui font-bold text-lg text-[#F1F5F9]">
              ရှာဖွေထားသော ပစ္စည်း မတွေ့ရှိပါ
            </h3>
            <p className="font-ui text-xs text-[#7E8F9F] max-w-md mx-auto">
              "{searchQuery}" နှင့် ကိုက်ညီသော ပစ္စည်းမရှိပါ။ အမည် သို့မဟုတ်
              အမျိုးအစား ပြန်လည်ရွေးချယ်ပေးပါ။
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setOnlyInStock(false);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] text-xs font-ui text-[#38BDF8] border border-[#1E3A4F] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
            >
              Clear Filters
            </button>
          </div>
        )}
      </main>

      {/* Cart Drawer Modal */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#071423]/80 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-[#0B1B2B] border-l border-[#1E3A4F] h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E3A4F]">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-[#38BDF8]" />
                <h2 className="font-ui font-bold text-lg text-[#F1F5F9]">
                  Client မှာယူမည့် စာရင်း (Cart)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-[#102538] hover:bg-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 py-4 space-y-3 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-[#7E8F9F] font-ui space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto stroke-[1.5] text-[#7E8F9F]" />
                  <p className="text-sm">စာရင်းတွင် ပစ္စည်း မရှိသေးပါ</p>
                  <span className="text-xs text-[#7E8F9F]">
                    လိုချင်သော ပစ္စည်းများကို 'မှာယူမည်' နှိပ်၍ ထည့်နိုင်ပါသည်။
                  </span>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-3.5 rounded-xl bg-[#030F1E] border border-[#1E3A4F] flex items-center justify-between gap-3"
                  >
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-ui font-medium text-xs text-[#F1F5F9] truncate">
                        {item.product.name}
                      </h4>
                      <div className="font-ui text-[12px] text-[#38BDF8] font-bold tabular-nums">
                        {item.product.priceMMK.toLocaleString()} MMK
                      </div>
                      <div className="flex items-center space-x-2 font-ui text-xs">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#F1F5F9] flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                        >
                          -
                        </button>
                        <span className="font-bold text-[#F1F5F9] px-1 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded bg-[#102538] hover:bg-[#1E3A4F] border border-[#1E3A4F] text-[#F1F5F9] flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-2 text-[#7E8F9F] hover:text-[#FB7185] transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Checkout Footer */}
            {cart.length > 0 && (
              <form
                onSubmit={handleCheckoutSubmit}
                className="pt-4 border-t border-[#1E3A4F] space-y-3 font-ui"
              >
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#7E8F9F]">
                    <span>စုစုပေါင်း ပစ္စည်းအရေအတွက်:</span>
                    <span className="text-[#F1F5F9] font-medium tabular-nums">{totalCartItemsCount} ခု</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-1">
                    <span className="text-[#F1F5F9]">ကျသင့်ငွေ စုစုပေါင်း:</span>
                    <span className="text-[#38BDF8] text-base tabular-nums">
                      {cartTotalMMK.toLocaleString()} MMK
                    </span>
                  </div>
                </div>

                {/* Client Contact Inputs */}
                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#7E8F9F] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      placeholder="Client အမည် (Guest Name)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-xs text-[#F1F5F9] placeholder-[#7E8F9F] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#7E8F9F] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={checkoutPhone}
                      onChange={(e) => setCheckoutPhone(e.target.value)}
                      placeholder="ဖုန်းနံပါတ် (KBZPay / WavePay)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-xs text-[#F1F5F9] placeholder-[#7E8F9F] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <Receipt className="w-4 h-4" />
                  <span>အော်ဒါ အတည်ပြုမည် (Generate Slip)</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Order Confirmed Receipt Modal */}
      {orderConfirmedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071423]/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0B1B2B] border border-[#34D399]/40 rounded-2xl p-6 shadow-2xl space-y-4 font-ui text-xs">
            <div className="text-center space-y-2 pb-3 border-b border-[#1E3A4F]">
              <div className="w-12 h-12 rounded-full bg-[#34D399]/20 text-[#34D399] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="font-ui font-bold text-lg text-[#F1F5F9]">
                Client Order Confirmed!
              </h3>
              <p className="text-[#7E8F9F] text-xs font-ui">
                ပစ္စည်းများ မှာယူမှု အောင်မြင်ပါသည်။ စတူဒီယိုမှ ပြင်ဆင်ဆောင်ရွက်ပေးပါမည်။
              </p>
            </div>

            <div className="bg-[#030F1E] rounded-xl p-4 space-y-2 border border-[#1E3A4F]">
              <div className="flex justify-between text-[#7E8F9F]">
                <span>Order ID:</span>
                <span className="text-[#38BDF8] font-mono font-bold">
                  {orderConfirmedData.orderId}
                </span>
              </div>
              <div className="flex justify-between text-[#7E8F9F]">
                <span>Client Name:</span>
                <span className="text-[#F1F5F9] font-medium">
                  {orderConfirmedData.guestName}
                </span>
              </div>
              <div className="flex justify-between text-[#7E8F9F]">
                <span>Phone:</span>
                <span className="text-[#F1F5F9] font-medium">{orderConfirmedData.clientPhone}</span>
              </div>
              <div className="flex justify-between text-[#7E8F9F]">
                <span>Date:</span>
                <span className="text-[#F1F5F9] font-medium">{orderConfirmedData.date}</span>
              </div>

              <div className="pt-2 border-t border-[#1E3A4F] space-y-1.5">
                <span className="text-[#7E8F9F] text-[11px] block">
                  Items Ordered:
                </span>
                {orderConfirmedData.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between text-[#F1F5F9] text-[11px]"
                  >
                    <span>
                      {it.product.name} (x{it.quantity})
                    </span>
                    <span className="text-[#38BDF8] font-bold tabular-nums">
                      {(it.product.priceMMK * it.quantity).toLocaleString()} MMK
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#1E3A4F] flex justify-between text-sm font-bold">
                <span className="text-[#F1F5F9]">Total Payable:</span>
                <span className="text-[#34D399] tabular-nums">
                  {orderConfirmedData.totalMMK.toLocaleString()} MMK
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#102538]/70 border border-[#1E3A4F] text-[11px] text-[#7E8F9F] space-y-1">
              <span className="text-[#F1F5F9] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Payment Notice:</span>
              </span>
              <p>
                ငွေပေးချေမှုကို စတူဒီယို ကောင်တာတွင် KBZPay / WavePay သို့မဟုတ် Cash
                ဖြင့် ပေးချေနိုင်ပါသည်။
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderConfirmedData(null)}
                className="w-full py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                Close &amp; Continue Shopping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071423]/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="relative h-64 w-full bg-[#030F1E]">
              <img
                src={selectedProductForDetail.imageUrl}
                alt={selectedProductForDetail.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedProductForDetail(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedProductForDetail.badge && (
                <span className="absolute top-4 left-4 font-ui text-[11px] font-bold px-3 py-1 rounded-md bg-[#38BDF8] text-[#071423]">
                  {selectedProductForDetail.badge}
                </span>
              )}
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="space-y-1">
                <span className="font-mono text-[11px] text-[#38BDF8] font-semibold">
                  SKU: {selectedProductForDetail.sku}
                </span>
                <h2 className="font-ui font-bold text-xl text-[#F1F5F9]">
                  {selectedProductForDetail.name}
                </h2>
                <div className="font-ui text-sm text-[#94A3B8]">
                  {selectedProductForDetail.myanmarName}
                </div>
              </div>

              <div className="flex items-center space-x-4 font-ui text-sm">
                <span className="text-xl font-bold text-[#38BDF8] tabular-nums">
                  {selectedProductForDetail.priceMMK.toLocaleString()} MMK
                </span>
                {selectedProductForDetail.dimensions && (
                  <span className="px-2.5 py-1 rounded bg-[#102538] border border-[#1E3A4F] text-[#7E8F9F] text-xs">
                    {selectedProductForDetail.dimensions}
                  </span>
                )}
                <span className="text-xs text-[#7E8F9F]">
                  Lead Time: {selectedProductForDetail.leadTime}
                </span>
              </div>

              <p className="text-[#94A3B8] text-xs font-ui leading-relaxed">
                {selectedProductForDetail.myanmarDescription}
              </p>
              <p className="text-[#7E8F9F] text-xs font-ui leading-relaxed">
                {selectedProductForDetail.description}
              </p>

              <div className="space-y-2 pt-2 border-t border-[#1E3A4F]">
                <h4 className="font-ui font-semibold text-xs text-[#F1F5F9] uppercase">
                  Technical Specifications &amp; Craft:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedProductForDetail.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center text-xs font-ui text-[#F1F5F9] bg-[#030F1E] p-2 rounded-lg border border-[#1E3A4F]"
                    >
                      <Check className="w-3.5 h-3.5 text-[#38BDF8] mr-2 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedProductForDetail(null)}
                  className="px-4 py-2 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] text-xs font-ui text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedProductForDetail);
                    setSelectedProductForDetail(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs flex items-center space-x-2 cursor-pointer shadow-md focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Order Bag (မှာယူမည်)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071423]/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0B1B2B] border border-[#1E3A4F] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A4F]">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-[#38BDF8]" />
                <h3 className="font-ui font-bold text-lg text-[#F1F5F9]">
                  ပစ္စည်းအသစ် ထည့်သွင်းမည် (Add Client Retail Item)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#102538] text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F] focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewProductSubmit} className="space-y-4 font-ui text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    Item Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Handmade Wood Box Frame"
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] placeholder-[#7E8F9F] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    မြန်မာအမည် (Myanmar Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdMyanmarName}
                    onChange={(e) => setNewProdMyanmarName(e.target.value)}
                    placeholder="ဥပမာ- သစ်သားဘောင် ပန်းချီချပ် (12 x 18)"
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] placeholder-[#7E8F9F] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    အမျိုးအစား (Category)
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) =>
                      setNewProdCategory(e.target.value as ClientProduct['category'])
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  >
                    <option value="frames_canvas">Prints &amp; Canvas</option>
                    <option value="photo_albums">Photobooks &amp; Albums</option>
                    <option value="storage_media">Archival USB &amp; Media</option>
                    <option value="film_supplies">Film Rolls</option>
                    <option value="studio_merch">Studio Merchandise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    Price (MMK) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-ui tabular-nums focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-ui tabular-nums focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="AKK-NEW-01"
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    Dimensions / Size
                  </label>
                  <input
                    type="text"
                    value={newProdDimensions}
                    onChange={(e) => setNewProdDimensions(e.target.value)}
                    placeholder="12 x 18 inches"
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] text-[11px] mb-1">
                    Lead Time
                  </label>
                  <input
                    type="text"
                    value={newProdLeadTime}
                    onChange={(e) => setNewProdLeadTime(e.target.value)}
                    placeholder="2 to 3 Days"
                    className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] text-[11px] mb-1">
                  Image URL (Direct link)
                </label>
                <input
                  type="url"
                  value={newProdImageUrl}
                  onChange={(e) => setNewProdImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] font-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] text-[11px] mb-1">
                  မြန်မာလို ဖော်ပြချက် (Myanmar Description)
                </label>
                <textarea
                  rows={2}
                  value={newProdMyanmarDesc}
                  onChange={(e) => setNewProdMyanmarDesc(e.target.value)}
                  placeholder="ပစ္စည်း၏ အကျဉ်းချုပ် အချက်အလက်များ..."
                  className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] placeholder-[#7E8F9F] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] text-[11px] mb-1">
                  Features (1 line per feature)
                </label>
                <textarea
                  rows={3}
                  value={newProdFeatures}
                  onChange={(e) => setNewProdFeatures(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#030F1E] border border-[#1E3A4F] text-[#F1F5F9] placeholder-[#7E8F9F] font-ui focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#102538] hover:bg-[#1E3A4F] text-[#7E8F9F] hover:text-[#F1F5F9] border border-[#1E3A4F] font-ui text-xs focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#071423] font-ui font-semibold text-xs shadow-md focus:outline-none focus:ring-1 focus:ring-[#38BDF8]"
                >
                  Add Product (စာရင်းသွင်းမည်)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
