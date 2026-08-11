import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function WishlistPage({ showToast }) {
  const [items, setItems] = useState([]);

  async function loadWishlist() {
    try {
      const res = await api.get("/wishlist");
      setItems(res.data);
    } catch {
      setItems([]);
    }
  }

  async function remove(productId) {
    await api.delete(`/wishlist/${productId}`);
    if (showToast) showToast("Removed from wishlist", "info");
    await loadWishlist();
  }

  useEffect(() => {
    loadWishlist();
  }, []);

  return (
    <div className="page">
      <h2 className="page-title">Your Wishlist</h2>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">♡</div>
          <h3>Your wishlist is empty</h3>
          <p>Save items you love to your wishlist and revisit them anytime.</p>
          <Link
            to="/"
            className="btn-primary"
            style={{ marginTop: 16, display: "inline-block" }}
          >
            Discover Products
          </Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "#555", margin: "0 0 16px" }}>
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </p>
          <div className="product-grid">
            {items.map((item) => (
              <div key={item.wishlist_item_id} className="product-card">
                <div className="product-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <span style={{ color: "#aaa", fontSize: 13 }}>No image</span>
                  )}
                </div>
                <div className="product-body">
                  <span
                    className="product-badge"
                    style={{ background: "#007185" }}
                  >
                    {item.category}
                  </span>
                  <h3 className="product-name">{item.name}</h3>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 4 }}
                  >
                    <span style={{ fontSize: 13, verticalAlign: "super" }}>
                      $
                    </span>
                    <span className="product-price">
                      {Math.floor(item.price).toLocaleString()}
                    </span>
                    <span style={{ fontSize: 13 }}>
                      {"."+String(Math.round((item.price % 1) * 100)).padStart(2,"0")}
                    </span>
                  </div>
                  <div className="product-prime">
                    <span className="prime-badge">prime</span>
                    <span style={{ color: "#555", fontSize: 12 }}>
                      FREE delivery
                    </span>
                  </div>
                  <div className="product-actions">
                    <button
                      className="btn-primary-sm"
                      onClick={() =>
                        showToast && showToast("Add to cart coming soon", "info")
                      }
                    >
                      Add to Cart
                    </button>
                    <button
                      className="btn-danger-sm"
                      style={{ width: "100%", padding: "8px" }}
                      onClick={() => remove(item.product_id)}
                    >
                      Remove from Wishlist
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default WishlistPage;
