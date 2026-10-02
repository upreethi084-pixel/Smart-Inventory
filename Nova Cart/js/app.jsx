/**
 * NOVA SmartStock - Complete Functional React Application
 * Built for PROMPTWARS - BUSINESS RESCUE CHALLENGE (NOVA CART)
 */

const { useState, useEffect, useMemo, useRef } = React;

// Main Application Component
function NovaSmartStockApp() {
  // --- Persistent State ---
  const [stores, setStores] = useState(() => {
    const saved = localStorage.getItem("nova_stores");
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });

  const [activeStoreId, setActiveStoreId] = useState("NC-BLR-042");

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem("nova_products");
    const raw = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    return enrichProductsWithRisk(raw);
  });

  // Current active navigation tab
  // 'dashboard' | 'inventory' | 'riskMonitor' | 'priorityActions' | 'alerts' | 'impact' | 'storeProfile' | 'operationsView' | 'diagnosis' | 'about'
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("All");
  const [selectedStockFilter, setSelectedStockFilter] = useState("All");
  const [sortField, setSortField] = useState("riskScore");
  const [sortOrder, setSortOrder] = useState("desc");

  // Modals & Drawers
  const [editingProduct, setEditingProduct] = useState(null); // for Quick Update modal
  const [riskDetailProduct, setRiskDetailProduct] = useState(null); // for Factor Breakdown
  const [editStockVal, setEditStockVal] = useState(0);
  const [editAvailableVal, setEditAvailableVal] = useState(true);

  // Resolved Priority Actions tracking
  const [resolvedIds, setResolvedIds] = useState(() => {
    const saved = localStorage.getItem("nova_resolved_ids");
    return saved ? JSON.parse(saved) : [];
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Business Impact simulation parameters
  const [impactParams, setImpactParams] = useState({
    currentRate: 11.0,
    targetRate: 8.0,
    storeAdoptionPct: 75,
    aov: 486,
    monthlyOrders: 38500
  });

  // Guided Demo state (0 = inactive, 1-10 = active steps)
  const [demoStep, setDemoStep] = useState(0);

  // Active Store object
  const activeStore = useMemo(() => {
    return stores.find(s => s.id === activeStoreId) || stores[0];
  }, [stores, activeStoreId]);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("nova_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("nova_stores", JSON.stringify(stores));
  }, [stores]);

  useEffect(() => {
    localStorage.setItem("nova_resolved_ids", JSON.stringify(resolvedIds));
  }, [resolvedIds]);

  // Toast Helper
  const showToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Reset to initial seed data
  const handleResetData = () => {
    localStorage.removeItem("nova_products");
    localStorage.removeItem("nova_stores");
    localStorage.removeItem("nova_resolved_ids");
    setProducts(enrichProductsWithRisk(INITIAL_PRODUCTS));
    setStores(INITIAL_STORES);
    setResolvedIds([]);
    setDemoStep(0);
    showToast("Data restored to factory seed benchmarks.", "info");
  };

  // --- Computed Analytics ---
  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter(p => p.isAvailable && p.currentStock > 0).length;
    const outOfStock = products.filter(p => p.currentStock === 0 || !p.isAvailable).length;
    const critical = products.filter(p => p.riskLevel === "CRITICAL").length;
    const high = products.filter(p => p.riskLevel === "HIGH").length;
    const medium = products.filter(p => p.riskLevel === "MEDIUM").length;
    const low = products.filter(p => p.riskLevel === "LOW").length;
    const highRiskTotal = critical + high;
    const lowStock = products.filter(p => p.currentStock > 0 && p.currentStock <= 5).length;

    // Accuracy formula: 100 - weighted proportion of high risk and out of stock items
    const accuracy = Math.max(50, Math.round(100 - ((critical * 4 + high * 2.5 + outOfStock * 4) / total) * 10));

    // Estimated orders affected
    const ordersAffected = Math.round((critical * 3.5) + (high * 1.8) + (outOfStock * 4.2));
    const cancellationsPrevented = Math.round(resolvedIds.length * 2.4);

    return {
      total,
      available,
      outOfStock,
      critical,
      high,
      medium,
      low,
      highRiskTotal,
      lowStock,
      accuracy,
      ordersAffected,
      cancellationsPrevented
    };
  }, [products, resolvedIds]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchShort = p.shortName.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchShort && !matchSku && !matchCat) return false;
      }

      // Category
      if (selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }

      // Risk Level
      if (selectedRiskLevel !== "All") {
        if (selectedRiskLevel === "OUT OF STOCK" && p.currentStock > 0 && p.isAvailable) return false;
        if (selectedRiskLevel !== "OUT OF STOCK" && p.riskLevel !== selectedRiskLevel) return false;
      }

      // Availability
      if (selectedAvailability === "In Stock" && (p.currentStock === 0 || !p.isAvailable)) return false;
      if (selectedAvailability === "Out of Stock" && (p.currentStock > 0 && p.isAvailable)) return false;

      // Stock Level
      if (selectedStockFilter === "Low (<5)" && (p.currentStock > 5 || p.currentStock === 0)) return false;
      if (selectedStockFilter === "Adequate (5-20)" && (p.currentStock < 5 || p.currentStock > 20)) return false;
      if (selectedStockFilter === "High (>20)" && p.currentStock <= 20) return false;

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "name") {
        return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortOrder === "asc" ? (valA - valB) : (valB - valA);
    });
  }, [products, searchQuery, selectedCategory, selectedRiskLevel, selectedAvailability, selectedStockFilter, sortField, sortOrder]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ["All", ...Array.from(set)];
  }, [products]);

  // Priority Actions items (Top Critical & High Risk not yet resolved)
  const priorityItems = useMemo(() => {
    return products
      .filter(p => (p.riskLevel === "CRITICAL" || p.riskLevel === "HIGH" || p.currentStock === 0))
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [products]);

  // Dynamic Alerts list
  const activeAlerts = useMemo(() => {
    const list = [];
    const criticalProds = products.filter(p => p.riskLevel === "CRITICAL");
    const staleProds = products.filter(p => p.lastUpdatedHoursAgo >= 24);

    if (criticalProds.length > 0) {
      list.push({
        id: "alert-critical-stock",
        severity: "critical",
        title: "Immediate Stock-Out Threat",
        message: `${criticalProds.length} products (${criticalProds.slice(0, 3).map(p => p.shortName).join(", ")}) have less than 12h stock buffer. Urgent replenishment required.`,
        actionLabel: "Review Critical Products",
        actionTab: "priorityActions",
        timestamp: "5 mins ago"
      });
    }

    if (staleProds.length > 0) {
      list.push({
        id: "alert-stale-inv",
        severity: "warning",
        title: "Stale Shelf Verification (>24h)",
        message: `${staleProds.length} items have not been verified in over 24 hours. Inventory staleness increases ghost-inventory cancellations.`,
        actionLabel: "Verify Inventory",
        actionTab: "inventory",
        timestamp: "18 mins ago"
      });
    }

    if (activeStore.rejectionSpike) {
      list.push({
        id: "alert-rejection-spike",
        severity: "critical",
        title: "Store Order Rejection Spike Detected",
        message: `Store ${activeStore.name} had a 23% order rejection rate during the last peak period. Frequent rejections drive customer churn.`,
        actionLabel: "Inspect Store Profile",
        actionTab: "storeProfile",
        timestamp: "42 mins ago"
      });
    }

    list.push({
      id: "alert-repeat-rate",
      severity: "info",
      title: "NOVA CART Network Alert: Repeat Rate Health",
      message: "Customer repeat purchase rate dropped from 41% to 27%. Inaccurate inventory is the #1 cited driver of order cancellation.",
      actionLabel: "View Problem Diagnosis",
      actionTab: "diagnosis",
      timestamp: "1 hour ago"
    });

    return list;
  }, [products, activeStore]);

  // --- Handlers ---
  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setEditStockVal(product.currentStock);
    setEditAvailableVal(product.isAvailable !== false && product.currentStock > 0);
  };

  const handleSaveStockUpdate = (e) => {
    if (e) e.preventDefault();
    if (!editingProduct) return;

    const newStock = Math.max(0, parseInt(editStockVal, 10) || 0);
    const newAvailable = editAvailableVal && newStock > 0;
    const oldScore = editingProduct.riskScore;

    const updatedList = products.map(p => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          currentStock: newStock,
          isAvailable: newAvailable,
          lastUpdatedHoursAgo: 0,
          lastUpdatedText: "Just now"
        };
      }
      return p;
    });

    const recomputed = enrichProductsWithRisk(updatedList);
    setProducts(recomputed);

    const updatedItem = recomputed.find(p => p.id === editingProduct.id);
    const newScore = updatedItem.riskScore;

    // Mark as resolved in priority actions if score reduced significantly
    if (newScore < oldScore) {
      setResolvedIds(prev => Array.from(new Set([...prev, editingProduct.id])));
    }

    // Call mock PHP API asynchronously if on web server
    try {
      fetch("api.php?action=update_stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: editingProduct.id, stock: newStock, isAvailable: newAvailable })
      }).catch(() => {});
    } catch (_) {}

    // Close Modal
    setEditingProduct(null);

    // Notifications
    showToast("Inventory updated successfully.", "success");
    if (newScore < oldScore) {
      setTimeout(() => {
        showToast(`Stock-out risk reduced: Score dropped from ${oldScore} to ${newScore} (${updatedItem.riskLevel}).`, "info");
      }, 400);

      // Trigger Confetti if critical risk was resolved
      if (oldScore >= 61 && newScore <= 40 && window.confetti) {
        window.confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    }

    // If in demo mode step 6
    if (demoStep === 6) {
      setDemoStep(7);
    }
  };

  // Quick 1-click replenish handler from Priority Actions
  const handleQuickResolve = (product, addStock = 24) => {
    const oldScore = product.riskScore;
    const newStock = product.currentStock + addStock;

    const updatedList = products.map(p => {
      if (p.id === product.id) {
        return {
          ...p,
          currentStock: newStock,
          isAvailable: true,
          lastUpdatedHoursAgo: 0,
          lastUpdatedText: "Just now"
        };
      }
      return p;
    });

    const recomputed = enrichProductsWithRisk(updatedList);
    setProducts(recomputed);
    setResolvedIds(prev => Array.from(new Set([...prev, product.id])));

    const updatedItem = recomputed.find(p => p.id === product.id);
    showToast("Inventory updated successfully.", "success");
    showToast(`Stock-out risk reduced: ${product.shortName} replenished (+${addStock} units).`, "info");
    if (window.confetti) {
      window.confetti({ particleCount: 60, spread: 50 });
    }
  };

  // Toggle availability inline
  const handleToggleAvailability = (productId) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;
    const newStatus = !target.isAvailable;

    const updatedList = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          isAvailable: newStatus,
          lastUpdatedHoursAgo: 0,
          lastUpdatedText: "Just now"
        };
      }
      return p;
    });

    setProducts(enrichProductsWithRisk(updatedList));
    showToast(`${target.shortName} marked as ${newStatus ? "Available" : "Unavailable"}.`, "info");
  };

  // --- Guided Demo Scenario Controller ---
  const milkSampleProduct = useMemo(() => {
    return products.find(p => p.id === "PROD-001") || products[0];
  }, [products]);

  const handleStartDemo = () => {
    setActiveTab("dashboard");
    setDemoStep(1);
  };

  const handleNextDemoStep = () => {
    if (demoStep === 1) {
      // Step 2: Show current inventory problems on Dashboard
      setDemoStep(2);
    } else if (demoStep === 2) {
      // Step 3: Open Risk Monitor
      setActiveTab("riskMonitor");
      setDemoStep(3);
    } else if (demoStep === 3) {
      // Step 4: Select high-risk product (Milk 1L)
      setRiskDetailProduct(milkSampleProduct);
      setDemoStep(4);
    } else if (demoStep === 4) {
      // Step 5: Show why product is high risk
      setDemoStep(5);
    } else if (demoStep === 5) {
      // Step 6: Trigger Quick Stock Update modal
      setRiskDetailProduct(null);
      handleOpenEdit(milkSampleProduct);
      setEditStockVal(30); // Pre-fill with demo requirement 30 units
      setDemoStep(6);
    } else if (demoStep === 7) {
      // Step 8: Show risk level change
      setActiveTab("inventory");
      setDemoStep(8);
    } else if (demoStep === 8) {
      // Step 9: Dashboard metrics update
      setActiveTab("dashboard");
      setDemoStep(9);
    } else if (demoStep === 9) {
      // Step 10: Show potential business impact
      setActiveTab("impact");
      setDemoStep(10);
    } else if (demoStep === 10) {
      setDemoStep(0); // Completed!
      showToast("Demo Walkthrough Complete! All 10 steps verified.", "success");
      if (window.confetti) window.confetti({ particleCount: 120, spread: 70 });
    }
  };

  // Live calculated business impact
  const businessImpact = useMemo(() => {
    return calculateBusinessImpact(impactParams);
  }, [impactParams]);

  // Preview risk score inside edit modal
  const modalPreviewRisk = useMemo(() => {
    if (!editingProduct) return null;
    const simProduct = {
      ...editingProduct,
      currentStock: Math.max(0, parseInt(editStockVal, 10) || 0),
      isAvailable: editAvailableVal,
      lastUpdatedHoursAgo: 0,
      lastUpdatedText: "Just now"
    };
    return calculateProductRisk(simProduct);
  }, [editingProduct, editStockVal, editAvailableVal]);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-md w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start p-4 rounded-xl shadow-2xl border backdrop-blur-xl transition-all duration-300 transform translate-y-0 ${
              toast.type === "success"
                ? "bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40"
                : toast.type === "info"
                ? "bg-slate-900/95 border-cyan-500/40 text-cyan-300 shadow-cyan-950/40"
                : "bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-950/40"
            }`}
          >
            <div className="mr-3 text-lg mt-0.5">
              {toast.type === "success" ? "✅" : toast.type === "info" ? "⚡" : "⚠️"}
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {toast.message}
            </div>
          </div>
        ))}
      </div>

      {/* Guided Demo Floating Controller (Banner) */}
      {demoStep > 0 && (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-cyan-950/90 border-b border-emerald-500/40 px-4 py-3 backdrop-blur-md shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-mono font-semibold border border-emerald-500/40">
                STEP {demoStep} OF 10
              </span>
              <div className="text-sm font-medium text-slate-200">
                {demoStep === 1 && "1. Open Dashboard — Reviewing Store Overview"}
                {demoStep === 2 && "2. Show Current Inventory Problems — 8 products at high risk, 11% cancellations"}
                {demoStep === 3 && "3. Open Risk Monitor — Analyzing multi-factor risk scores"}
                {demoStep === 4 && "4. Select High-Risk Product — 'Amul Taaza Milk 1L' (Stock: 4, Daily Sales: 12)"}
                {demoStep === 5 && "5. Explain High-Risk Reason — 8h buffer remaining, 2-day stale audit"}
                {demoStep === 6 && "6. Update Stock to 30 Units — In-modal live risk recalculation"}
                {demoStep === 7 && "7. Recalculate Risk Score — Score drops from 87 to 28!"}
                {demoStep === 8 && "8. Risk Level Updated — Milk 1L is now classified as LOW RISK"}
                {demoStep === 9 && "9. Dashboard Metrics Update — Inventory Accuracy & Cancellations prevented updated"}
                {demoStep === 10 && "10. Potential Business Impact — GMV protected & customer churn prevented"}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleNextDemoStep}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
              >
                <span>{demoStep === 10 ? "Finish Demo 🎉" : "Continue Step →"}</span>
              </button>
              <button
                onClick={() => setDemoStep(0)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Exit Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Identity */}
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                    NOVA SmartStock
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Rescue Prototype
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Quick-Commerce Stock-Out Predictor & Accuracy Engine
                </p>
              </div>
            </div>

            {/* Store Switcher & Interactive Controls */}
            <div className="flex items-center space-x-3">
              
              {/* Store Selector */}
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-slate-400 hidden md:inline">Store:</span>
                <select
                  value={activeStoreId}
                  onChange={(e) => {
                    setActiveStoreId(e.target.value);
                    showToast(`Switched active store view to ${stores.find(s => s.id === e.target.value)?.name}`, "info");
                  }}
                  className="bg-transparent text-xs font-medium text-emerald-300 focus:outline-none cursor-pointer"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id} className="bg-slate-900 text-slate-200">
                      {store.name} ({store.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Demo Mode Trigger */}
              <button
                onClick={handleStartDemo}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-600/20 transition-all transform active:scale-95"
              >
                <span>🎬</span>
                <span>Run Guided Demo</span>
              </button>

              {/* Reset Data */}
              <button
                onClick={handleResetData}
                title="Reset simulation data to default benchmarks"
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors text-xs"
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto pb-2 pt-1 border-t border-slate-900 text-xs font-medium scrollbar-none">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "inventory", label: "Inventory Management", icon: "📦", badge: stats.total },
              { id: "riskMonitor", label: "Risk Monitor Engine", icon: "⚡", badge: stats.highRiskTotal, badgeColor: "bg-rose-500/20 text-rose-400" },
              { id: "priorityActions", label: "Priority Actions", icon: "🎯", badge: priorityItems.length, badgeColor: "bg-amber-500/20 text-amber-300" },
              { id: "alerts", label: "Operations Alerts", icon: "🔔", badge: activeAlerts.length, badgeColor: "bg-red-500/20 text-red-400" },
              { id: "impact", label: "Business Impact ROI", icon: "📈" },
              { id: "storeProfile", label: "Store Profile", icon: "🏪" },
              { id: "operationsView", label: "Operations HQ (Multi-Store)", icon: "🌐" },
              { id: "diagnosis", label: "Problem Diagnosis", icon: "🩺" },
              { id: "about", label: "About Solution", icon: "📘" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-inner"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${tab.badgeColor || "bg-slate-800 text-slate-300"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Store Greeting & Live Status Banner */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {activeStore.name} — Inventory Health
                  </h1>
                  <span className="flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live Monitoring</span>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activeStore.area}, {activeStore.city} • Last synced {activeStore.lastSync} • {activeStore.ordersToday} orders fulfilled today
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab("priorityActions")}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-900/30 flex items-center space-x-2 transition-all transform active:scale-95"
                >
                  <span>⚠️</span>
                  <span>{priorityItems.length} Products Need Action</span>
                </button>
                <button
                  onClick={() => setActiveTab("inventory")}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Update Inventory
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              
              {/* Total Products */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800">
                <div className="text-[11px] font-medium text-slate-400">Total Catalog</div>
                <div className="text-2xl font-bold text-white mt-1 font-mono">{stats.total}</div>
                <div className="text-[10px] text-slate-500 mt-1">Across 10 categories</div>
              </div>

              {/* Available */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800">
                <div className="text-[11px] font-medium text-emerald-400">Available</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1 font-mono">{stats.available}</div>
                <div className="text-[10px] text-emerald-500/80 mt-1">Ready for orders</div>
              </div>

              {/* Low Stock */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800">
                <div className="text-[11px] font-medium text-amber-400">Low Stock (≤5)</div>
                <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">{stats.lowStock}</div>
                <div className="text-[10px] text-amber-500/80 mt-1">Buffer depleting</div>
              </div>

              {/* High Risk */}
              <div className={`glass-panel p-4 rounded-xl metric-card ${stats.highRiskTotal > 0 ? "border-rose-500/30 bg-rose-950/10" : "border-slate-800"}`}>
                <div className="text-[11px] font-medium text-rose-400 flex items-center justify-between">
                  <span>High Risk</span>
                  {stats.critical > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>}
                </div>
                <div className="text-2xl font-bold text-rose-300 mt-1 font-mono">{stats.highRiskTotal}</div>
                <div className="text-[10px] text-rose-400/80 mt-1">{stats.critical} Critical • {stats.high} High</div>
              </div>

              {/* Out of Stock */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800">
                <div className="text-[11px] font-medium text-red-400">Out of Stock</div>
                <div className="text-2xl font-bold text-red-300 mt-1 font-mono">{stats.outOfStock}</div>
                <div className="text-[10px] text-red-500/80 mt-1">Causing rejections</div>
              </div>

              {/* Inventory Accuracy */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800">
                <div className="text-[11px] font-medium text-cyan-400">Accuracy %</div>
                <div className="text-2xl font-bold text-cyan-300 mt-1 font-mono">{stats.accuracy}%</div>
                <div className="text-[10px] text-cyan-500/80 mt-1">Network Avg: 72%</div>
              </div>

              {/* Orders At Risk */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800">
                <div className="text-[11px] font-medium text-purple-400">Orders At Risk</div>
                <div className="text-2xl font-bold text-purple-300 mt-1 font-mono">~{stats.ordersAffected}</div>
                <div className="text-[10px] text-purple-400/80 mt-1">Projected today</div>
              </div>

              {/* Cancellations Prevented */}
              <div className="glass-panel p-4 rounded-xl metric-card border-slate-800 bg-emerald-950/10">
                <div className="text-[11px] font-medium text-emerald-400">Saved Orders</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1 font-mono">+{stats.cancellationsPrevented}</div>
                <div className="text-[10px] text-emerald-400/80 mt-1">Resolved items</div>
              </div>

            </div>

            {/* Quick Demo Scenario Callout */}
            <div className="glass-panel-glow p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="text-3xl p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  🥛
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-emerald-300">Live Challenge Scenario: Milk 1L Verification</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${milkSampleProduct.riskBadgeColor}`}>
                      {milkSampleProduct.riskLevel} (Score: {milkSampleProduct.riskScore})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Current Stock: <strong className="text-white">{milkSampleProduct.currentStock} units</strong> | Avg Daily Sales: <strong className="text-white">{milkSampleProduct.avgDailySales} units</strong> | Last Verified: <strong className="text-white">{milkSampleProduct.lastUpdatedText}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {milkSampleProduct.riskReason}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(milkSampleProduct)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <span>✏️</span>
                  <span>Update Stock to 30</span>
                </button>
                <button
                  onClick={() => setRiskDetailProduct(milkSampleProduct)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors whitespace-nowrap"
                >
                  Inspect Math
                </button>
              </div>
            </div>

            {/* Charts & Analytical Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Inventory Accuracy Over Time */}
              <div className="glass-panel p-5 rounded-2xl border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Inventory Accuracy Trend vs. Cancellations</h3>
                    <p className="text-xs text-slate-400">Weekly progress following SmartStock real-time verifications</p>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    +16.4% gain
                  </span>
                </div>

                {/* SVG Line / Bar Visualization */}
                <div className="h-56 w-full flex flex-col justify-end pt-4">
                  <div className="grid grid-cols-6 gap-2 h-44 items-end">
                    {[
                      { week: "Wk 1", accuracy: 64, cancelRate: 14.8, baseline: true },
                      { week: "Wk 2", accuracy: 68, cancelRate: 13.5 },
                      { week: "Wk 3", accuracy: 72, cancelRate: 11.0, current: true },
                      { week: "Wk 4", accuracy: 79, cancelRate: 9.4 },
                      { week: "Wk 5", accuracy: 84, cancelRate: 8.1 },
                      { week: "Wk 6", accuracy: stats.accuracy, cancelRate: 6.8, projected: true }
                    ].map((item, idx) => (
                      <div key={idx} className="flex flex-col items-center h-full justify-end group">
                        <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-80 group-hover:opacity-100">
                          {item.accuracy}%
                        </div>
                        <div className="w-full flex items-end justify-center space-x-1 h-32 bg-slate-900/50 rounded-t-lg p-1">
                          {/* Accuracy Bar */}
                          <div
                            style={{ height: `${item.accuracy}%` }}
                            className={`w-1/2 rounded-t transition-all duration-500 ${
                              item.current
                                ? "bg-gradient-to-t from-cyan-600 to-cyan-400"
                                : item.projected
                                ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                                : "bg-slate-700"
                            }`}
                          ></div>
                          {/* Cancellation Rate Inverted Bar */}
                          <div
                            style={{ height: `${(item.cancelRate / 20) * 100}%` }}
                            className="w-1/2 rounded-t bg-gradient-to-t from-rose-900 to-rose-500/80 transition-all duration-500"
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-2 font-mono">{item.week}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-400 pt-3 border-t border-slate-800/80 mt-2">
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-emerald-400"></span>
                      <span>Inventory Accuracy (%)</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2.5 w-2.5 rounded bg-rose-500"></span>
                      <span>Cancellation Rate (%)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart 2: Top Products at Stock-Out Risk */}
              <div className="glass-panel p-5 rounded-2xl border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Top Critical Products at Risk</h3>
                    <p className="text-xs text-slate-400">Ordered by weighted risk score (0-100)</p>
                  </div>
                  <button
                    onClick={() => setActiveTab("riskMonitor")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    View Formula Engine →
                  </button>
                </div>

                <div className="space-y-3">
                  {priorityItems.slice(0, 5).map(prod => (
                    <div
                      key={prod.id}
                      onClick={() => setRiskDetailProduct(prod)}
                      className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{prod.imageUrl}</span>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center space-x-2">
                            <span>{prod.shortName}</span>
                            <span className="text-[10px] font-normal text-slate-400">({prod.category})</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Stock: <span className="font-mono text-slate-200">{prod.currentStock}</span> • Sales: <span className="font-mono text-slate-200">{prod.avgDailySales}/day</span> • Cover: <span className="text-amber-300 font-mono">{(prod.daysRemaining * 24).toFixed(0)}h</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-xs font-bold font-mono text-rose-400">{prod.riskScore}/100</div>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${prod.riskBadgeColor}`}>
                            {prod.riskLevel}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(prod);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs rounded-lg transition-colors"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick Priority Checklist & Recent Alerts Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Priority Actions Summary */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🎯</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">Today's Priority Restock Actions</h3>
                      <p className="text-xs text-slate-400">High-velocity items requiring verification before evening rush</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("priorityActions")}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    View All ({priorityItems.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {priorityItems.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                        <span className="text-2xl">{item.imageUrl}</span>
                        <div>
                          <div className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                            <span>{item.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.riskBadgeColor}`}>
                              {item.riskLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Stock: <strong className="text-white">{item.currentStock}</strong> | Velocity: <strong className="text-white">{item.avgDailySales}/day</strong> | Action: <span className="text-amber-300">{item.recommendedAction}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => handleQuickResolve(item, 20)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
                        >
                          ✓ Fast Restock
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Operations Warnings */}
              <div className="glass-panel p-5 rounded-2xl border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>🔔</span>
                      <span>Operations Signals</span>
                    </h3>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-mono">
                      {activeAlerts.length} Active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeAlerts.slice(0, 2).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-xl border text-xs ${
                          alert.severity === "critical"
                            ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                            : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{alert.title}</span>
                          <span className="text-[10px] opacity-75 font-mono">{alert.timestamp}</span>
                        </div>
                        <p className="mt-1 text-[11px] opacity-90 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab("alerts")}
                  className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition-colors"
                >
                  View All Operations Alerts →
                </button>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 2: INVENTORY MANAGEMENT */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            
            {/* Header & Search / Filters Bar */}
            <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>📦</span>
                    <span>Inventory Catalog & Risk Controller</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Managing {products.length} products for {activeStore.name} ({activeStore.city})
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">
                    Showing <strong className="text-emerald-300">{filteredProducts.length}</strong> of {products.length} products
                  </span>
                </div>
              </div>

              {/* Filter Controls Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, category, SKU..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
                  ))}
                </select>

                {/* Risk Level Filter */}
                <select
                  value={selectedRiskLevel}
                  onChange={(e) => setSelectedRiskLevel(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Risk Levels</option>
                  <option value="CRITICAL">🔴 Critical Risk (81-100)</option>
                  <option value="HIGH">🟠 High Risk (61-80)</option>
                  <option value="MEDIUM">🟡 Medium Risk (31-60)</option>
                  <option value="LOW">🟢 Low Risk (0-30)</option>
                  <option value="OUT OF STOCK">⚪ Out of Stock (0 units)</option>
                </select>

                {/* Availability Filter */}
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Availability</option>
                  <option value="In Stock">In Stock Only</option>
                  <option value="Out of Stock">Out of Stock Only</option>
                </select>

                {/* Sort Field */}
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortField(field);
                    setSortOrder(order);
                  }}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="riskScore-desc">Highest Risk First</option>
                  <option value="riskScore-asc">Lowest Risk First</option>
                  <option value="currentStock-asc">Lowest Stock First</option>
                  <option value="currentStock-desc">Highest Stock First</option>
                  <option value="avgDailySales-desc">Highest Velocity First</option>
                  <option value="name-asc">Product Name (A-Z)</option>
                </select>

              </div>
            </div>

            {/* Inventory Table */}
            <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Product Name & Category</th>
                      <th className="py-3.5 px-3">Current Stock</th>
                      <th className="py-3.5 px-3">Avg Daily Sales</th>
                      <th className="py-3.5 px-3">Buffer Cover</th>
                      <th className="py-3.5 px-3">Last Updated</th>
                      <th className="py-3.5 px-3 text-center">Risk Score</th>
                      <th className="py-3.5 px-3">Risk Level</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredProducts.map(prod => (
                      <tr
                        key={prod.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          prod.id === "PROD-001" && demoStep === 8 ? "bg-emerald-950/20" : ""
                        }`}
                      >
                        {/* Name & Category */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{prod.imageUrl}</span>
                            <div>
                              <div className="font-bold text-white flex items-center space-x-2">
                                <span>{prod.name}</span>
                                {resolvedIds.includes(prod.id) && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded" title="Verified Today">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                                <span className="text-emerald-400/90">{prod.category}</span>
                                <span>•</span>
                                <span className="font-mono">{prod.unit}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-300">₹{prod.price}</span>
                                <span>•</span>
                                <span className="font-mono text-slate-500">{prod.sku}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className={`font-mono text-sm font-bold ${
                              prod.currentStock === 0
                                ? "text-red-400"
                                : prod.currentStock <= 5
                                ? "text-amber-400"
                                : "text-white"
                            }`}>
                              {prod.currentStock}
                            </span>
                            <span className="text-[10px] text-slate-500">units</span>
                          </div>
                        </td>

                        {/* Avg Daily Sales */}
                        <td className="py-3.5 px-3">
                          <div className="font-mono text-slate-200">
                            {prod.avgDailySales} <span className="text-[10px] text-slate-500">/day</span>
                          </div>
                        </td>

                        {/* Buffer Cover */}
                        <td className="py-3.5 px-3">
                          <span className={`font-mono text-[11px] ${
                            prod.daysRemaining <= 0.5
                              ? "text-red-400 font-bold"
                              : prod.daysRemaining <= 1.5
                              ? "text-amber-400"
                              : "text-slate-300"
                          }`}>
                            {prod.currentStock === 0 ? "Empty" : `${(prod.daysRemaining * 24).toFixed(0)}h (${prod.daysRemaining}d)`}
                          </span>
                        </td>

                        {/* Last Updated */}
                        <td className="py-3.5 px-3">
                          <div className={`text-[11px] ${
                            prod.lastUpdatedHoursAgo >= 24 ? "text-amber-400 font-medium" : "text-slate-400"
                          }`}>
                            {prod.lastUpdatedText}
                          </div>
                        </td>

                        {/* Risk Score */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-xs text-white">
                              {prod.riskScore}
                            </span>
                            <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                              <div
                                style={{ width: `${prod.riskScore}%` }}
                                className={`h-full rounded-full ${
                                  prod.riskScore >= 81
                                    ? "bg-rose-500"
                                    : prod.riskScore >= 61
                                    ? "bg-amber-500"
                                    : prod.riskScore >= 31
                                    ? "bg-yellow-400"
                                    : "bg-emerald-400"
                                }`}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Risk Level Badge */}
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${prod.riskBadgeColor}`}>
                            {prod.riskLevel}
                          </span>
                        </td>

                        {/* Availability Toggle */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => handleToggleAvailability(prod.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                              prod.isAvailable && prod.currentStock > 0
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                            }`}
                          >
                            {prod.isAvailable && prod.currentStock > 0 ? "✓ Available" : "✕ Unavailable"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors"
                              title="Update stock & availability"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => setRiskDetailProduct(prod)}
                              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors text-xs"
                              title="View Risk Breakdown Math"
                            >
                              ℹ️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan="9" className="py-12 text-center text-slate-400">
                          <div className="text-3xl mb-2">🔍</div>
                          <p className="text-sm font-medium">No products match your current filters.</p>
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedCategory("All");
                              setSelectedRiskLevel("All");
                              setSelectedAvailability("All");
                              setSelectedStockFilter("All");
                            }}
                            className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs rounded-lg transition-colors"
                          >
                            Clear All Filters
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3: INVENTORY RISK ENGINE & FORMULA INSPECTOR */}
        {activeTab === "riskMonitor" && (
          <div className="space-y-6">
            
            {/* Risk Formula Explanation Card */}
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>⚡</span>
                    <span>NOVA SmartStock Risk Engine Specification</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Transparent, weighted, deterministic scoring algorithm developed for quick-commerce grocery retail
                  </p>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono border border-slate-700">
                  Prototype Model v1.2
                </span>
              </div>

              {/* Mathematical Formula Banner */}
              <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/20 font-mono text-xs text-emerald-300 leading-relaxed">
                <div className="font-bold text-slate-200 mb-2">Mathematical Formulation:</div>
                <div className="text-sm text-white font-bold bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                  Risk Score (0–100) = (0.40 × Stock Risk) + (0.30 × Sales Velocity) + (0.20 × Staleness) + (0.10 × Stockout History)
                </div>
                <div className="mt-2 text-slate-400 text-[11px]">
                  Classification: 0–30: <strong className="text-emerald-400">LOW</strong> | 31–60: <strong className="text-yellow-400">MEDIUM</strong> | 61–80: <strong className="text-amber-400">HIGH</strong> | 81–100: <strong className="text-rose-400">CRITICAL</strong> (or Shelf Empty = 100)
                </div>
              </div>

              {/* Four Factor Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">40% Stock Buffer Risk</span>
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded">Weight: 0.40</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Evaluates Days of Inventory Remaining (DIR = Stock / Daily Sales). &lt;10 hours remaining scores 95/100; &gt;3 days scores 5/100.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400">30% Sales Velocity</span>
                    <span className="text-xs font-mono bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded">Weight: 0.30</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    High turn items (e.g. Milk 12/day, Eggs 15/day) deplete suddenly under peak spikes. High velocity elevates urgency.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">20% Audit Staleness</span>
                    <span className="text-xs font-mono bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded">Weight: 0.20</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Hours since last physical shelf verification. Unverified for 48h (2 days) triggers high penalty due to phantom shrink.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400">10% Stock-out History</span>
                    <span className="text-xs font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded">Weight: 0.10</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Historical chronic stock-out patterns at this store location. Products with frequent stock-outs receive warning bias.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                <span>🛡️</span>
                <span><strong>Transparency Note:</strong> This is an algorithmic heuristic prototype, not a trained machine learning black box. Every score is 100% explainable and traceable.</span>
              </div>
            </div>

            {/* Interactive Product Risk Inspector */}
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>🔬</span>
                  <span>Interactive Product Risk Inspector</span>
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Select product to inspect:</span>
                  <select
                    value={riskDetailProduct ? riskDetailProduct.id : "PROD-001"}
                    onChange={(e) => {
                      const found = products.find(p => p.id === e.target.value);
                      setRiskDetailProduct(found);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-emerald-300 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.riskLevel} - {p.riskScore})</option>
                    ))}
                  </select>
                </div>
              </div>

              {(() => {
                const target = riskDetailProduct || milkSampleProduct;
                const comps = target.riskComponents || { stockRisk: 95, salesVelocity: 75, staleness: 90, stockoutHistory: 90 };
                return (
                  <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center space-x-4">
                        <span className="text-4xl p-2 bg-slate-800 rounded-xl">{target.imageUrl}</span>
                        <div>
                          <div className="text-lg font-bold text-white flex items-center space-x-2">
                            <span>{target.name}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${target.riskBadgeColor}`}>
                              {target.riskLevel}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Current Stock: <strong className="text-white">{target.currentStock} {target.unit}</strong> • Daily Sales: <strong className="text-white">{target.avgDailySales}/day</strong> • Last Audit: <strong className="text-white">{target.lastUpdatedText}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold font-mono text-white">{target.riskScore}<span className="text-xs text-slate-500">/100</span></div>
                          <div className="text-[10px] text-slate-400">Total Calculated Risk</div>
                        </div>
                        <button
                          onClick={() => handleOpenEdit(target)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-all"
                        >
                          Update This Stock
                        </button>
                      </div>
                    </div>

                    {/* Diagnostic Reason Box */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 mb-1">
                        <span>💬</span>
                        <span>Engine Diagnostic Explanation:</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        "{target.riskReason}"
                      </p>
                      <div className="mt-2 text-[11px] text-amber-300">
                        👉 <strong>Recommended Action:</strong> {target.recommendedAction}
                      </div>
                    </div>

                    {/* Component Score Gauges */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[11px] text-slate-400 flex justify-between">
                          <span>Stock Buffer Risk</span>
                          <span className="font-mono text-emerald-400">40% wt</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{comps.stockRisk}/100</div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div style={{ width: `${comps.stockRisk}%` }} className="h-full bg-emerald-400"></div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">Contrib: +{(comps.stockRisk * 0.4).toFixed(1)} pts</div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[11px] text-slate-400 flex justify-between">
                          <span>Sales Velocity Risk</span>
                          <span className="font-mono text-cyan-400">30% wt</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{comps.salesVelocity}/100</div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div style={{ width: `${comps.salesVelocity}%` }} className="h-full bg-cyan-400"></div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">Contrib: +{(comps.salesVelocity * 0.3).toFixed(1)} pts</div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[11px] text-slate-400 flex justify-between">
                          <span>Staleness Risk</span>
                          <span className="font-mono text-amber-400">20% wt</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{comps.staleness}/100</div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div style={{ width: `${comps.staleness}%` }} className="h-full bg-amber-400"></div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">Contrib: +{(comps.staleness * 0.2).toFixed(1)} pts</div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-[11px] text-slate-400 flex justify-between">
                          <span>Stock-out History</span>
                          <span className="font-mono text-purple-400">10% wt</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-white mt-1">{comps.stockoutHistory}/100</div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div style={{ width: `${comps.stockoutHistory}%` }} className="h-full bg-purple-400"></div>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">Contrib: +{(comps.stockoutHistory * 0.1).toFixed(1)} pts</div>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>
        )}

        {/* VIEW 4: PRIORITY ACTIONS */}
        {activeTab === "priorityActions" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-5 rounded-2xl border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Today's Priority Store Actions</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Urgent inventory actions ranked by stock-out vulnerability to prevent customer order cancellations
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700">
                  Resolved Today: <strong className="text-emerald-400">{resolvedIds.length}</strong> items
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {priorityItems.map((item, idx) => {
                const isResolved = resolvedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`glass-panel p-5 rounded-2xl border transition-all ${
                      isResolved
                        ? "border-emerald-500/20 bg-emerald-950/10 opacity-70"
                        : item.riskLevel === "CRITICAL"
                        ? "border-rose-500/40 bg-rose-950/10"
                        : "border-amber-500/30 bg-amber-950/10"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl font-mono font-extrabold text-slate-500 mt-1">
                          #{idx + 1}
                        </div>
                        <span className="text-3xl p-2 bg-slate-900 rounded-xl border border-slate-800">{item.imageUrl}</span>
                        <div>
                          <div className="flex items-center space-x-3">
                            <h3 className="text-sm font-bold text-white">{item.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.riskBadgeColor}`}>
                              {item.riskLevel}
                            </span>
                            {isResolved && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                ✓ Resolved
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-slate-300 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>Current Stock: <strong className="text-white font-mono">{item.currentStock} units</strong></span>
                            <span>Daily Sales: <strong className="text-white font-mono">{item.avgDailySales} units</strong></span>
                            <span>Remaining Buffer: <strong className="text-amber-300 font-mono">{(item.daysRemaining * 24).toFixed(0)} hours</strong></span>
                            <span>Last Audit: <strong className="text-slate-300">{item.lastUpdatedText}</strong></span>
                          </div>

                          <div className="mt-2 text-xs text-amber-200/90 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                            <strong>Recommended Action:</strong> {item.recommendedAction}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end md:self-center">
                        <button
                          onClick={() => handleQuickResolve(item, 25)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                        >
                          <span>⚡</span>
                          <span>Quick Restock (+25)</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                        >
                          Set Custom Stock
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}

              {priorityItems.length === 0 && (
                <div className="glass-panel p-12 text-center rounded-2xl text-slate-400">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-base font-bold text-white">All Clear! No Critical Risks Detected</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    All high-velocity products have adequate inventory buffer.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* VIEW 5: OPERATIONS ALERTS */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-5 rounded-2xl border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>🔔</span>
                  <span>Operations Alert Feed</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time exception alerts triggered by stock depletion, audit staleness, and store rejection spikes
                </p>
              </div>
              <span className="text-xs font-mono bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20">
                {activeAlerts.length} Unresolved Alerts
              </span>
            </div>

            <div className="space-y-4">
              {activeAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all ${
                    alert.severity === "critical"
                      ? "border-rose-500/40 bg-rose-950/15"
                      : alert.severity === "warning"
                      ? "border-amber-500/40 bg-amber-950/15"
                      : "border-cyan-500/40 bg-cyan-950/15"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="text-2xl mt-0.5">
                        {alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            alert.severity === "critical"
                              ? "bg-rose-500/20 text-rose-300"
                              : alert.severity === "warning"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-cyan-500/20 text-cyan-300"
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          {alert.message}
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono mt-2">
                          Triggered: {alert.timestamp} • Store: {activeStore.name} ({activeStore.id})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab(alert.actionTab)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 transition-colors whitespace-nowrap self-end sm:self-center"
                    >
                      {alert.actionLabel} →
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* VIEW 6: BUSINESS IMPACT SIMULATOR */}
        {activeTab === "impact" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-white">Potential Business Impact Simulation</h2>
                    <span className="text-[10px] font-mono bg-cyan-500/15 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-500/30 uppercase font-bold">
                      Modelled Estimates
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Grounded on NOVA CART case facts: 38,500 monthly orders, ₹486 AOV, 620 stores, 11% current cancellation rate
                  </p>
                </div>
                <div className="text-xs bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-slate-400">
                  ⚠️ <em>Notice: Modelled prototype simulation for strategic planning, not historical NOVA CART filings.</em>
                </div>
              </div>
            </div>

            {/* Impact KPI Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="glass-panel p-5 rounded-2xl border-slate-800 bg-gradient-to-b from-slate-900 to-emerald-950/20">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Cancellations Prevented</div>
                <div className="text-3xl font-extrabold text-white mt-2 font-mono">
                  {businessImpact.metrics.monthlyCancellationsPrevented.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400"> /mo</span>
                </div>
                <div className="text-xs text-emerald-400/90 mt-2 font-medium">
                  Rate drops {impactParams.currentRate}% → {impactParams.targetRate}% ({businessImpact.metrics.rateReductionPercentagePoints}% pts)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Includes ~{businessImpact.metrics.stockoutOrdersSaved} directly stock-out related
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border-slate-800 bg-gradient-to-b from-slate-900 to-cyan-950/20">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Monthly GMV Protected</div>
                <div className="text-3xl font-extrabold text-cyan-300 mt-2 font-mono">
                  ₹{(businessImpact.metrics.gmvRecoveredMonthly / 100000).toFixed(2)}
                  <span className="text-xs font-normal text-slate-400"> Lakh</span>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Annual GMV saved: <strong className="text-white">₹{(businessImpact.metrics.annualGmvRecovered / 100000).toFixed(1)} Lakh</strong>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  At ₹{impactParams.aov} Average Order Value
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border-slate-800 bg-gradient-to-b from-slate-900 to-amber-950/20">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Support & Refund Savings</div>
                <div className="text-3xl font-extrabold text-amber-300 mt-2 font-mono">
                  ₹{(businessImpact.metrics.monthlySupportSavings / 1000).toFixed(0)}k
                  <span className="text-xs font-normal text-slate-400"> /mo</span>
                </div>
                <div className="text-xs text-slate-300 mt-2">
                  Annual operational savings: <strong className="text-white">₹{(businessImpact.metrics.annualSupportSavings / 100000).toFixed(2)} Lakh</strong>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Avoids gateway refund charges & rider compensation
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border-slate-800 bg-gradient-to-b from-slate-900 to-purple-950/20">
                <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">Repeat Rate Recovery</div>
                <div className="text-3xl font-extrabold text-purple-300 mt-2 font-mono">
                  {businessImpact.metrics.projectedRepeatRate}%
                </div>
                <div className="text-xs text-purple-300 mt-2 font-medium">
                  +{businessImpact.metrics.repeatGainPoints}% pts recovery (from 27% baseline)
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Target: Restore towards 41% historical peak
                </div>
              </div>

            </div>

            {/* Interactive Simulation Controls */}
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>🎛️</span>
                  <span>Scenario Parameter Controls</span>
                </h3>
                <span className="text-xs text-slate-400">Adjust sliders to model outcomes</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Target Cancellation Rate Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Target Cancellation Rate:</span>
                    <span className="font-mono font-bold text-emerald-400">{impactParams.targetRate}% (Current: 11%)</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="11"
                    step="0.5"
                    value={impactParams.targetRate}
                    onChange={(e) => setImpactParams({ ...impactParams, targetRate: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5.0% (Best in Class)</span>
                    <span>8.0% (Target Scenario)</span>
                    <span>11.0% (Status Quo)</span>
                  </div>
                </div>

                {/* Store Adoption Rate Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Store Network Adoption:</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {impactParams.storeAdoptionPct}% ({Math.round(620 * impactParams.storeAdoptionPct / 100)} of 620 Stores)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="100"
                    step="5"
                    value={impactParams.storeAdoptionPct}
                    onChange={(e) => setImpactParams({ ...impactParams, storeAdoptionPct: parseInt(e.target.value, 10) })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>25% Pilot (155 stores)</span>
                    <span>75% Primary Wave (465 stores)</span>
                    <span>100% Full Network (620 stores)</span>
                  </div>
                </div>

                {/* Monthly Orders Input */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Monthly Order Volume:</span>
                    <span className="font-mono font-bold text-white">{impactParams.monthlyOrders.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="60000"
                    step="1000"
                    value={impactParams.monthlyOrders}
                    onChange={(e) => setImpactParams({ ...impactParams, monthlyOrders: parseInt(e.target.value, 10) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>20,000 orders</span>
                    <span>38,500 (NOVA CART Current)</span>
                    <span>60,000 orders</span>
                  </div>
                </div>

                {/* Average Order Value Input */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Average Order Value (AOV):</span>
                    <span className="font-mono font-bold text-white">₹{impactParams.aov}</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="700"
                    step="10"
                    value={impactParams.aov}
                    onChange={(e) => setImpactParams({ ...impactParams, aov: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>₹300</span>
                    <span>₹486 (NOVA CART Current)</span>
                    <span>₹700</span>
                  </div>
                </div>

              </div>

              {/* Total Economic Value Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Total Estimated Annual Economic Value Created
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ₹{(businessImpact.metrics.totalAnnualValue / 100000).toFixed(2)} Lakh / year
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    (₹{(businessImpact.metrics.annualGmvRecovered / 100000).toFixed(1)}L GMV recovered + ₹{(businessImpact.metrics.annualSupportSavings / 100000).toFixed(1)}L operational costs saved)
                  </div>
                </div>
                <button
                  onClick={() => setImpactParams({ currentRate: 11.0, targetRate: 8.0, storeAdoptionPct: 75, aov: 486, monthlyOrders: 38500 })}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700"
                >
                  Reset Case Benchmarks
                </button>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 7: STORE PROFILE */}
        {activeTab === "storeProfile" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center text-3xl shadow-xl shadow-emerald-950/40">
                    🏪
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h2 className="text-2xl font-bold text-white">{activeStore.name}</h2>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        activeStore.status === "Active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : activeStore.status === "Warning"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {activeStore.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4">
                      <span>ID: <strong className="font-mono text-slate-200">{activeStore.id}</strong></span>
                      <span>City: <strong className="text-slate-200">{activeStore.city}</strong></span>
                      <span>Type: <strong className="text-slate-200">{activeStore.type}</strong></span>
                      <span>Rating: <strong className="text-amber-400">★ {activeStore.rating}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={activeStoreId}
                    onChange={(e) => setActiveStoreId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-2 text-emerald-300 focus:outline-none"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Store Performance Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">Inventory Accuracy</div>
                  <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">{activeStore.inventoryAccuracy}%</div>
                  <div className="text-[10px] text-slate-500 mt-1">Based on weekly audits</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">Cancellation Rate</div>
                  <div className={`text-2xl font-bold font-mono mt-1 ${activeStore.cancellationRate > 10 ? "text-rose-400" : "text-emerald-400"}`}>
                    {activeStore.cancellationRate}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">NOVA Avg: 11%</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">Orders Today</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">{activeStore.ordersToday}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Peak window: 7–9 PM</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">Last Synchronization</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{activeStore.lastSync}</div>
                  <div className="text-[10px] text-slate-500 mt-1">SmartStock Live Link</div>
                </div>
              </div>

              {/* Contact & Partner Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-white text-sm">Store Manager Details</h4>
                  <p className="text-slate-300">Manager: <strong className="text-white">{activeStore.owner}</strong></p>
                  <p className="text-slate-300">Contact: <strong className="font-mono text-white">{activeStore.phone}</strong></p>
                  <p className="text-slate-300">Address: <span className="text-slate-400">{activeStore.area}, {activeStore.city}</span></p>
                  <p className="text-slate-300">Onboarding Date: <span className="font-mono text-slate-400">{activeStore.registeredDate}</span></p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-white text-sm">Operating Health Diagnostics</h4>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Rejection Spike Risk:</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold ${activeStore.rejectionSpike ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {activeStore.rejectionSpike ? "HIGH (Rush Hour Alerts)" : "NORMAL"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Catalog Coverage:</span>
                    <span className="font-mono text-white">{activeStore.totalProducts} active SKUs</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>SmartStock Integration:</span>
                    <span className="text-emerald-400 font-mono">Connected (REST Mock)</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 8: OPERATIONS HQ (MULTI-STORE VIEW) */}
        {activeTab === "operationsView" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>🌐</span>
                    <span>NOVA CART Network Operations Dashboard</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-store supervisory view across 620 partner retailers in Bengaluru, Mumbai, and Hyderabad
                  </p>
                </div>
                <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-slate-300">
                  Role: City Ops Lead (All Zones)
                </div>
              </div>
            </div>

            {/* Network Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl border-slate-800">
                <div className="text-xs text-slate-400">Total Network Stores</div>
                <div className="text-2xl font-bold font-mono text-white mt-1">620 Stores</div>
                <div className="text-[10px] text-slate-500 mt-1">3 Indian Metro Cities</div>
              </div>

              <div className="glass-panel p-4 rounded-xl border-slate-800">
                <div className="text-xs text-slate-400">Network Avg Cancellation</div>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-1">11.0%</div>
                <div className="text-[10px] text-rose-500/80 mt-1">Increased from 6% baseline</div>
              </div>

              <div className="glass-panel p-4 rounded-xl border-slate-800">
                <div className="text-xs text-slate-400">Avg Delivery Time</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">37 Mins</div>
                <div className="text-[10px] text-amber-500/80 mt-1">Target was 29 mins</div>
              </div>

              <div className="glass-panel p-4 rounded-xl border-slate-800">
                <div className="text-xs text-slate-400">Stores Facing Inventory Strain</div>
                <div className="text-2xl font-bold font-mono text-purple-400 mt-1">39% of Stores</div>
                <div className="text-[10px] text-purple-400/80 mt-1">~242 stores need assist</div>
              </div>
            </div>

            {/* Stores Risk Ranking Table */}
            <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Partner Stores Ranked by Cancellation Risk</h3>
                <span className="text-xs text-slate-400">Displaying 10 sample partner stores</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Store Name & Area</th>
                      <th className="py-3 px-3">City</th>
                      <th className="py-3 px-3">Accuracy %</th>
                      <th className="py-3 px-3">Cancellation Rate</th>
                      <th className="py-3 px-3">Orders Today</th>
                      <th className="py-3 px-3">Rejection Spike</th>
                      <th className="py-3 px-3">Last Sync</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {stores
                      .sort((a, b) => b.cancellationRate - a.cancellationRate)
                      .map(store => (
                        <tr key={store.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="font-bold text-white">{store.name}</div>
                              <div className="text-[10px] text-slate-400">{store.area} • ID: {store.id}</div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-slate-300">{store.city}</td>
                          <td className="py-3.5 px-3">
                            <span className={`font-mono font-bold ${
                              store.inventoryAccuracy >= 85
                                ? "text-emerald-400"
                                : store.inventoryAccuracy >= 70
                                ? "text-yellow-400"
                                : "text-rose-400"
                            }`}>
                              {store.inventoryAccuracy}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`font-mono font-bold ${
                              store.cancellationRate > 12 ? "text-rose-400" : "text-emerald-400"
                            }`}>
                              {store.cancellationRate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-200">{store.ordersToday}</td>
                          <td className="py-3.5 px-3">
                            {store.rejectionSpike ? (
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                                ⚠️ Spike Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Normal</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">{store.lastSync}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setActiveStoreId(store.id);
                                setActiveTab("inventory");
                                showToast(`Loaded inventory for ${store.name}`, "info");
                              }}
                              className="px-3 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-300 text-xs rounded-lg transition-colors font-medium"
                            >
                              Manage Store →
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 9: PROBLEM DIAGNOSIS */}
        {activeTab === "diagnosis" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>🩺</span>
                    <span>NOVA CART Problem Diagnosis & Failure Chain Analysis</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Grounded strictly in the business metrics provided in the PromptWars Challenge Brief
                  </p>
                </div>
                <span className="text-xs bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20 font-mono">
                  Root Cause Investigation
                </span>
              </div>

              {/* Case-Provided Evidence Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Repeat Purchase Rate</div>
                  <div className="text-xl font-extrabold text-rose-400 mt-1 font-mono">41% → 27%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Steep decline in customer loyalty</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Order Cancellation Rate</div>
                  <div className="text-xl font-extrabold text-rose-400 mt-1 font-mono">6% → 11%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Almost doubled network-wide</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Cancellations Due to Stock-Out</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono">35%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Top primary driver of cancellations</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Customer Ghost-Stock Experience</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono">29%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Ordered available items that vanished</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Store Inventory Update Burden</div>
                  <div className="text-xl font-extrabold text-purple-400 mt-1 font-mono">39%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Report online stock maintenance is too tedious</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Inventory Staleness</div>
                  <div className="text-xl font-extrabold text-purple-400 mt-1 font-mono">1–3 Days</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Some stores audit only once every 1–3 days</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Rush Hour Rejection Rate</div>
                  <div className="text-xl font-extrabold text-red-400 mt-1 font-mono">23%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Stores reject orders during peak rush</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Avg Delivery Delay</div>
                  <div className="text-xl font-extrabold text-red-400 mt-1 font-mono">29m → 37m</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">+8 mins caused by stock substitutions</div>
                </div>
              </div>
            </div>

            {/* Failure Chain Diagram */}
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>⛓️</span>
                <span>The Quick-Commerce Failure Cascade</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center text-center text-xs">
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
                  <div className="font-bold text-sm">1. Inaccurate Stock</div>
                  <p className="text-[10px] text-slate-400 mt-1">Manual audits delayed 1–3 days; 39% stores fatigued</p>
                </div>
                <div className="text-slate-500 font-bold hidden md:block">→</div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
                  <div className="font-bold text-sm">2. Ghost Availability</div>
                  <p className="text-[10px] text-slate-400 mt-1">Customer app lists items physically missing</p>
                </div>
                <div className="text-slate-500 font-bold hidden md:block">→</div>

                <div className="p-3 rounded-xl bg-yellow-950/40 border border-yellow-500/40 text-yellow-200">
                  <div className="font-bold text-sm">3. Order Placed</div>
                  <p className="text-[10px] text-slate-400 mt-1">Customer expects 15-minute quick fulfillment</p>
                </div>
                <div className="text-slate-500 font-bold hidden md:block">→</div>

                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200">
                  <div className="font-bold text-sm">4. Store Rejection</div>
                  <p className="text-[10px] text-slate-400 mt-1">Store cannot fulfill; 35% of all cancellations</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center text-center text-xs pt-2">
                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200">
                  <div className="font-bold text-sm">5. Delivery Delays</div>
                  <p className="text-[10px] text-slate-400 mt-1">Delivery time stretched from 29 to 37 minutes</p>
                </div>
                <div className="text-slate-500 font-bold hidden md:block">→</div>

                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200">
                  <div className="font-bold text-sm">6. Refund Overhead</div>
                  <p className="text-[10px] text-slate-400 mt-1">Costly customer support calls & refund processing</p>
                </div>
                <div className="text-slate-500 font-bold hidden md:block">→</div>

                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200">
                  <div className="font-bold text-sm">7. Customer Churn</div>
                  <p className="text-[10px] text-slate-400 mt-1">Repeat purchase rate collapses from 41% to 27%</p>
                </div>
              </div>

              {/* Intervention Point Highlight */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/50 mt-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">
                      NOVA SmartStock Intervention Point: Preventing the Cascade at Step 1
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      By predicting stock depletion before orders are placed and reducing store verification effort to 1-click updates, SmartStock halts the failure chain before the customer ever sees a phantom product.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* VIEW 10: ABOUT THE SOLUTION (EXECUTIVE CHALLENGE BRIEF) */}
        {activeTab === "about" && (
          <div className="space-y-6">
            
            <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-6">
              
              <div>
                <span className="text-xs font-mono uppercase text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-bold">
                  Executive Challenge Submission
                </span>
                <h1 className="text-2xl font-extrabold text-white mt-3">
                  NOVA SmartStock: Executive Product & Architecture Brief
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  PromptWars – Business Rescue Challenge for NOVA CART
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* 1. Problem */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
                    <span>1️⃣</span>
                    <span>The Underlying Problem</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    NOVA CART's cancellation crisis (11%) and repeat purchase collapse (41% → 27%) are not caused by rider shortages or app bugs, but by <strong>inaccurate physical inventory at local partner stores</strong>.
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Partner stores find inventory maintenance too burdensome (39%), leading to stale online listings (updated only once every 1–3 days) and ghost availability that turns 29% of customer orders into disappointed cancellations.
                  </p>
                </div>

                {/* 2. Evidence */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center space-x-2">
                    <span>2️⃣</span>
                    <span>Case Evidence</span>
                  </h3>
                  <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>35% of all cancellations happen because the product is unavailable.</li>
                    <li>29% of surveyed customers experienced products going missing after ordering.</li>
                    <li>Repeat purchase rate collapsed by 14 percentage points (41% down to 27%).</li>
                    <li>Delivery times elongated by 8 minutes (29m → 37m) due to stock substitution delays.</li>
                  </ul>
                </div>

                {/* 3. Target User */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
                    <span>3️⃣</span>
                    <span>Target Users</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Primary:</strong> Partner store managers & retail shop floor clerks (grocers, bakers, pharmacists). Needs to be dead simple, mobile-friendly, and require minimal keystrokes.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong>Secondary:</strong> NOVA CART City Operations Team managing store reliability, rush hour order rejections, and SLA compliance across 620 stores.
                  </p>
                </div>

                {/* 4. Solution */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-purple-400 flex items-center space-x-2">
                    <span>4️⃣</span>
                    <span>The Solution: NOVA SmartStock</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    An intelligent inventory monitoring and risk prediction dashboard that identifies fast-depleting products <em>before</em> they run out, presenting a prioritized 3-item daily verification queue with 1-click restock actions.
                  </p>
                </div>

                {/* 5. How It Works */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center space-x-2">
                    <span>5️⃣</span>
                    <span>How It Works (Input → Logic → Action → Output)</span>
                  </h3>
                  <div className="space-y-1 font-mono text-[11px] text-slate-300">
                    <div>• <strong>INPUT:</strong> Current stock, daily sales, hours since audit, past stock-outs.</div>
                    <div>• <strong>PROCESSING:</strong> Weighted risk scoring (40% buffer + 30% velocity + 20% staleness + 10% history).</div>
                    <div>• <strong>ACTION:</strong> Store manager 1-click verifies or updates stock.</div>
                    <div>• <strong>OUTPUT:</strong> Real-time risk mitigation, reduced cancellations, and protected GMV.</div>
                  </div>
                </div>

                {/* 6. Technology */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center space-x-2">
                    <span>6️⃣</span>
                    <span>Technology Stack</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    Built with React 18, Tailwind CSS, SVG/Chart visualization, and modular JavaScript engines (`riskEngine.js`, `impactEngine.js`). Supported by a lightweight PHP REST backend (`api.php`) running locally on Apache/XAMPP with zero paid external API dependencies.
                  </p>
                </div>

                {/* 7. Business Impact */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
                    <span>7️⃣</span>
                    <span>Modelled Business Impact</span>
                  </h3>
                  <ul className="text-slate-300 space-y-1 list-disc list-inside">
                    <li>3 percentage point cancellation reduction (11% → 8%).</li>
                    <li>~866 to 1,155 customer cancellations prevented per month.</li>
                    <li>₹50L+ annual GMV protected across 620 partner stores.</li>
                    <li>Over ₹1.1L monthly savings in customer support & refund overhead.</li>
                  </ul>
                </div>

                {/* 8. Future Scope */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                  <h3 className="text-sm font-bold text-purple-400 flex items-center space-x-2">
                    <span>8️⃣</span>
                    <span>Future Scope</span>
                  </h3>
                  <ul className="text-slate-300 space-y-1 list-disc list-inside">
                    <li>Hardware barcode/RFID shelf scanner integration.</li>
                    <li>Automated POS/ERP bidirectional sync (Tally, Vyapar, Marg).</li>
                    <li>Weather and event-based demand spike forecasting (rainy day surges).</li>
                    <li>Supplier auto-replenishment trigger via WhatsApp Business API.</li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* QUICK UPDATE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl relative">
            
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <span className="text-3xl p-2 bg-slate-800 rounded-xl">{editingProduct.imageUrl}</span>
              <div>
                <h3 className="text-base font-bold text-white">{editingProduct.name}</h3>
                <p className="text-xs text-slate-400">
                  {editingProduct.category} • SKU: {editingProduct.sku}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStockUpdate} className="space-y-4 text-xs">
              
              {/* Current Metrics Reference */}
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex justify-between text-slate-300">
                <div>
                  <div className="text-[10px] text-slate-500">Current Stock</div>
                  <div className="font-mono font-bold text-sm text-white">{editingProduct.currentStock} units</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Avg Daily Sales</div>
                  <div className="font-mono font-bold text-sm text-white">{editingProduct.avgDailySales} /day</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Current Risk</div>
                  <div className={`font-mono font-bold text-sm ${editingProduct.riskCategoryColor}`}>
                    {editingProduct.riskScore} ({editingProduct.riskLevel})
                  </div>
                </div>
              </div>

              {/* Stock Input */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold flex items-center justify-between">
                  <span>Enter New Verified Stock Quantity:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Demo: Try 30 units</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditStockVal(prev => Math.max(0, prev - 1))}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={editStockVal}
                    onChange={(e) => setEditStockVal(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEditStockVal(prev => prev + 1)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStockVal(30)}
                    className="px-3 py-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-900/60"
                  >
                    Set 30
                  </button>
                </div>
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Catalog Availability Status</div>
                  <div className="text-[10px] text-slate-400">If toggled off, item will be hidden on customer app</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editAvailableVal}
                    onChange={(e) => setEditAvailableVal(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Real-time In-Modal Risk Calculation Preview */}
              {modalPreviewRisk && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1.5">
                    <span>Live Risk Score Projection:</span>
                    <span className="font-mono text-xs">
                      {editingProduct.riskScore} → <strong className="text-emerald-400">{modalPreviewRisk.score} ({modalPreviewRisk.level})</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {modalPreviewRisk.reason}
                  </p>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-all"
                >
                  Save & Recalculate Risk
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* FACTOR BREAKDOWN DRAWER / MODAL */}
      {riskDetailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl relative space-y-4">
            
            <button
              onClick={() => setRiskDetailProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-base"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3">
              <span className="text-3xl p-2 bg-slate-800 rounded-xl">{riskDetailProduct.imageUrl}</span>
              <div>
                <h3 className="text-sm font-bold text-white">{riskDetailProduct.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${riskDetailProduct.riskBadgeColor}`}>
                  {riskDetailProduct.riskLevel} (Score: {riskDetailProduct.riskScore}/100)
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
              <strong>Engine Explanation:</strong>
              <p className="mt-1 text-slate-400 leading-relaxed">{riskDetailProduct.riskReason}</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Stock Buffer Score (40%):</span>
                <span className="font-mono font-bold">{riskDetailProduct.riskComponents?.stockRisk ?? 90}/100</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Sales Velocity Score (30%):</span>
                <span className="font-mono font-bold">{riskDetailProduct.riskComponents?.salesVelocity ?? 75}/100</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Audit Staleness Score (20%):</span>
                <span className="font-mono font-bold">{riskDetailProduct.riskComponents?.staleness ?? 85}/100</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Stock-out History Score (10%):</span>
                <span className="font-mono font-bold">{riskDetailProduct.riskComponents?.stockoutHistory ?? 80}/100</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
              <button
                onClick={() => {
                  const p = riskDetailProduct;
                  setRiskDetailProduct(null);
                  handleOpenEdit(p);
                }}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
              >
                Update Stock Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-5 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>NOVA SmartStock</strong> • Intelligent Inventory Risk Monitoring for Quick-Commerce
          </div>
          <div>
            PROMPTWARS Business Rescue Challenge • Fictional Case Study (NOVA CART)
          </div>
        </div>
      </footer>

    </div>
  );
}

// Render into DOM
ReactDOM.createRoot(document.getElementById("root")).render(<NovaSmartStockApp />);
