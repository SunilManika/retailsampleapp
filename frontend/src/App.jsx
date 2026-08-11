import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Link,
  useLocation
} from "react-router-dom";

import {
  login,
  logout as apiLogout,
  getProducts,
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  checkout,
  addToWishlist,
  getMyOrders
} from "./api";

import "./App.css";
import "./components/ProductInsightsModal.css";

import WishlistPage from "./pages/WishlistPage";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ProductReviews from "./components/ProductReviews";
import ProductInsightsModal from "./components/ProductInsightsModal";
import AuthCallback from "./components/AuthCallback";

/* ============================================================
 * Toast – bottom-right corner
 * ========================================================== */
function Toast({ visible, message, type }) {
  if (!visible) return null;
  return (
    <div className="toast-wrap">
      <div className={`toast ${type}`}>{message}</div>
    </div>
  );
}

/* ============================================================
 * Navbar – Amazon-style two-bar header
 * ========================================================== */
function Navbar({ user, onLogout, searchValue, onSearchChange, onSearch }) {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  const active = (path) =>
    location.pathname === path ? "nav-sec-item active" : "nav-sec-item";

  return (
    <nav className="nav">
      {/* ── Primary bar ── */}
      <div className="nav-primary">
        {/* Logo */}
        <Link to="/" className="nav-logo-wrap">
          <span className="nav-logo-text">RetailDemo</span>
          <span className="nav-logo-dot">.</span>
        </Link>

        {/* Search */}
        {!isLogin && (
          <div className="nav-search">
            <input
              className="nav-search-input"
              placeholder="Search products..."
              value={searchValue || ""}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch && onSearch()}
            />
            <button className="nav-search-btn" onClick={() => onSearch && onSearch()}>
              🔍
            </button>
          </div>
        )}

        {/* Right area */}
        <div className="nav-right">
          {user ? (
            <>
              <div className="nav-item">
                <span className="nav-item-line1">Hello,</span>
                <span className="nav-item-line2">
                  {user.username || user.displayName || "User"}
                </span>
              </div>
              <Link to="/orders" className="nav-item">
                <span className="nav-item-line1">Returns &amp;</span>
                <span className="nav-item-line2">Orders</span>
              </Link>
              <Link to="/cart" className="nav-cart">
                <span className="nav-cart-icon">🛒</span>
                <span className="nav-cart-label">Cart</span>
              </Link>
              <button onClick={onLogout} className="nav-item" style={{ background: "none", border: "1px solid transparent", cursor: "pointer" }}>
                <span className="nav-item-line1">Sign</span>
                <span className="nav-item-line2">Out</span>
              </button>
            </>
          ) : (
            !isLogin && (
              <Link to="/login" className="nav-item">
                <span className="nav-item-line1">Hello, sign in</span>
                <span className="nav-item-line2">Account &amp; Lists</span>
              </Link>
            )
          )}
        </div>
      </div>

      {/* ── Secondary bar ── */}
      {!isLogin && (
        <div className="nav-secondary">
          <Link to="/" className={active("/")}>
            All Products
          </Link>
          {user && (
            <>
              <Link to="/wishlist" className={active("/wishlist")}>
                ♡ Wishlist
              </Link>
              <Link to="/profile" className={active("/profile")}>
                My Profile
              </Link>
              {user.is_admin && (
                <Link to="/admin" className={active("/admin")}>
                  Admin Dashboard
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}

/* ============================================================
 * Login Page
 * ========================================================== */
function LoginPage({ onLogin, onLoginSuccess }) {
  const [username, setUsername] = useState("aarav.sharma");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

  async function handleTraditionalLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await login(username, password);
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
      onLogin(data.user);
      if (onLoginSuccess) onLoginSuccess(data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  function handleIBMVerifyLogin() {
    window.location.href = `${API_BASE_URL}/auth/verify/login`;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Sign in</h2>
        <p className="login-subtitle">Use your credentials to continue</p>

        <form className="login-form" onSubmit={handleTraditionalLogin}>
          <label className="field-label">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field-input"
              placeholder="Enter username"
            />
          </label>

          <label className="field-label">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field-input"
              placeholder="Enter password"
            />
          </label>

          {error && <div className="error-text">{error}</div>}

          <button className="btn-primary" type="submit" style={{ width: "100%", padding: "10px" }}>
            Sign in
          </button>
        </form>

        <div className="login-divider"><span>or sign in with</span></div>

        <button
          type="button"
          className="btn-ibm-verify-alt"
          onClick={handleIBMVerifyLogin}
        >
          IBM Verify
        </button>

        <div className="login-footer">
          Demo users: 50 accounts · Password: <code>Password@123</code>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Star rating helper
 * ========================================================== */
function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
  return <span className="rating-stars">{stars}</span>;
}

/* ============================================================
 * Catalog Page
 * ========================================================== */
function CatalogPage({ onAddToCart, onAddToWishlist, onProductClick, externalSearch }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(externalSearch || "");
  const [sort, setSort] = useState("");
  const [category, setCategory] = useState("");

  const categories = ["All", "Laptops", "Mobiles", "Tablets", "Audio", "Monitors", "Printers", "Smart Home", "Accessories", "Furniture"];

  async function load(overrideSearch) {
    const q = overrideSearch !== undefined ? overrideSearch : search;
    const data = await getProducts({ search: q, sort });
    const filtered = category && category !== "All"
      ? data.filter((p) => p.category === category)
      : data;
    setProducts(filtered);
  }

  useEffect(() => {
    load();
  }, [sort, category]);

  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearch(externalSearch);
      load(externalSearch);
    }
  }, [externalSearch]);

  return (
    <div className="page">
      {/* Hero banner */}
      <div className="hero-banner">
        <h1>Today's Deals — Top Picks for You</h1>
        <p>Free delivery on orders over $50 · Shop millions of products</p>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <label>Sort by</label>
        <select
          className="field-input"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="">Featured</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>

        <label>Category</label>
        <div className="category-chips">
          {categories.map((c) => (
            <button
              key={c}
              className={`category-chip${category === c || (c === "All" && !category) ? " active" : ""}`}
              onClick={() => setCategory(c === "All" ? "" : c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p style={{ fontSize: 13, color: "#555", margin: "0 0 12px" }}>
        {products.length} result{products.length !== 1 ? "s" : ""}
        {search ? ` for "${search}"` : ""}
        {category ? ` in ${category}` : ""}
      </p>

      {/* Product grid */}
      <div className="product-grid">
        {products.map((p) => (
          <div
            className="product-card"
            key={p.id}
            onClick={() => onProductClick(p.id)}
            style={{ cursor: "pointer" }}
          >
            <div className="product-image">
              <img
                src={p.image_url}
                alt={p.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/400x300/f7f8fa/9ca3af?text=${encodeURIComponent(p.name)}`;
                }}
              />
            </div>

            <div className="product-body">
              <h3 className="product-name">{p.name}</h3>

              {p.rating && (
                <div className="product-rating">
                  <StarRating rating={p.rating} />
                  <span className="rating-count">{p.rating}</span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 13, verticalAlign: "super" }}>$</span>
                <span className="product-price">
                  {Math.floor(p.price).toLocaleString()}
                </span>
                <span style={{ fontSize: 13 }}>
                  {("." + String(Math.round((p.price % 1) * 100)).padStart(2, "0"))}
                </span>
              </div>

              <div className="product-prime">
                <span className="prime-badge">prime</span>
                <span style={{ color: "#555", fontSize: 12 }}>FREE delivery</span>
              </div>

              <div className="product-stock-info">
                {p.stock > 0 ? `In Stock (${p.stock})` : "Out of Stock"}
              </div>

              <div className="product-actions">
                <button
                  className="btn-primary-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(p.id);
                  }}
                >
                  Add to Cart
                </button>

                <button
                  className="btn-wishlist-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToWishlist(p.id);
                  }}
                >
                  ♡ Add to Wishlist
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>No results found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Cart Page
 * ========================================================== */
function CartPage({ showToast }) {
  const [cart, setCart] = useState(null);
  const [address, setAddress] = useState("");
  const [paymentMethod] = useState("CARD");
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await getCart();
    setCart(data);
  }

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("authUser"));
    if (stored?.default_address) setAddress(stored.default_address);
    load();
  }, []);

  async function qty(itemId, q) {
    const res = await updateCartItem(itemId, Number(q));
    setCart(res);
  }

  async function remove(itemId) {
    const res = await deleteCartItem(itemId);
    setCart(res);
  }

  async function place() {
    setMsg("");
    try {
      const order = await checkout({ deliveryAddress: address, paymentMethod });
      if (showToast)
        showToast(`Order #${order.orderId} placed successfully!`, "success");
      await load();
    } catch {
      setMsg("Checkout failed.");
      if (showToast) showToast("Checkout failed", "error");
    }
  }

  if (!cart)
    return (
      <div className="page">
        <p>Loading cart…</p>
      </div>
    );

  const itemCount = cart.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="page">
      <h2 className="page-title">
        Shopping Cart{" "}
        <span style={{ fontSize: 14, fontWeight: 400, color: "#555" }}>
          ({itemCount} item{itemCount !== 1 ? "s" : ""})
        </span>
      </h2>

      {cart.items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add items from the catalog to get started</p>
          <Link to="/" className="btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Items panel */}
          <div className="cart-box">
            <h2>Shopping Cart</h2>
            {cart.items.map((item) => (
              <div key={item.cart_item_id} className="cart-item">
                <img
                  className="cart-item-img"
                  src={item.image_url || "https://via.placeholder.com/80"}
                  alt={item.name}
                />
                <div className="cart-item-details">
                  <span className="cart-item-name">{item.name}</span>
                  <span className="cart-item-instock">✓ In Stock</span>
                  <div className="cart-item-actions">
                    <span style={{ fontSize: 13, color: "#555" }}>Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      className="qty-input"
                      onChange={(e) => qty(item.cart_item_id, e.target.value)}
                    />
                    <span className="sep">|</span>
                    <button
                      className="btn-danger-sm"
                      onClick={() => remove(item.cart_item_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="cart-item-price">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Order summary sidebar */}
          <div className="order-summary">
            <p className="order-summary-title">
              Order Summary
            </p>
            <div className="order-summary-row">
              <span>Items ({itemCount}):</span>
              <span>${Number(cart.total).toFixed(2)}</span>
            </div>
            <div className="order-summary-row">
              <span>Shipping &amp; handling:</span>
              <span style={{ color: "#007600" }}>FREE</span>
            </div>
            <div className="order-summary-row" style={{ color: "#007600" }}>
              <span>Prime savings:</span>
              <span>-$0.00</span>
            </div>
            <div className="order-summary-total">
              <span>Order total:</span>
              <span>${Number(cart.total).toFixed(2)}</span>
            </div>

            <div className="checkout-section">
              <label>
                Delivery address
                <textarea
                  className="field-textarea"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter delivery address"
                />
              </label>
              <button
                className="btn-primary"
                style={{ width: "100%", padding: "10px", fontSize: 15 }}
                onClick={place}
              >
                Proceed to checkout
              </button>
              {msg && <p className="error-text">{msg}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Orders Page
 * ========================================================== */
function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    getMyOrders().then(setOrders);
  }, []);

  function statusClass(s) {
    const v = (s || "").toLowerCase();
    if (v === "placed" || v === "processing") return "placed";
    if (v === "delivered" || v === "completed") return "delivered";
    return "cancelled";
  }

  return (
    <div className="page">
      <h2 className="page-title">Your Orders</h2>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
          <p>When you place an order, it will appear here.</p>
          <Link to="/" className="btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((o) => (
            <div key={o.id} className="order-card">
              <div className="order-card-header">
                <div className="order-card-header-cell">
                  <span className="order-header-label">Order placed</span>
                  <span className="order-header-value">
                    {new Date(o.created_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric"
                    })}
                  </span>
                </div>
                <div className="order-card-header-cell">
                  <span className="order-header-label">Total</span>
                  <span className="order-header-value">${Number(o.total_amount).toFixed(2)}</span>
                </div>
                <div className="order-card-header-cell">
                  <span className="order-header-label">Payment</span>
                  <span className="order-header-value">{o.payment_method}</span>
                </div>
                <div className="order-card-header-cell" style={{ marginLeft: "auto" }}>
                  <span className="order-header-label">Order # {o.id}</span>
                </div>
              </div>
              <div className="order-card-body">
                <span
                  className={`order-status-badge ${statusClass(o.status)}`}
                >
                  {o.status}
                </span>
                <span style={{ fontSize: 13, color: "#555" }}>
                  📍 {o.delivery_address || "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
 * Root App
 * ========================================================== */
function App() {
  const [user, setUser] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [navSearch, setNavSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [toastState, setToastState] = useState({
    visible: false,
    message: "",
    type: "info"
  });

  const toastTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const u = localStorage.getItem("authUser");
    if (u) setUser(JSON.parse(u));
  }, []);

  function showToast(message, type = "info") {
    setToastState({ visible: true, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(
      () => setToastState((prev) => ({ ...prev, visible: false })),
      2500
    );
  }

  async function handleLogout() {
    let verifyLogoutUrl = null;
    try {
      const response = await apiLogout();
      verifyLogoutUrl = response.verifyLogoutUrl;
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setUser(null);
      if (verifyLogoutUrl) {
        window.location.href = verifyLogoutUrl;
      } else {
        navigate("/login");
        showToast("Signed out", "info");
      }
    }
  }

  async function handleAddToCart(productId) {
    if (!user) { navigate("/login"); return; }
    try {
      await addToCart(productId, 1);
      showToast("Added to cart ✓", "success");
    } catch {
      showToast("Unable to add to cart", "error");
    }
  }

  async function handleAddToWishlist(productId) {
    if (!user) { navigate("/login"); return; }
    try {
      await addToWishlist(productId);
      showToast("Saved to wishlist ✓", "success");
    } catch {
      showToast("Unable to add to wishlist", "error");
    }
  }

  function handleProductClick(productId) {
    setSelectedProductId(productId);
  }

  function handleCloseModal() {
    setSelectedProductId(null);
  }

  function handleNavSearch() {
    setAppliedSearch(navSearch);
    navigate("/");
  }

  const requireAuth = (el) =>
    user ? el : (
      <LoginPage
        onLogin={setUser}
        onLoginSuccess={(u) => showToast(`Welcome back, ${u.username}!`, "success")}
      />
    );

  return (
    <div className="app-root">
      <Navbar
        user={user}
        onLogout={handleLogout}
        searchValue={navSearch}
        onSearchChange={setNavSearch}
        onSearch={handleNavSearch}
      />

      <div className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              <CatalogPage
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
                onProductClick={handleProductClick}
                externalSearch={appliedSearch}
              />
            }
          />
          <Route
            path="/login"
            element={
              <LoginPage
                onLogin={setUser}
                onLoginSuccess={(u) =>
                  showToast(`Welcome back, ${u.username}!`, "success")
                }
              />
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/cart" element={<CartPage showToast={showToast} />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/wishlist" element={requireAuth(<WishlistPage showToast={showToast} />)} />
          <Route path="/profile" element={requireAuth(<ProfilePage showToast={showToast} />)} />
          <Route
            path="/admin"
            element={
              user && user.is_admin
                ? <AdminDashboardPage />
                : requireAuth(null)
            }
          />
        </Routes>
      </div>

      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
      />

      {selectedProductId && (
        <ProductInsightsModal
          productId={selectedProductId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default App;
