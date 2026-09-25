import React, { useState, useEffect } from 'react';
import { useModule } from '../context/ModuleContext.jsx';
import { fetchItems } from '../api/itemApi';
import SellItemForm from '../components/items/SellItemForm';
import ItemCard from '../components/items/ItemCard';
import ItemDetailModal from '../components/items/ItemDetailModal';
import PaymentStatusModal from '../components/items/PaymentStatusModal';
import PaymentGateway from '../components/items/PaymentGateway';
import {
  Plus, PlusCircle, ShoppingBag, Search, Filter, Loader2, PackageOpen, X,
  BookOpen, Laptop, Beaker, Armchair, Shirt, ChevronRight
} from 'lucide-react';
import './Items.css';

const ItemsModule = () => {
  // ── Global Context ────────────────────────────────────────────────────────
  const {
    filterCategory, setFilterCategory,
    isCategoryView, setIsCategoryView
  } = useModule();

  // ── Local State ───────────────────────────────────────────────────────────
  const [view, setView]                   = useState('browse');
  const [items, setItems]                 = useState([]);          // always []
  const [filteredItems, setFilteredItems] = useState([]);          // always []
  const [loading, setLoading]             = useState(false);
  const [visibleCount, setVisibleCount]   = useState(10);

  // Detail modal
  const [selectedItem, setSelectedItem]   = useState(null);

  // Razorpay gateway
  const [showGateway, setShowGateway]     = useState(false);
  const [gatewayItem, setGatewayItem]     = useState(null);

  // Payment status modal
  const [payStatus, setPayStatus]         = useState('idle');  // idle | processing | success | failed
  const [paymentId, setPaymentId]         = useState('');
  const [finalOtp, setFinalOtp]           = useState('');

  // Filters
  const [searchTerm, setSearchTerm]       = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy]               = useState('newest');

  const categoriesList = [
    { name: 'Books',       icon: <BookOpen   size={32} />, color: '#e0f2fe', text: '#0369a1' },
    { name: 'Electronics', icon: <Laptop     size={32} />, color: '#f3e8ff', text: '#7e22ce' },
    { name: 'Lab Gear',    icon: <Beaker     size={32} />, color: '#dcfce7', text: '#15803d' },
    { name: 'Furniture',   icon: <Armchair   size={32} />, color: '#ffedd5', text: '#c2410c' },
    { name: 'Clothing',    icon: <Shirt      size={32} />, color: '#fce7f3', text: '#be185d' },
    { name: 'Other',       icon: <PackageOpen size={32}/>, color: '#f1f5f9', text: '#475569' },
  ];

  // ── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (view === 'browse') loadItems();
  }, [view]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchItems();
      // Guard: ensure we always store an array
      const data = Array.isArray(res.data) ? res.data : [];
      setItems(data);
      setFilteredItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
      setItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering & Sorting ───────────────────────────────────────────────────
  useEffect(() => {
    // Guard: never operate on a non-array
    if (!Array.isArray(items)) return;

    let results = [...items]; // always work on a copy

    if (filterCategory !== 'All') {
      results = results.filter(item => item.category === filterCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      results = results.filter(item =>
        item.title?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    }

    if (sortBy === 'price-low') {
      results.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      results.sort((a, b) => b.price - a.price);
    } else {
      results.reverse(); // newest first
    }

    setFilteredItems(results); // always an array
    setVisibleCount(10);       // reset infinite scroll on filter change
  }, [searchTerm, items, filterCategory, sortBy]);

  // ── Infinite Scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 200;
      if (nearBottom) {
        setVisibleCount(prev => prev + 10);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Buy Handler ───────────────────────────────────────────────────────────
  const handleBuy = (item) => {
    setSelectedItem(null);   // close detail modal if open
    setGatewayItem(item);
    setShowGateway(true);
  };

  // ── Razorpay Callbacks ────────────────────────────────────────────────────
  const handlePaymentSuccess = ({ paymentId: pid, otp }) => {
    setShowGateway(false);
    setPaymentId(pid);
    setFinalOtp(otp);
    setPayStatus('success');
    loadItems(); // refresh so sold items disappear
  };

  const handlePaymentFailure = (msg) => {
    setShowGateway(false);
    console.error('Payment failed:', msg);
    setPayStatus('failed');
  };

  // ── Category View ─────────────────────────────────────────────────────────
  const handleCategorySelect = (catName) => {
    setFilterCategory(catName);
    setIsCategoryView(false);
  };

  if (isCategoryView) {
    return (
      <div className="items-module-container">
        <header className="marketplace-header">
          <div className="header-text">
            <h1>Browse Categories</h1>
            <p>Select a category to filter resources</p>
          </div>
          <button className="toggle-btn" onClick={() => setIsCategoryView(false)}>
            <ShoppingBag size={16} /> Back to Items
          </button>
        </header>

        <div className="category-selection-grid">
          {categoriesList.map(cat => (
            <button
              key={cat.name}
              className="cat-big-card"
              style={{ background: cat.color, color: cat.text }}
              onClick={() => handleCategorySelect(cat.name)}
            >
              {cat.icon}
              <h3>{cat.name}</h3>
              <ChevronRight className="cat-arrow" />
            </button>
          ))}
          <button
            className="cat-big-card"
            style={{ background: '#f8fafc', color: '#334155', border: '2px dashed #cbd5e1' }}
            onClick={() => handleCategorySelect('All')}
          >
            <ShoppingBag size={32} />
            <h3>View All</h3>
          </button>
        </div>
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="items-module-container">

      {/* Header */}
      <header className="marketplace-header">
        <div className="header-text">
          <h1>Student Marketplace</h1>
          <p>Buy & Sell resources within KLU Campus</p>
        </div>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'browse' ? 'active' : ''}`}
            onClick={() => setView('browse')}
          >
            <ShoppingBag size={16} /> Browse
          </button>
          <button
            className={`toggle-btn ${view === 'sell' ? 'active' : ''}`}
            onClick={() => setView('sell')}
          >
            <PlusCircle size={16} /> Sell Item
          </button>
        </div>
      </header>

      <div className="marketplace-content">
        {view === 'sell' ? (
          <div className="fade-in">
            <SellItemForm onSuccess={() => setView('browse')} />
          </div>
        ) : (
          <>
            {/* Search & Filter Bar */}
            <div className="search-bar-container">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder={`Search in ${filterCategory === 'All' ? 'all items' : filterCategory}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-wrapper">
                <button
                  className={`filter-btn-static ${showFilterMenu ? 'active' : ''}`}
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                >
                  <Filter size={18} /> Filters{' '}
                  {filterCategory !== 'All' && <span className="dot" />}
                </button>

                {showFilterMenu && (
                  <div className="filter-dropdown fade-in">
                    <div className="filter-header">
                      <span>Filter & Sort</span>
                      <button onClick={() => setShowFilterMenu(false)}><X size={16} /></button>
                    </div>
                    <div className="filter-group">
                      <label>Category</label>
                      <div className="chip-grid">
                        {['All', ...categoriesList.map(c => c.name)].map(cat => (
                          <button
                            key={cat}
                            className={`filter-chip ${filterCategory === cat ? 'selected' : ''}`}
                            onClick={() => setFilterCategory(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-group">
                      <label>Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                      >
                        <option value="newest">Newest Listed</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                      </select>
                    </div>
                    <div className="filter-actions">
                      <button
                        className="clear-link"
                        onClick={() => { setFilterCategory('All'); setSortBy('newest'); setSearchTerm(''); }}
                      >
                        Reset All
                      </button>
                      <button className="apply-btn" onClick={() => setShowFilterMenu(false)}>
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {filterCategory !== 'All' && (
                <div className="active-filter-badge">
                  <span>{filterCategory}</span>
                  <button onClick={() => setFilterCategory('All')}><X size={14} /></button>
                </div>
              )}
            </div>

            {/* Item Grid */}
            {loading ? (
              <div className="loader-state">
                <Loader2 className="spin" size={40} color="#003366" />
                <p>Loading products...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="empty-state">
                <PackageOpen size={48} />
                <h3>No items found</h3>
                <p>Try clearing filters or search terms.</p>
                <button
                  onClick={() => { setFilterCategory('All'); setSearchTerm(''); }}
                  className="cta-link"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="item-grid fade-in">
                  {filteredItems.slice(0, visibleCount).map(item => (
                    <ItemCard
                      key={item._id}
                      item={item}
                      onBuy={handleBuy}
                      onView={(i) => setSelectedItem(i)}
                    />
                  ))}
                </div>

                {visibleCount < filteredItems.length && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <Loader2 className="spin" size={24} style={{ display: 'inline-block' }} />
                    <p style={{ margin: '5px 0 0', fontSize: '0.85rem' }}>Loading more items...</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      {view === 'browse' && (
        <button className="floating-sell-btn" onClick={() => setView('sell')} title="List New Item">
          <Plus size={28} />
        </button>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Item Detail */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onBuy={handleBuy}
          onSwitchItem={(newItem) => setSelectedItem(newItem)}
        />
      )}

      {/* Razorpay Gateway */}
      {showGateway && gatewayItem && (
        <PaymentGateway
          item={gatewayItem}
          onClose={() => setShowGateway(false)}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}

      {/* Payment Status (success / failed) */}
      <PaymentStatusModal
        status={payStatus}
        paymentId={paymentId}
        otp={finalOtp}
        onClose={() => { setPayStatus('idle'); setPaymentId(''); setFinalOtp(''); }}
      />

    </div>
  );
};

export default ItemsModule;