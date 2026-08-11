import React, { useEffect, useState } from "react";
import api from "../api";

function ProfilePage({ showToast }) {
  const [profile, setProfile] = useState(null);
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  async function loadProfile() {
    try {
      const res = await api.get("/me");
      setProfile(res.data);
      setAddress(res.data.default_address || "");
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSave() {
    setMessage("");
    try {
      await api.put("/me/address", { defaultAddress: address });
      setMessage("Address updated successfully.");
      if (showToast) showToast("Address updated ✓", "success");
      await loadProfile();
      const stored = localStorage.getItem("authUser");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          user.default_address = address;
          localStorage.setItem("authUser", JSON.stringify(user));
        } catch { /* ignore */ }
      }
    } catch {
      setMessage("Unable to update address.");
      if (showToast) showToast("Update failed", "error");
    }
  }

  if (!profile) {
    return (
      <div className="page">
        <h2 className="page-title">My Profile</h2>
        <p style={{ color: "#555" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">My Profile</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>
        {/* Account info card */}
        <div className="profile-card">
          <h2>Account Information</h2>
          <div className="profile-row">
            <strong>Username</strong>
            <span>{profile.username}</span>
          </div>
          {profile.email && (
            <div className="profile-row">
              <strong>Email</strong>
              <span>{profile.email}</span>
            </div>
          )}
          {profile.created_at && (
            <div className="profile-row">
              <strong>Member since</strong>
              <span>{new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          )}
          <div className="profile-row">
            <strong>Account type</strong>
            <span>
              {profile.is_admin ? (
                <span style={{ color: "#c7511f", fontWeight: 700 }}>Administrator</span>
              ) : (
                "Standard"
              )}
            </span>
          </div>
          {profile.auth_method && (
            <div className="profile-row">
              <strong>Sign-in method</strong>
              <span>{profile.auth_method === "ibm_verify" ? "IBM Verify" : "Local"}</span>
            </div>
          )}
        </div>

        {/* IBM Verify profile data */}
        {profile.verifyUserInfo &&
          Object.keys(profile.verifyUserInfo).length > 0 && (
            <div className="profile-card">
              <h2>IBM Verify Profile</h2>
              {profile.verifyUserInfo.name && (
                <div className="profile-row">
                  <strong>Full Name</strong>
                  <span>{profile.verifyUserInfo.name}</span>
                </div>
              )}
              {profile.verifyUserInfo.family_name && (
                <div className="profile-row">
                  <strong>Family Name</strong>
                  <span>{profile.verifyUserInfo.family_name}</span>
                </div>
              )}
              {profile.verifyUserInfo.preferred_username && (
                <div className="profile-row">
                  <strong>Preferred Username</strong>
                  <span>{profile.verifyUserInfo.preferred_username}</span>
                </div>
              )}
              {profile.verifyUserInfo.email_verified !== undefined && (
                <div className="profile-row">
                  <strong>Email Verified</strong>
                  <span style={{ color: profile.verifyUserInfo.email_verified ? "#007600" : "#c40000" }}>
                    {profile.verifyUserInfo.email_verified ? "✓ Yes" : "✗ No"}
                  </span>
                </div>
              )}
            </div>
          )}

        {/* Address card */}
        <div className="profile-card">
          <h2>Default Delivery Address</h2>
          <div className="checkout-section">
            <label className="field-label">
              Delivery address
              <textarea
                className="field-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your default delivery address"
              />
            </label>
            <button
              className="btn-primary"
              onClick={handleSave}
              style={{ alignSelf: "flex-start", padding: "9px 24px" }}
            >
              Save changes
            </button>
            {message && (
              <div
                className={message.includes("success") || message.includes("updated") ? "info-text" : "error-text"}
                style={{ marginTop: 4 }}
              >
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
