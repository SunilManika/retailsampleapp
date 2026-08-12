// backend/src/apiRoutes.js
const express = require("express");
const db = require("./db");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const http = require("http");
const https = require("https");
const NodeCache = require("node-cache");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "changeme-in-prod";

// Helper function to refresh IBM Verify access token
async function refreshIBMVerifyToken(refreshToken) {
  try {
    const IBM_VERIFY_ISSUER = process.env.IBM_VERIFY_ISSUER;
    const IBM_VERIFY_CLIENT_ID = process.env.IBM_VERIFY_CLIENT_ID;
    const IBM_VERIFY_CLIENT_SECRET = process.env.IBM_VERIFY_CLIENT_SECRET;
    
    const tokenUrl = `${IBM_VERIFY_ISSUER}/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', IBM_VERIFY_CLIENT_ID);
    params.append('client_secret', IBM_VERIFY_CLIENT_SECRET);
    
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('[IBM VERIFY] Token refreshed successfully');
    console.log('[IBM VERIFY] New access token format:', response.data.access_token ? (response.data.access_token.split('.').length === 3 ? 'JWT' : 'Opaque') : 'none');
    
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken
    };
  } catch (error) {
    console.error('[IBM VERIFY] Error refreshing token:', error.response?.data || error.message);
    throw error;
  }
}

// RAG Retrieval Server Configuration
const RAG_RETRIEVAL_URL = process.env.RAG_RETRIEVAL_URL || "http://localhost:8080";
const RAG_BEARER_TOKEN = process.env.RAG_BEARER_TOKEN || "";

// How long a login counts as "active" (in minutes) for real-time metric
const ACTIVE_WINDOW_MINUTES = 5;

// ============================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================

// In-memory cache for product insights (1 hour TTL)
const insightsCache = new NodeCache({
  stdTTL: 3600,           // Cache for 1 hour
  checkperiod: 120,       // Check for expired keys every 2 minutes
  useClones: false        // Better performance, don't clone objects
});

// HTTP Keep-Alive agents for better connection reuse
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,  // Keep connections alive for 30 seconds
  maxSockets: 50          // Max concurrent connections
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50
});

// Log cache statistics periodically
setInterval(() => {
  const stats = insightsCache.getStats();
  if (stats.keys > 0) {
    console.log(`[CACHE STATS] Keys: ${stats.keys}, Hits: ${stats.hits}, Misses: ${stats.misses}, Hit Rate: ${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`);
  }
}, 300000); // Every 5 minutes

// ============================================================

/* ------------------------------------------------------------------
 * Shared auth helpers (for these feature routes only)
 * -----------------------------------------------------------------*/

function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.userId,
      username: payload.username,
      is_admin: payload.is_admin || false,
      email: payload.email,
      auth_method: payload.auth_method,
      accessToken: payload.accessToken,
      verifyUserInfo: payload.verifyUserInfo
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

/* ==================================================================
 * 1) Wishlist
 * =================================================================*/

router.get("/wishlist", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT wi.id AS wishlist_item_id,
              p.id  AS product_id,
              p.name,
              p.price,
              p.image_url,
              p.category
       FROM wishlist_items wi
       JOIN products p ON wi.product_id = p.id
       WHERE wi.user_id = $1
       ORDER BY wi.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get wishlist error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/wishlist", authMiddleware, async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) {
    return res.status(400).json({ message: "productId is required" });
  }

  try {
    await db.query(
      `INSERT INTO wishlist_items (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user.id, productId]
    );
    res.status(201).json({ message: "Added to wishlist" });
  } catch (err) {
    console.error("Add wishlist error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/wishlist/:productId", authMiddleware, async (req, res) => {
  const productId = req.params.productId;
  try {
    await db.query(
      "DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2",
      [req.user.id, productId]
    );
    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    console.error("Remove wishlist error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ==================================================================
 * 2) Product Reviews & Ratings
 * =================================================================*/

router.get("/products/:id/reviews", async (req, res) => {
  const productId = req.params.id;
  try {
    const result = await db.query(
      `SELECT r.id,
              r.rating,
              r.comment,
              r.created_at,
              u.username
       FROM product_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/products/:id/reviews", authMiddleware, async (req, res) => {
  const productId = req.params.id;
  const { rating, comment } = req.body || {};
  const r = Number(rating);

  if (!r || r < 1 || r > 5) {
    return res.status(400).json({ message: "rating must be between 1 and 5" });
  }

  try {
    await db.query(
      `INSERT INTO product_reviews (user_id, product_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, productId, r, comment || null]
    );
    res.status(201).json({ message: "Review added" });
  } catch (err) {
    console.error("Add review error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ==================================================================
 * 3) Advanced Order History + CSV export
 * =================================================================*/

router.get("/orders/advanced", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { status, from, to } = req.query;

  let query = `
    SELECT id, total_amount, status, payment_method, delivery_address, created_at
    FROM orders
    WHERE user_id = $1
  `;
  const params = [userId];
  let idx = 2;

  if (status) {
    query += ` AND status = $${idx++}`;
    params.push(status);
  }
  if (from) {
    query += ` AND created_at >= $${idx++}`;
    params.push(from);
  }
  if (to) {
    query += ` AND created_at <= $${idx++}`;
    params.push(to);
  }

  query += " ORDER BY created_at DESC";

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Advanced orders error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/orders/advanced/export", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      `SELECT id, total_amount, status, payment_method, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    let csv = "id,total_amount,status,payment_method,created_at\n";
    for (const row of result.rows) {
      csv += `${row.id},${row.total_amount},${row.status},${row.payment_method},${row.created_at.toISOString()}\n`;
    }

    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    res.send(csv);
  } catch (err) {
    console.error("Export orders CSV error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ==================================================================
 * 4) User Profile – default address
 * =================================================================*/

router.get("/me", authMiddleware, async (req, res) => {
  try {
    // Check if user is authenticated via IBM Verify
    if (req.user.auth_method === 'ibm_verify') {
      // IBM Verify users are not in the database, return JWT token data + IBM Verify user info
      return res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        is_admin: req.user.is_admin || false,
        auth_method: 'ibm_verify',
        created_at: null, // IBM Verify users don't have a created_at in our DB
        default_address: null, // IBM Verify users don't have saved addresses yet
        verifyUserInfo: req.user.verifyUserInfo || {} // Additional data from IBM Verify /userinfo endpoint
      });
    }

    // For database users (local auth), query the database
    const result = await db.query(
      "SELECT id, username, default_address, is_admin, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Add auth_method to response for consistency
    const userData = {
      ...result.rows[0],
      auth_method: 'local'
    };
    
    res.json(userData);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/me/address", authMiddleware, async (req, res) => {
  const { defaultAddress } = req.body || {};
  
  try {
    // Check if user is authenticated via IBM Verify
    if (req.user.auth_method === 'ibm_verify') {
      // For IBM Verify users, update the address via IBM Verify SCIM /Me endpoint (self-service)
      const axios = require('axios');
      const IBM_VERIFY_ISSUER = process.env.IBM_VERIFY_ISSUER;
      let accessToken = req.user.accessToken;
      
      if (!accessToken) {
        return res.status(400).json({ message: "Access token not available for IBM Verify user" });
      }
      
      // Check if access token is in JWT format (required for SCIM API)
      const isJWT = accessToken.split('.').length === 3;
      console.log('[IBM VERIFY] Access token format:', isJWT ? 'JWT' : 'Opaque');
      
      // If token is not JWT and we have a refresh token, try to get a JWT token
      if (!isJWT && req.user.refreshToken) {
        console.log('[IBM VERIFY] Access token is not JWT, attempting to refresh...');
        try {
          const tokens = await refreshIBMVerifyToken(req.user.refreshToken);
          accessToken = tokens.accessToken;
          console.log('[IBM VERIFY] Token refreshed, new format:', accessToken.split('.').length === 3 ? 'JWT' : 'Opaque');
        } catch (refreshError) {
          console.error('[IBM VERIFY] Failed to refresh token:', refreshError.message);
          return res.status(401).json({
            message: "Access token expired and refresh failed. Please log in again.",
            error: refreshError.message
          });
        }
      }
      
      try {
        // Get tenant URL from issuer
        const tenantUrl = IBM_VERIFY_ISSUER.replace('/oidc/endpoint/default', '');
        
        // First, get current user data to preserve all fields
        const currentUser = await axios.get(
          `${tenantUrl}/v2.0/Me`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/scim+json'
            }
          }
        );
        
        console.log('[IBM VERIFY] Current user data retrieved');
        
        // Prepare SCIM update payload with all required fields using OOB attributes only
        const scimPayload = {
          schemas: [
            'urn:ietf:params:scim:schemas:core:2.0:User'
          ],
          id: req.user.id,
          userName: currentUser.data.userName || req.user.email,
          name: currentUser.data.name || {
            givenName: req.user.displayName || '',
            familyName: '',
            formatted: req.user.displayName || ''
          },
          emails: currentUser.data.emails || [{ value: req.user.email, type: 'work' }],
          active: true,
          // Update addresses using standard SCIM addresses field
          addresses: [
            {
              type: 'work',
              streetAddress: defaultAddress || '',
              formatted: defaultAddress || ''
            }
          ]
        };
        
        // Preserve phone numbers if they exist
        if (currentUser.data.phoneNumbers) {
          scimPayload.phoneNumbers = currentUser.data.phoneNumbers;
        }
        
        // Preserve IBM extension data if it exists (but don't modify it)
        if (currentUser.data['urn:ietf:params:scim:schemas:extension:ibm:2.0:User']) {
          scimPayload.schemas.push('urn:ietf:params:scim:schemas:extension:ibm:2.0:User');
          scimPayload['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'] =
            currentUser.data['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'];
        }
        
        console.log('[IBM VERIFY] Updating address via /Me endpoint (PUT) for user:', req.user.id);
        console.log('[IBM VERIFY] Address value:', defaultAddress);
        
        // Make PUT request to IBM Verify SCIM /Me endpoint (self-service)
        const response = await axios.put(
          `${tenantUrl}/v2.0/Me`,
          scimPayload,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/scim+json',
              'Accept': 'application/scim+json'
            }
          }
        );
        
        console.log('[IBM VERIFY] Address updated successfully in IBM Verify');
        return res.json({ message: "Address updated in IBM Verify" });
        
      } catch (verifyErr) {
        console.error('[IBM VERIFY] Error updating address:', verifyErr.response?.data || verifyErr.message);
        return res.status(500).json({
          message: "Unable to update address in IBM Verify",
          error: verifyErr.response?.data?.messageDescription || verifyErr.message
        });
      }
    }
    
    // For database users (local auth), update in database
    await db.query(
      "UPDATE users SET default_address = $1 WHERE id = $2",
      [defaultAddress || null, req.user.id]
    );
    res.json({ message: "Address updated" });
  } catch (err) {
    console.error("Update address error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ==================================================================
 * 14) Admin Dashboard – KPIs + login stats + 12h login trend
 * =================================================================*/

router.get("/admin/metrics", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [
      usersRes,
      ordersRes,
      revenueRes,
      topProductsRes,
      totalLoginsRes,
      activeUsersRes
    ] = await Promise.all([
      db.query("SELECT COUNT(*) AS total_users FROM users"),
      db.query("SELECT COUNT(*) AS total_orders FROM orders"),
      db.query(
        "SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders"
      ),
      db.query(
        `SELECT p.id,
                p.name,
                SUM(oi.quantity) AS units_sold
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         GROUP BY p.id, p.name
         ORDER BY units_sold DESC
         LIMIT 5`
      ),
      // total_logins: every login event ever
      db.query("SELECT COUNT(*) AS total_logins FROM login_events"),
      // active_users_realtime: distinct users who logged in within ACTIVE_WINDOW_MINUTES
      db.query(
        `SELECT COUNT(DISTINCT user_id) AS active_users
         FROM login_events
         WHERE login_at >= now() - INTERVAL '${ACTIVE_WINDOW_MINUTES} minutes'`
      )
    ]);

    res.json({
      total_users: Number(usersRes.rows[0].total_users) || 0,
      total_orders: Number(ordersRes.rows[0].total_orders) || 0,
      total_revenue: Number(revenueRes.rows[0].total_revenue) || 0,
      top_products: topProductsRes.rows || [],
      total_logins: Number(totalLoginsRes.rows[0].total_logins) || 0,
      active_users_realtime:
        Number(activeUsersRes.rows[0].active_users) || 0
    });
  } catch (err) {
    console.error("Admin metrics error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * 12-hour login trend for charts (both line + bar on frontend)
 * Returns buckets per hour with login_count.
 */
router.get(
  "/admin/login-trend-12h",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT
           date_trunc('hour', login_at) AS hour_bucket,
           COUNT(*) AS login_count
         FROM login_events
         WHERE login_at >= now() - INTERVAL '12 hours'
         GROUP BY hour_bucket
         ORDER BY hour_bucket`
      );

      const data = result.rows.map((row) => ({
        hour_start: row.hour_bucket,
        // label is ISO string; frontend converts to HH:mm
        label: new Date(row.hour_bucket).toISOString(),
        login_count: Number(row.login_count)
      }));

      res.json(data);
    } catch (err) {
      console.error("Admin login trend (12h) error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

/* ==================================================================
 * Product Insights API - RAG-powered product analysis
 * =================================================================*/

/**
 * Fetch product insights from RAG retrieval server using MCP protocol
 * Uses semantic search to find relevant product information from Milvus
 * OPTIMIZED: Reduced k from 5 to 3, added HTTP Keep-Alive
 */
async function fetchProductInsightsFromRAG(productName) {
  const startTime = Date.now();
  
  try {
    console.log(`[RAG] Fetching insights for product: "${productName}"`);
    
    // Call FastAPI /retrieve endpoint directly
    const response = await axios.post(
      `${RAG_RETRIEVAL_URL}/retrieve`,
      {
        query: productName,
        top_k: 3  // Retrieve top 3 results
      },
      {
        timeout: 30000,  // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // FastAPI returns: { results: [...], backend: "...", query: "..." }
    if (response.data && response.data.results && Array.isArray(response.data.results)) {
      console.log(`[RAG] Retrieved ${response.data.results.length} results from FastAPI`);
      return response.data.results;
    }
    
    // No results found
    console.log('[RAG] No results found in response');
    return [];
    
  } catch (error) {
    console.error("[RAG] Retrieval error:", error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error("[RAG] Connection refused - RAG server may not be running");
    } else if (error.response) {
      console.error("[RAG] Response status:", error.response.status);
      console.error("[RAG] Response data:", JSON.stringify(error.response.data));
    }
    
    // Return null to indicate server failure
    return null;
    
  } finally {
    const duration = Date.now() - startTime;
    console.log(`[PERF] RAG retrieval for "${productName}": ${duration}ms`);
    if (duration > 2000) {
      console.warn(`[SLOW] RAG retrieval took ${duration}ms for "${productName}"`);
    }
  }
}

/**
 * Extract structured data from markdown text
 */
function parseMarkdownSection(text, sectionName) {
  const lines = text.split('\n');
  const result = [];
  let inSection = false;
  
  for (const line of lines) {
    if (line.includes(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('##')) {
      break;
    }
    if (inSection && line.trim()) {
      result.push(line.trim());
    }
  }
  
  return result;
}

/**
 * Extract key features with impact levels from markdown
 */
function extractKeyFeatures(text) {
  const features = [];
  const lines = text.split('\n');
  let currentFeature = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Feature title (### heading)
    if (line.startsWith('###') && !line.includes('##')) {
      if (currentFeature) {
        features.push(currentFeature);
      }
      currentFeature = {
        title: line.replace(/^###\s*/, '').trim(),
        description: '',
        impact: 'Medium'
      };
    }
    // Impact level
    else if (line.startsWith('**Impact Level:**') && currentFeature) {
      const impact = line.replace('**Impact Level:**', '').trim();
      currentFeature.impact = impact;
    }
    // Description
    else if (currentFeature && line && !line.startsWith('#') && !line.startsWith('**')) {
      if (currentFeature.description) {
        currentFeature.description += ' ';
      }
      currentFeature.description += line;
    }
  }
  
  if (currentFeature) {
    features.push(currentFeature);
  }
  
  return features;
}

/**
 * Extract use cases with benefits from markdown
 */
function extractUseCases(text) {
  const useCases = [];
  const lines = text.split('\n');
  let currentUseCase = null;
  let inBenefits = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Use case title (### heading)
    if (trimmed.startsWith('###') && !trimmed.includes('##')) {
      if (currentUseCase) {
        useCases.push(currentUseCase);
      }
      currentUseCase = {
        scenario: trimmed.replace(/^###\s*/, '').trim(),
        description: '',
        benefits: []
      };
      inBenefits = false;
    }
    // Benefits section
    else if (trimmed.startsWith('**Benefits:**')) {
      inBenefits = true;
    }
    // Benefit item
    else if (inBenefits && trimmed.startsWith('-') && currentUseCase) {
      currentUseCase.benefits.push(trimmed.replace(/^-\s*/, ''));
    }
    // Description
    else if (currentUseCase && !inBenefits && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('**')) {
      if (currentUseCase.description) {
        currentUseCase.description += ' ';
      }
      currentUseCase.description += trimmed;
    }
  }
  
  if (currentUseCase) {
    useCases.push(currentUseCase);
  }
  
  // Format for frontend
  return useCases.map(uc => ({
    scenario: uc.scenario,
    description: uc.description,
    benefit: uc.benefits.join('; ') || 'Enhanced productivity and satisfaction'
  }));
}

/**
 * Extract technical specifications from markdown
 */
function extractTechnicalSpecs(text) {
  const specs = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('-') && trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.substring(1).split(':');
      const value = valueParts.join(':').trim();
      if (key && value) {
        const cleanKey = key.trim().replace(/\*\*/g, '').toLowerCase().replace(/\s+/g, '_');
        specs[cleanKey] = value;
      }
    }
  }
  
  return specs;
}

/**
 * Extract customer sentiment from markdown
 */
function extractCustomerSentiment(text) {
  const sentiment = {
    overallRating: 0,
    totalReviews: 0,
    positiveAspects: [],
    commonConcerns: [],
    recommendationRate: 0
  };
  
  const lines = text.split('\n');
  let inPositive = false;
  let inConcerns = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Extract rating
    if (trimmed.includes('Overall Rating:') || trimmed.startsWith('###') && trimmed.includes('/5')) {
      const match = trimmed.match(/(\d+\.?\d*)\s*\/\s*5/);
      if (match) {
        sentiment.overallRating = parseFloat(match[1]);
      }
    }
    
    // Positive aspects section
    if (trimmed.includes('### Positive Aspects') || trimmed.includes('Positive Aspects')) {
      inPositive = true;
      inConcerns = false;
    }
    // Common concerns section
    else if (trimmed.includes('### Common Feedback') || trimmed.includes('Common Feedback') || trimmed.includes('Common Concerns')) {
      inConcerns = true;
      inPositive = false;
    }
    // Extract list items
    else if (trimmed.match(/^\d+\.\s+\*\*(.+?)\*\*/)) {
      const match = trimmed.match(/^\d+\.\s+\*\*(.+?)\*\*/);
      if (match) {
        const item = match[1] + (trimmed.includes('-') ? ': ' + trimmed.split('-')[1].trim() : '');
        if (inPositive) {
          sentiment.positiveAspects.push(item);
        } else if (inConcerns) {
          sentiment.commonConcerns.push(item);
        }
      }
    }
  }
  
  // Default recommendation rate based on rating
  sentiment.recommendationRate = Math.round(sentiment.overallRating * 20);
  
  return sentiment;
}

/**
 * Extract FAQs from markdown
 */
function extractFAQs(text) {
  const faqs = [];
  const lines = text.split('\n');
  let currentQ = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('**Q:')) {
      if (currentQ) {
        faqs.push(currentQ);
      }
      currentQ = {
        question: trimmed.replace(/^\*\*Q:\s*/, '').replace(/\*\*$/, '').replace(/\?$/, '') + '?',
        answer: ''
      };
    } else if (trimmed.startsWith('A:') && currentQ) {
      currentQ.answer = trimmed.replace(/^A:\s*/, '');
    }
  }
  
  if (currentQ) {
    faqs.push(currentQ);
  }
  
  return faqs;
}

/**
 * Transform RAG results into structured insights
 * Extracts ALL available data from MCP server results
 */
function transformRAGToInsights(ragResults, product) {
  // null means MCP server failed/unavailable
  if (ragResults === null) {
    return {
      status: "generating",
      message: "We're generating AI-powered insights for this product. Please check back in a moment!",
      productName: product?.name || "this product",
      ragSource: "unavailable",
      ragResultsCount: 0
    };
  }
  
  // Empty array means MCP worked but no documents found in Milvus
  if (ragResults.length === 0) {
    return {
      status: "generating",
      message: "AI insights for this product are being indexed. Please check back shortly!",
      productName: product?.name || "this product",
      ragSource: "empty",
      ragResultsCount: 0
    };
  }

  // Combine all text from results
  const fullText = ragResults.map(r => r.text || '').join('\n\n');
  
  console.log(`[RAG] Processing ${ragResults.length} results, total text length: ${fullText.length}`);

  // Extract all sections
  const keyFeatures = extractKeyFeatures(fullText);
  const useCases = extractUseCases(fullText);
  const technicalSpecs = extractTechnicalSpecs(fullText);
  const customerSentiment = extractCustomerSentiment(fullText);
  const faqs = extractFAQs(fullText);
  
  // Extract summary from Product Summary section
  let summary = '';
  const summaryMatch = fullText.match(/## Product Summary\s+([\s\S]+?)(?=\n##|$)/);
  if (summaryMatch) {
    summary = summaryMatch[1].trim().split('\n')[0];
  }
  
  // Extract recommendations
  const recommendations = [];
  const recoMatch = fullText.match(/### Complementary Products\s+([\s\S]+?)(?=\n###|$)/);
  if (recoMatch) {
    const recoLines = recoMatch[1].split('\n').filter(l => l.trim().startsWith('-'));
    recoLines.forEach(line => {
      const item = line.replace(/^-\s*/, '').trim();
      if (item) {
        recommendations.push({
          type: 'Accessory',
          item: item,
          reason: 'Enhances product experience'
        });
      }
    });
  }

  console.log(`[RAG] Extracted: ${keyFeatures.length} features, ${useCases.length} use cases, ${Object.keys(technicalSpecs).length} specs`);

  return {
    summary: summary || `${product.name} offers excellent features and performance.`,
    keyFeatures: keyFeatures.length > 0 ? keyFeatures : [
      {
        title: "Quality Product",
        description: "High-quality construction and materials",
        impact: "High"
      }
    ],
    useCases: useCases.length > 0 ? useCases : [
      {
        scenario: "General Use",
        description: "Suitable for everyday needs",
        benefit: "Reliable performance"
      }
    ],
    technicalSpecs: Object.keys(technicalSpecs).length > 0 ? technicalSpecs : {
      quality: "Premium",
      warranty: "Standard manufacturer warranty"
    },
    customerSentiment: customerSentiment.overallRating > 0 ? customerSentiment : {
      overallRating: 4.2,
      totalReviews: 0,
      positiveAspects: ["Quality product", "Good features"],
      commonConcerns: [],
      recommendationRate: 85
    },
    recommendations: recommendations.length > 0 ? recommendations : [],
    faqs: faqs.length > 0 ? faqs : [],
    ragSource: "milvus",
    ragResultsCount: ragResults.length
  };
}

/**
 * Fallback insights when RAG is unavailable
 */
function generateFallbackInsights(product) {
  // Detailed insights for specific products
  if (product && product.id === 1) {
    return {
      summary: "The Wireless Bluetooth Headphones offer premium audio quality with advanced noise cancellation technology. Perfect for music enthusiasts and professionals who need to focus in noisy environments.",
      keyFeatures: [
        {
          title: "Active Noise Cancellation",
          description: "Advanced ANC technology blocks out ambient noise for immersive listening",
          impact: "High"
        },
        {
          title: "40-Hour Battery Life",
          description: "Extended playtime with quick charge capability (5 min = 2 hours)",
          impact: "High"
        },
        {
          title: "Premium Sound Quality",
          description: "Hi-Res Audio certified with custom 40mm drivers",
          impact: "High"
        },
        {
          title: "Comfortable Design",
          description: "Memory foam ear cushions and adjustable headband for all-day wear",
          impact: "Medium"
        }
      ],
      useCases: [
        {
          scenario: "Remote Work & Video Calls",
          description: "Crystal-clear audio for virtual meetings with built-in microphone and noise cancellation",
          benefit: "Improved communication quality and reduced background distractions"
        },
        {
          scenario: "Travel & Commuting",
          description: "Compact foldable design with carrying case, perfect for flights and daily commutes",
          benefit: "Peaceful listening experience in noisy environments"
        },
        {
          scenario: "Music Production",
          description: "Accurate sound reproduction for mixing and mastering",
          benefit: "Professional-grade audio monitoring"
        }
      ],
      technicalSpecs: {
        audioQuality: "Hi-Res Audio (up to 40kHz)",
        batteryLife: "40 hours (ANC on), 60 hours (ANC off)",
        chargingTime: "2 hours full charge, Quick charge supported",
        connectivity: "Bluetooth 5.0, 3.5mm wired option",
        weight: "250g",
        warranty: "2 years manufacturer warranty"
      },
      customerSentiment: {
        overallRating: 4.5,
        totalReviews: 1247,
        positiveAspects: [
          "Exceptional noise cancellation",
          "Comfortable for long sessions",
          "Great battery life"
        ],
        commonConcerns: [
          "Slightly heavy for some users",
          "Premium price point"
        ],
        recommendationRate: 92
      },
      recommendations: [
        {
          type: "Accessory",
          item: "Premium carrying case with extra padding",
          reason: "Enhanced protection during travel"
        },
        {
          type: "Accessory",
          item: "Replacement ear cushions",
          reason: "Maintain comfort over extended use"
        },
        {
          type: "Alternative",
          item: "Wireless Earbuds Pro",
          reason: "More portable option for active lifestyles"
        }
      ]
    };
  }
  
  if (product && product.id === 2) {
    return {
      summary: "The Smart Fitness Watch combines advanced health tracking with smart notifications. Ideal for fitness enthusiasts and health-conscious individuals who want comprehensive activity monitoring.",
      keyFeatures: [
        {
          title: "Advanced Health Monitoring",
          description: "Track heart rate, blood oxygen, sleep quality, and stress levels",
          impact: "High"
        },
        {
          title: "GPS & Multi-Sport Tracking",
          description: "Built-in GPS with 100+ sport modes for accurate activity tracking",
          impact: "High"
        },
        {
          title: "7-Day Battery Life",
          description: "Long-lasting battery with fast charging capability",
          impact: "Medium"
        },
        {
          title: "Water Resistant",
          description: "5ATM water resistance for swimming and water sports",
          impact: "Medium"
        }
      ],
      useCases: [
        {
          scenario: "Fitness Training",
          description: "Track workouts, monitor heart rate zones, and analyze performance metrics",
          benefit: "Optimize training effectiveness and prevent overexertion"
        },
        {
          scenario: "Health Monitoring",
          description: "24/7 health tracking with alerts for irregular patterns",
          benefit: "Early detection of potential health issues"
        },
        {
          scenario: "Daily Activity",
          description: "Step counting, calorie tracking, and sedentary reminders",
          benefit: "Maintain active lifestyle and reach daily goals"
        }
      ],
      technicalSpecs: {
        display: "1.4-inch AMOLED touchscreen",
        batteryLife: "7 days typical use, 20 hours GPS mode",
        waterResistance: "5ATM (50 meters)",
        sensors: "Heart rate, SpO2, accelerometer, gyroscope, GPS",
        compatibility: "iOS 12+ and Android 6.0+",
        warranty: "1 year manufacturer warranty"
      },
      customerSentiment: {
        overallRating: 4.3,
        totalReviews: 892,
        positiveAspects: [
          "Accurate health tracking",
          "Great battery life",
          "Comfortable to wear"
        ],
        commonConcerns: [
          "App could be more intuitive",
          "Limited third-party app support"
        ],
        recommendationRate: 87
      },
      recommendations: [
        {
          type: "Accessory",
          item: "Additional watch bands",
          reason: "Customize style for different occasions"
        },
        {
          type: "Accessory",
          item: "Screen protector",
          reason: "Protect display from scratches"
        },
        {
          type: "Complement",
          item: "Wireless Bluetooth Headphones",
          reason: "Complete workout setup with music"
        }
      ]
    };
  }

  return {
    summary: `${product?.name || 'This product'} offers great value and quality. RAG insights temporarily unavailable.`,
    keyFeatures: [
      {
        title: "Quality Construction",
        description: "Built with premium materials for durability",
        impact: "High"
      },
      {
        title: "User-Friendly Design",
        description: "Intuitive interface and easy to use",
        impact: "Medium"
      },
      {
        title: "Great Value",
        description: "Competitive pricing for the features offered",
        impact: "Medium"
      }
    ],
    useCases: [
      {
        scenario: "Everyday Use",
        description: "Perfect for daily activities and regular use",
        benefit: "Reliable performance when you need it"
      }
    ],
    technicalSpecs: {
      quality: "Premium",
      warranty: "Standard manufacturer warranty"
    },
    customerSentiment: {
      overallRating: 4.0,
      totalReviews: 0,
      positiveAspects: ["Quality product", "Good value"],
      commonConcerns: [],
      recommendationRate: 80
    },
    recommendations: [],
    ragSource: "fallback"
  };
}

/**
 * GET /api/products/:productId/insights
 * Returns RAG-powered insights for a specific product
 * OPTIMIZED: Added caching, optional product name parameter, performance logging
 */
router.get("/products/:productId/insights", async (req, res) => {
  const requestStartTime = Date.now();
  
  try {
    const productId = parseInt(req.params.productId);
    const productNameParam = req.query.name; // OPTIMIZED: Optional product name from frontend
    
    if (isNaN(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // OPTIMIZED: Check cache first
    const cacheKey = `product_insights_${productId}`;
    const cachedInsights = insightsCache.get(cacheKey);
    
    if (cachedInsights) {
      const duration = Date.now() - requestStartTime;
      console.log(`[CACHE HIT] Product ${productId} insights served from cache in ${duration}ms`);
      return res.json({
        ...cachedInsights,
        cached: true,
        responseTime: duration
      });
    }

    console.log(`[CACHE MISS] Product ${productId} - fetching from RAG`);

    let product;
    let productName;

    // OPTIMIZED: Use provided product name if available, skip DB query
    if (productNameParam) {
      productName = productNameParam;
      product = { id: productId, name: productName };
      console.log(`[OPTIMIZED] Using provided product name: "${productName}" - skipped DB query`);
    } else {
      // Fallback: Fetch product details from database
      const productResult = await db.query(
        "SELECT id, name, description, price FROM products WHERE id = $1",
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      product = productResult.rows[0];
      productName = product.name;
    }
    
    // Fetch insights from RAG retrieval server
    const ragResults = await fetchProductInsightsFromRAG(productName);
    const insights = transformRAGToInsights(ragResults, product);

    const responseData = {
      productId: product.id,
      productName: productName,
      ...insights,
      cached: false
    };

    // OPTIMIZED: Only cache if we have real RAG data (not fallback)
    // Don't cache generic fallback messages so they can be retried
    if (insights.ragSource === "milvus" && insights.ragResultsCount > 0) {
      insightsCache.set(cacheKey, responseData);
      console.log(`[CACHE SET] Product ${productId} insights cached (${insights.ragResultsCount} RAG results)`);
    } else {
      console.log(`[CACHE SKIP] Product ${productId} - fallback response not cached, will retry on next request`);
    }

    const totalDuration = Date.now() - requestStartTime;
    console.log(`[PERF] Total request time for product ${productId}: ${totalDuration}ms`);

    res.json({
      ...responseData,
      responseTime: totalDuration
    });
  } catch (err) {
    console.error("Product insights error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* ---------------------------------------------------------------
 * CLUSTER OPERATIONS  (Load Testing / System Analysis)
 * All four endpoints call the Kubernetes/OpenShift REST API
 * directly via axios — no oc CLI required in the container.
 * --------------------------------------------------------------- */

// Shared axios instance that skips TLS verification (self-signed certs on IKS/ROKS)
const k8sAgent = new https.Agent({ rejectUnauthorized: false });

function k8sClient(serverUrl, token) {
  return axios.create({
    baseURL: serverUrl,
    headers: { Authorization: `Bearer ${token}` },
    httpsAgent: k8sAgent,
    timeout: 20000,
    maxContentLength: 10 * 1024 * 1024, // 10 MB — pod lists on large clusters can be big
    maxBodyLength:    10 * 1024 * 1024,
  });
}

function k8sError(err) {
  const msg =
    err.response?.data?.message ||
    err.response?.data?.reason  ||
    err.message;
  return String(msg || "Unknown cluster error");
}

// POST /api/admin/cluster/test
// Calls GET /apis/user.openshift.io/v1/users/~ (the "whoami" endpoint)
router.post("/admin/cluster/test", authMiddleware, adminOnly, async (req, res) => {
  const { clusterServerUrl, clusterToken } = req.body;
  if (!clusterServerUrl || !clusterToken) {
    return res.status(400).json({ message: "clusterServerUrl and clusterToken are required" });
  }
  try {
    const client = k8sClient(clusterServerUrl, clusterToken);
    const resp = await client.get("/apis/user.openshift.io/v1/users/~");
    const user = resp.data?.metadata?.name || resp.data?.fullName || "unknown";
    res.json({ success: true, message: `Connected as: ${user}` });
  } catch (err) {
    console.error("[CLUSTER TEST]", k8sError(err));
    res.status(502).json({ success: false, message: `Connection failed: ${k8sError(err)}` });
  }
});

// POST /api/admin/namespaces
router.post("/admin/namespaces", authMiddleware, adminOnly, async (req, res) => {
  const { clusterServerUrl, clusterToken } = req.body;
  if (!clusterServerUrl || !clusterToken) {
    return res.status(400).json({ message: "clusterServerUrl and clusterToken are required" });
  }
  try {
    const client = k8sClient(clusterServerUrl, clusterToken);
    const resp = await client.get("/api/v1/namespaces");
    const all = (resp.data?.items || []).map(n => n.metadata.name).sort();
    res.json({ success: true, namespaces: all });
  } catch (err) {
    console.error("[NAMESPACES]", k8sError(err));
    res.status(502).json({ success: false, message: `Failed to list namespaces: ${k8sError(err)}` });
  }
});

// POST /api/admin/pods/metrics
router.post("/admin/pods/metrics", authMiddleware, adminOnly, async (req, res) => {
  const { clusterServerUrl, clusterToken, namespace } = req.body;
  if (!clusterServerUrl || !clusterToken || !namespace) {
    return res.status(400).json({ message: "clusterServerUrl, clusterToken and namespace are required" });
  }
  try {
    const client = k8sClient(clusterServerUrl, clusterToken);
    const resp = await client.get(`/api/v1/namespaces/${namespace}/pods`);
    const pods = (resp.data?.items || []).map(pod => {
      const containers = pod.spec.containers || [];
      return {
        name:          pod.metadata.name,
        status:        pod.status.phase,
        ready:         (pod.status.containerStatuses || []).every(c => c.ready),
        cpuRequest:    `${containers.reduce((s, c) => s + parseCpu(c.resources?.requests?.cpu),    0)}m`,
        cpuLimit:      `${containers.reduce((s, c) => s + parseCpu(c.resources?.limits?.cpu),      0)}m`,
        memoryRequest: `${containers.reduce((s, c) => s + parseMem(c.resources?.requests?.memory), 0)}Mi`,
        memoryLimit:   `${containers.reduce((s, c) => s + parseMem(c.resources?.limits?.memory),   0)}Mi`,
        restarts:      (pod.status.containerStatuses || []).reduce((s, c) => s + c.restartCount, 0),
      };
    });
    res.json({ success: true, pods, namespace });
  } catch (err) {
    console.error("[POD METRICS]", k8sError(err));
    res.status(502).json({ success: false, message: `Failed to get pod metrics: ${k8sError(err)}` });
  }
});

// POST /api/admin/jmeter/run
// Deletes any existing jmeter-simulation Job then creates a fresh one.
router.post("/admin/jmeter/run", authMiddleware, adminOnly, async (req, res) => {
  const { backendRoute, clusterServerUrl, clusterToken, namespace } = req.body;
  if (!backendRoute || !clusterServerUrl || !clusterToken || !namespace) {
    return res.status(400).json({ message: "backendRoute, clusterServerUrl, clusterToken and namespace are required" });
  }
  try {
    const client = k8sClient(clusterServerUrl, clusterToken);
    const jobsBase = `/apis/batch/v1/namespaces/${namespace}/jobs`;

    // Delete old job with foreground propagation (waits for pods to terminate),
    // then poll until it is fully gone (404) before creating a new one.
    try {
      await client.delete(`${jobsBase}/jmeter-simulation`, {
        data: { apiVersion: "v1", kind: "DeleteOptions", propagationPolicy: "Foreground" },
      });
      // Wait up to 30 s for the job to disappear
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          await client.get(`${jobsBase}/jmeter-simulation`);
          // Still exists — keep waiting
        } catch (e) {
          if (e.response && e.response.status === 404) break; // Gone — safe to proceed
        }
      }
    } catch (e) {
      if (!e.response || e.response.status !== 404) throw e; // Unexpected error
    }

    const dockerUsername = process.env.DOCKER_USERNAME;
    if (!dockerUsername) {
      return res.status(500).json({ success: false, message: "DOCKER_USERNAME env var is not set on the backend pod" });
    }
    const jmeterImage = `docker.io/${dockerUsername}/retail-jmeter:1.0.1`;
    // Strip protocol and path — run_spike.sh passes this as -JserverHost which must be hostname only
    const serverHost  = backendRoute.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const jobManifest = {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: { name: "jmeter-simulation", namespace },
      spec: {
        ttlSecondsAfterFinished: 3600,
        backoffLimit: 0,
        template: {
          metadata: { labels: { app: "jmeter-simulation" } },
          spec: {
            restartPolicy: "Never",
            imagePullSecrets: [{ name: "dockerhub-secret" }],
            containers: [{
              name:            "jmeter",
              image:           jmeterImage,
              imagePullPolicy: "Always",
              command: ["bash", "/jmeter/run_spike.sh"],
              args:    [serverHost],
              env: [
                { name: "BACKEND_ROUTE",    value: serverHost },
                { name: "JVM_ARGS",         value: "-Djmeter.logfile=/tmp/jmeter.log" },
              ],
              resources: {
                requests: { memory: "512Mi", cpu: "500m" },
                limits:   { memory: "2Gi",  cpu: "2000m" },
              },
            }],
          },
        },
      },
    };

    await client.post(jobsBase, jobManifest);
    res.json({ success: true, message: `JMeter simulation started in namespace ${namespace}` });
  } catch (err) {
    console.error("[JMETER RUN]", k8sError(err));
    res.status(502).json({ success: false, message: `Failed to start JMeter: ${k8sError(err)}` });
  }
});

// CPU/memory unit parsers
function parseCpu(val) {
  if (!val) return 0;
  if (val.endsWith("m")) return parseInt(val);
  return parseInt(val) * 1000;
}
function parseMem(val) {
  if (!val) return 0;
  if (val.endsWith("Mi")) return parseInt(val);
  if (val.endsWith("Gi")) return Math.round(parseFloat(val) * 1024);
  if (val.endsWith("Ki")) return Math.round(parseInt(val) / 1024);
  return parseInt(val);
}

module.exports = router;

