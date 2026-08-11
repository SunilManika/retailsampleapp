
// backend/src/server.js
// CRITICAL: Instana collector MUST be the first require
// Load environment variables from .env file
require('dotenv').config();

if (process.env.INSTANA_ENABLED === 'true') {
  require('@instana/collector')({
    tracing: {
      enabled: true,
      automaticTracingEnabled: true,
      stackTraceLength: 10
    },
    metrics: {
      transmissionDelay: 1000
    }
  });
}

const fs = require('fs');
const https = require('https');
const http = require('http');

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const { Strategy: OpenIDConnectStrategy } = require("passport-openidconnect");
const db = require("./db");
const featureRoutes = require("./apiRoutes");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "changeme-in-prod";

// IBM Verify feature flag
const IBM_VERIFY_ENABLED = process.env.IBM_VERIFY_ENABLED === 'true';

// IBM Verify Configuration
const IBM_VERIFY_CONFIG = IBM_VERIFY_ENABLED ? {
  issuer: process.env.IBM_VERIFY_ISSUER,
  clientID: process.env.IBM_VERIFY_CLIENT_ID,
  clientSecret: process.env.IBM_VERIFY_CLIENT_SECRET,
  callbackURL: process.env.IBM_VERIFY_CALLBACK_URL,
  scope: (process.env.IBM_VERIFY_SCOPE || "openid profile email").split(" ")
} : null;

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true 
}));
app.use(express.json());

// Session configuration (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || "changeme-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport with IBM Verify OIDC Strategy (only if enabled)
if (IBM_VERIFY_ENABLED) {
  console.log("[IBM VERIFY] Configuring IBM Verify OIDC strategy");
  passport.use('ibm-verify', new OpenIDConnectStrategy(
  {
    issuer: IBM_VERIFY_CONFIG.issuer,
    authorizationURL: `${IBM_VERIFY_CONFIG.issuer}/authorize`,
    tokenURL: `${IBM_VERIFY_CONFIG.issuer}/token`,
    userInfoURL: `${IBM_VERIFY_CONFIG.issuer}/userinfo`,
    clientID: IBM_VERIFY_CONFIG.clientID,
    clientSecret: IBM_VERIFY_CONFIG.clientSecret,
    callbackURL: IBM_VERIFY_CONFIG.callbackURL,
    scope: IBM_VERIFY_CONFIG.scope
  },
  async (iss, sub, profile, jwtClaims, accessToken, refreshToken, params, done) => {
    try {
      console.log("[IBM VERIFY] Callback parameters:");
      console.log("  - iss:", iss);
      console.log("  - sub:", sub);
      console.log("  - profile:", profile);
      console.log("  - jwtClaims:", jwtClaims);
      console.log("  - accessToken (first 50 chars):", accessToken ? accessToken.substring(0, 50) : 'none');
      console.log("  - accessToken format:", accessToken ? (accessToken.split('.').length === 3 ? 'JWT' : 'Opaque') : 'none');
      console.log("  - refreshToken:", !!refreshToken);
      console.log("  - params.access_token (first 50 chars):", params?.access_token ? params.access_token.substring(0, 50) : 'none');
      console.log("  - params.id_token (first 50 chars):", params?.id_token ? params.id_token.substring(0, 50) : 'none');
      
      // Extract user info - sub might be an object or string depending on passport version
      let verifyUserId = (typeof sub === 'object' ? sub.id : sub) || profile.id;
      let displayName = (typeof sub === 'object' ? sub.displayName : null) || profile.displayName || profile.name?.givenName;
      let username = (typeof sub === 'object' ? sub.username : null) || profile.username;
      let email = (typeof sub === 'object' && sub.emails ? sub.emails[0]?.value : null) || profile.emails?.[0]?.value;

      // Prefer JWT access token from params if available (better for SCIM API)
      let finalAccessToken = accessToken;
      if (params?.access_token && params.access_token.split('.').length === 3) {
        console.log("[IBM VERIFY] Using JWT access token from params");
        finalAccessToken = params.access_token;
      } else if (accessToken && accessToken.split('.').length === 3) {
        console.log("[IBM VERIFY] Using JWT access token from accessToken parameter");
        finalAccessToken = accessToken;
      } else {
        console.log("[IBM VERIFY] WARNING: Access token is not in JWT format, SCIM API calls may fail");
      }

      // Fetch additional user info from IBM Verify /userinfo endpoint using user's access token
      let additionalUserInfo = {};
      if (finalAccessToken) {
        try {
          const axios = require('axios');
          const userInfoResponse = await axios.get(`${IBM_VERIFY_CONFIG.issuer}/userinfo`, {
            headers: {
              'Authorization': `Bearer ${finalAccessToken}`
            }
          });
          additionalUserInfo = userInfoResponse.data;
          console.log("[IBM VERIFY] Additional user info from /userinfo:", additionalUserInfo);
          
          // Use userinfo as fallback for missing fields
          if (!displayName && additionalUserInfo.displayName) {
            displayName = additionalUserInfo.displayName;
          }
          if (!username && additionalUserInfo.preferred_username) {
            username = additionalUserInfo.preferred_username;
          }
          if (!email && additionalUserInfo.email) {
            email = additionalUserInfo.email;
          }
        } catch (err) {
          console.error("[IBM VERIFY] Error fetching user info from /userinfo:", err.message);
        }
      }

      // Check if user needs to be inserted into database
      // Look for 'insertedintoDB' flag in IBM Verify custom attributes
      const insertedintoDB = additionalUserInfo.insertedintoDB ||
                             additionalUserInfo['urn:ietf:params:scim:schemas:extension:ibm:2.0:User']?.insertedintoDB;
      
      // If not inserted or flag is false, insert into database
      if (!insertedintoDB || insertedintoDB === 'false' || insertedintoDB === false) {
        console.log("[IBM VERIFY] User not in database, inserting...");
        
        try {
          const db = require('./db');
          
          // Check if user already exists in database by IBM Verify ID
          const existingUser = await db.query(
            'SELECT id FROM users WHERE id = $1',
            [verifyUserId]
          );
          
          if (existingUser.rows.length > 0) {
            // User already exists in DB
            console.log("[IBM VERIFY] User already exists in database with ID:", verifyUserId);
          } else {
            // Insert new user into database using IBM Verify user ID as primary key
            await db.query(
              `INSERT INTO users (id, username, password_hash, is_admin, default_address, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [
                verifyUserId, // Use IBM Verify user ID as the database ID
                username || email,
                'ibm_verify_user', // Placeholder password hash for IBM Verify users
                false,
                null
              ]
            );
            
            console.log("[IBM VERIFY] User inserted into database with IBM Verify ID:", verifyUserId);
            
            // Update IBM Verify profile to set insertedintoDB flag
            try {
              const tenantUrl = IBM_VERIFY_CONFIG.issuer.replace('/oidc/endpoint/default', '');
              
              // Get current user data from SCIM
              const currentUserData = await axios.get(
                `${tenantUrl}/v2.0/Me`,
                {
                  headers: {
                    'Authorization': `Bearer ${finalAccessToken}`,
                    'Accept': 'application/scim+json'
                  }
                }
              );
              
              // Prepare update payload with insertedintoDB flag
              const updatePayload = {
                schemas: [
                  'urn:ietf:params:scim:schemas:core:2.0:User',
                  'urn:ietf:params:scim:schemas:extension:ibm:2.0:User'
                ],
                id: verifyUserId,
                userName: currentUserData.data.userName,
                name: currentUserData.data.name,
                emails: currentUserData.data.emails,
                active: true,
                'urn:ietf:params:scim:schemas:extension:ibm:2.0:User': {
                  ...(currentUserData.data['urn:ietf:params:scim:schemas:extension:ibm:2.0:User'] || {}),
                  insertedintoDB: 'true'
                }
              };
              
              // Update IBM Verify profile
              await axios.put(
                `${tenantUrl}/v2.0/Me`,
                updatePayload,
                {
                  headers: {
                    'Authorization': `Bearer ${finalAccessToken}`,
                    'Content-Type': 'application/scim+json',
                    'Accept': 'application/scim+json'
                  }
                }
              );
              
              console.log("[IBM VERIFY] Updated IBM Verify profile with insertedintoDB flag");
            } catch (updateError) {
              console.error("[IBM VERIFY] Error updating IBM Verify profile flag:", updateError.response?.data || updateError.message);
              // Don't fail authentication if flag update fails
            }
          }
        } catch (dbError) {
          console.error("[IBM VERIFY] Error inserting user into database:", dbError.message);
          // Don't fail authentication if DB insert fails
        }
      } else {
        console.log("[IBM VERIFY] User already inserted into database (flag is set)");
      }

      // Create user object from IBM Verify profile
      const user = {
        id: verifyUserId, // IBM Verify user ID (also used as database ID)
        username: username || displayName || email,
        displayName: displayName || username,
        email: email,
        is_admin: false,
        auth_method: 'ibm_verify',
        accessToken: finalAccessToken, // Store user's JWT access token
        refreshToken: refreshToken, // Store refresh token
        verifyUserInfo: additionalUserInfo // Store additional info from IBM Verify /userinfo
      };

      console.log("[IBM VERIFY] User authenticated:", user.username);
      console.log("[IBM VERIFY] User object:", user);
      return done(null, user);
    } catch (err) {
      console.error("[IBM VERIFY] Error processing user:", err);
      return done(err);
    }
  }
  ));
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    // First try to get from database (for local users)
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      return done(null, result.rows[0]);
    }
    
    // If not in database, it's an IBM Verify user - reconstruct from session
    // IBM Verify users are stored in session, not database
    console.log("[DESERIALIZE] IBM Verify user from session:", id);
    done(null, { id: id, auth_method: 'ibm_verify' });
  } catch (err) {
    console.error("[DESERIALIZE] Error:", err);
    // If database query fails, assume it's an IBM Verify user
    done(null, { id: id, auth_method: 'ibm_verify' });
  }
});

// Mount feature routes
app.use("/api", featureRoutes);

/* -------------------------------------------------------------
 * HEALTH CHECKS
 * ----------------------------------------------------------- */
app.get("/health/live", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/ready", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ready" });
  } catch (err) {
    console.error("Readiness check failed:", err.message);
    res.status(500).json({ status: "not_ready" });
  }
});

/* -------------------------------------------------------------
 * AUTH MIDDLEWARE
 * ----------------------------------------------------------- */
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
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* -------------------------------------------------------------
 * IBM VERIFY AUTHENTICATION ROUTES (only if enabled)
 * ----------------------------------------------------------- */

if (IBM_VERIFY_ENABLED) {
  // Initiate IBM Verify login
  app.get("/api/auth/verify/login",
    passport.authenticate('ibm-verify', {
      scope: IBM_VERIFY_CONFIG.scope
    })
  );

  // IBM Verify callback
  app.get("/api/auth/verify/callback",
    passport.authenticate('ibm-verify', {
      failureRedirect: '/api/auth/verify/failure',
      session: true
    }),
    async (req, res) => {
      try {
        console.log("[IBM VERIFY] Creating JWT for user:", req.user);
        
        // Generate JWT token with IBM Verify user data including access token
        const token = jwt.sign(
          {
            userId: req.user.id, // Just the ID string
            username: req.user.username, // Username string
            displayName: req.user.displayName, // Display name for UI
            is_admin: req.user.is_admin,
            email: req.user.email, // Email string
            auth_method: req.user.auth_method || 'ibm_verify',
            accessToken: req.user.accessToken, // Include access token for SCIM API calls
            refreshToken: req.user.refreshToken,
            verifyUserInfo: req.user.verifyUserInfo || {}
          },
          JWT_SECRET,
          { expiresIn: "8h" }
        );

        console.log("[IBM VERIFY] JWT token created successfully");

        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      } catch (err) {
        console.error("[IBM VERIFY] Callback error:", err);
        res.redirect('/api/auth/verify/failure');
      }
    }
  );

  // Authentication failure
  app.get("/api/auth/verify/failure", (req, res) => {
    res.status(401).json({
      message: "IBM Verify authentication failed"
    });
  });

  // Get current user
  app.get("/api/auth/verify/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        is_admin: req.user.is_admin
      }
    });
  });
} else {
  // Return 404 for IBM Verify routes when disabled
  app.get("/api/auth/verify/login", (req, res) => {
    res.status(404).json({ message: "IBM Verify authentication is disabled" });
  });
  
  app.get("/api/auth/verify/callback", (req, res) => {
    res.status(404).json({ message: "IBM Verify authentication is disabled" });
  });
  
  app.get("/api/auth/verify/failure", (req, res) => {
    res.status(404).json({ message: "IBM Verify authentication is disabled" });
  });
  
  app.get("/api/auth/verify/user", (req, res) => {
    res.status(404).json({ message: "IBM Verify authentication is disabled" });
  });
}

/* -------------------------------------------------------------
 * TRADITIONAL USERNAME/PASSWORD AUTHENTICATION
 * ----------------------------------------------------------- */

// Traditional login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    console.log("[LOGIN] Attempting login for user:", username);

    // Query user from database
    const result = await db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      console.log("[LOGIN] User not found:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check if this is an IBM Verify user (they have placeholder password)
    if (user.password_hash === 'ibm_verify_user') {
      console.log("[LOGIN] IBM Verify user attempted traditional login:", username);
      return res.status(401).json({ 
        message: "Please use IBM Verify to login",
        useIBMVerify: true
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      console.log("[LOGIN] Invalid password for user:", username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("[LOGIN] User authenticated successfully:", username);

    // Record login event
    try {
      await db.query(
        "INSERT INTO login_events (user_id, login_at) VALUES ($1, NOW())",
        [user.id]
      );
    } catch (err) {
      console.error("[LOGIN] Error recording login event:", err);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        is_admin: user.is_admin || false,
        email: user.email,
        auth_method: 'traditional'
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin || false,
        auth_method: 'traditional'
      }
    });
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Traditional registration endpoint
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    console.log("[REGISTER] Attempting to register user:", username);

    // Check if username already exists
    const existing = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      console.log("[REGISTER] Username already exists:", username);
      return res.status(409).json({ message: "Username already exists" });
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const result = await db.query(
      `INSERT INTO users (username, password_hash, email, is_admin, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, username, email, is_admin`,
      [username, password_hash, email || null, false]
    );

    const newUser = result.rows[0];
    console.log("[REGISTER] User registered successfully:", username);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        username: newUser.username,
        is_admin: newUser.is_admin || false,
        email: newUser.email,
        auth_method: 'traditional'
      },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        is_admin: newUser.is_admin || false,
        auth_method: 'traditional'
      }
    });
  } catch (err) {
    console.error("[REGISTER] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


/* -------------------------------------------------------------
 * LOGOUT
 * ----------------------------------------------------------- */
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    console.log("[LOGOUT] User logging out:", req.user.username);
    
    if (req.logout) {
      req.logout((err) => {
        if (err) console.error("[LOGOUT] Error:", err);
      });
    }
    
    // Extract tenant URL from IBM_VERIFY_ISSUER and construct Verify logout URL (only if enabled)
    let verifyLogoutUrl = null;
    
    if (IBM_VERIFY_ENABLED && process.env.IBM_VERIFY_ISSUER) {
      const issuer = process.env.IBM_VERIFY_ISSUER;
      // Extract base URL (e.g., https://emeabuildlab.verify.ibm.com)
      const url = new URL(issuer);
      const tenantUrl = `${url.protocol}//${url.host}`;
      verifyLogoutUrl = `${tenantUrl}/idaas/mtfim/sps/idaas/logout?themeId=
62fe669f-891f-45f9-94a6-48cc983a0f5d`;
      console.log("[LOGOUT] IBM Verify logout URL:", verifyLogoutUrl);
    }
    
    res.json({
      message: "Logged out",
      verifyLogoutUrl: verifyLogoutUrl
    });
  } catch (err) {
    console.error("[LOGOUT] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * HELPER: GET OR CREATE OPEN CART
 * ----------------------------------------------------------- */
async function getOrCreateCart(userId, client = null) {
  const executor = client || db;

  const result = await executor.query(
    "SELECT id FROM carts WHERE user_id = $1 AND status = 'OPEN' ORDER BY id DESC LIMIT 1",
    [userId]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  const insert = await executor.query(
    "INSERT INTO carts (user_id, status) VALUES ($1, 'OPEN') RETURNING id",
    [userId]
  );
  return insert.rows[0].id;
}

/* -------------------------------------------------------------
 * PRODUCTS
 * ----------------------------------------------------------- */
app.get("/api/products", async (req, res) => {
  const { search, category, sort } = req.query;

  let query = "SELECT * FROM products WHERE 1=1";
  const params = [];
  let idx = 1;

  if (search) {
    query += ` AND (LOWER(name) LIKE $${idx} OR LOWER(description) LIKE $${idx})`;
    params.push(`%${search.toLowerCase()}%`);
    idx++;
  }

  if (category) {
    query += ` AND category = $${idx}`;
    params.push(category);
    idx++;
  }

  if (sort === "price_asc") {
    query += " ORDER BY price ASC";
  } else if (sort === "price_desc") {
    query += " ORDER BY price DESC";
  } else if (sort === "rating_desc") {
    query += " ORDER BY rating DESC NULLS LAST";
  } else {
    query += " ORDER BY id ASC";
  }

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("[PRODUCTS] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * CART – GET
 * ----------------------------------------------------------- */
app.get("/api/cart", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const cartId = await getOrCreateCart(userId);

    const items = await db.query(
      `SELECT ci.id AS cart_item_id, ci.quantity,
              p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    const total = items.rows.reduce(
      (sum, row) => sum + Number(row.price) * row.quantity,
      0
    );

    res.json({ cartId, items: items.rows, total });
  } catch (err) {
    console.error("[CART] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * CART – ADD ITEM
 * ----------------------------------------------------------- */
app.post("/api/cart/add", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body || {};
  const qty = Number(quantity) || 1;

  if (!productId || qty <= 0) {
    return res.status(400).json({ message: "Invalid product or quantity" });
  }

  try {
    const cartId = await getOrCreateCart(userId);

    const existing = await db.query(
      "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2",
      [cartId, productId]
    );

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + qty;
      await db.query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2",
        [newQty, existing.rows[0].id]
      );
    } else {
      await db.query(
        "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)",
        [cartId, productId, qty]
      );
    }

    const items = await db.query(
      `SELECT ci.id AS cart_item_id, ci.quantity,
              p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    const total = items.rows.reduce(
      (sum, row) => sum + Number(row.price) * row.quantity,
      0
    );

    res.json({ cartId, items: items.rows, total });
  } catch (err) {
    console.error("[CART ADD] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * CART – UPDATE ITEM
 * ----------------------------------------------------------- */
app.put("/api/cart/item/:itemId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.itemId;
  const qty = Number(req.body.quantity);

  if (Number.isNaN(qty)) {
    return res.status(400).json({ message: "Invalid quantity" });
  }

  try {
    const cartId = await getOrCreateCart(userId);

    if (qty <= 0) {
      await db.query("DELETE FROM cart_items WHERE id = $1 AND cart_id = $2", [
        itemId,
        cartId
      ]);
    } else {
      await db.query(
        "UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3",
        [qty, itemId, cartId]
      );
    }

    const items = await db.query(
      `SELECT ci.id AS cart_item_id, ci.quantity,
              p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    const total = items.rows.reduce(
      (sum, row) => sum + Number(row.price) * row.quantity,
      0
    );

    res.json({ cartId, items: items.rows, total });
  } catch (err) {
    console.error("[CART UPDATE] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * CART – DELETE ITEM
 * ----------------------------------------------------------- */
app.delete("/api/cart/item/:itemId", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const itemId = req.params.itemId;

  try {
    const cartId = await getOrCreateCart(userId);

    await db.query("DELETE FROM cart_items WHERE id = $1 AND cart_id = $2", [
      itemId,
      cartId
    ]);

    const items = await db.query(
      `SELECT ci.id AS cart_item_id, ci.quantity,
              p.id AS product_id, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    const total = items.rows.reduce(
      (sum, row) => sum + Number(row.price) * row.quantity,
      0
    );

    res.json({ cartId, items: items.rows, total });
  } catch (err) {
    console.error("[CART DELETE] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * MY ORDERS
 * ----------------------------------------------------------- */
app.get("/api/orders/my", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, total_amount, status, delivery_address,
              payment_method, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[ORDERS MY] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/* -------------------------------------------------------------
 * CHECKOUT
 * ----------------------------------------------------------- */
app.post("/api/orders/checkout", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { deliveryAddress, paymentMethod } = req.body || {};

  if (!deliveryAddress || !paymentMethod) {
    return res.status(400).json({
      message: "Delivery address and payment method required"
    });
  }

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    const cartId = await getOrCreateCart(userId, client);

    const cartItems = await client.query(
      `SELECT ci.id, ci.quantity,
              p.id AS product_id, p.stock, p.price, p.name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       FOR UPDATE`,
      [cartId]
    );

    if (cartItems.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Cart is empty" });
    }

    let totalAmt = 0;
    for (const item of cartItems.rows) {
      if (item.stock < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: `Insufficient stock for ${item.name}`,
          productId: item.product_id
        });
      }
      totalAmt += Number(item.price) * item.quantity;
    }

    for (const item of cartItems.rows) {
      await client.query(
        "UPDATE products SET stock = stock - $1 WHERE id = $2",
        [item.quantity, item.product_id]
      );
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, payment_method, delivery_address)
       VALUES ($1, $2, 'PLACED', $3, $4)
       RETURNING id`,
      [userId, totalAmt, paymentMethod, deliveryAddress]
    );

    const orderId = orderRes.rows[0].id;

    for (const item of cartItems.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    await client.query("UPDATE carts SET status = 'CONVERTED' WHERE id = $1", [
      cartId
    ]);
    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    await client.query("COMMIT");

    console.log("[CHECKOUT] Order placed:", orderId);

    res.json({
      orderId,
      totalAmount: totalAmt,
      status: "PLACED"
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[CHECKOUT] Error:", err);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

/* -------------------------------------------------------------
 * START SERVER
 * ----------------------------------------------------------- */
const HTTPS_PORT = process.env.HTTPS_PORT || 4443;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/etc/ssl/certs/server.crt';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '/etc/ssl/private/server.key';

// Check if SSL certificates exist
const sslEnabled = fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH);

if (sslEnabled) {
  // Start HTTPS server
  const httpsOptions = {
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH)
  };
  
  https.createServer(httpsOptions, app).listen(HTTPS_PORT, () => {
    console.log(`✓ Retail backend HTTPS server running on port ${HTTPS_PORT}`);
    if (IBM_VERIFY_ENABLED) {
      console.log(`  IBM Verify callback URL: ${IBM_VERIFY_CONFIG.callbackURL}`);
    }
  });
  
  // Start HTTP server that redirects to HTTPS
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host.replace(PORT, HTTPS_PORT)}${req.url}` });
    res.end();
  }).listen(PORT, () => {
    console.log(`✓ Retail backend HTTP server running on port ${PORT} (redirects to HTTPS)`);
  });
} else {
  // Fallback to HTTP only if certificates don't exist
  app.listen(PORT, () => {
    console.log(`⚠ Retail backend running on HTTP port ${PORT} (SSL certificates not found)`);
    if (IBM_VERIFY_ENABLED) {
      console.log(`  IBM Verify callback URL: ${IBM_VERIFY_CONFIG.callbackURL}`);
    }
  });
}
