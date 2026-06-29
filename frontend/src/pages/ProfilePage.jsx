import React, { useEffect, useState } from "react";
import api from "../api";

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");

  async function loadProfile() {
    try {
      const res = await api.get("/me");
      setProfile(res.data);
      setAddress(res.data.default_address || "");
    } catch (err) {
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
      setMessage("Address updated.");
      await loadProfile();

      const stored = localStorage.getItem("authUser");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          user.default_address = address;
          localStorage.setItem("authUser", JSON.stringify(user));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      setMessage("Unable to update address.");
    }
  }

  if (!profile) {
    return (
      <div className="page">
        <h2 className="page-title">My Profile</h2>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h2 className="page-title">My Profile</h2>
      <p>
        <strong>Username:</strong> {profile.username}
      </p>
      {profile.email && (
        <p>
          <strong>Email:</strong> {profile.email}
        </p>
      )}
      {profile.created_at && (
        <p>
          <strong>Joined:</strong>{" "}
          {new Date(profile.created_at).toLocaleDateString()}
        </p>
      )}
      <p>
        <strong>Role:</strong> {profile.is_admin ? "Admin" : "User"}
      </p>
      {profile.auth_method && (
        <p>
          <strong>Authentication:</strong>{" "}
          {profile.auth_method === 'ibm_verify' ? 'IBM Verify' : 'Local'}
        </p>
      )}

      {/* Display additional IBM Verify user info if available */}
      {profile.verifyUserInfo && Object.keys(profile.verifyUserInfo).length > 0 && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1em' }}>IBM Verify Profile Data</h3>
          {/* {profile.verifyUserInfo.sub && (
            <p><strong>Subject ID:</strong> {profile.verifyUserInfo.sub}</p>
          )} */}
          {profile.verifyUserInfo.name && (
            <p><strong>Full Name:</strong> {profile.verifyUserInfo.name}</p>
          )}
          {/* {profile.verifyUserInfo.given_name && (
            <p><strong>Given Name:</strong> {profile.verifyUserInfo.given_name}</p>
          )} */}
          {profile.verifyUserInfo.family_name && (
            <p><strong>Family Name:</strong> {profile.verifyUserInfo.family_name}</p>
          )}
          {profile.verifyUserInfo.preferred_username && (
            <p><strong>Preferred Username:</strong> {profile.verifyUserInfo.preferred_username}</p>
          )}
          {profile.verifyUserInfo.email_verified !== undefined && (
            <p><strong>Email Verified:</strong> {profile.verifyUserInfo.email_verified ? 'Yes' : 'No'}</p>
          )}
        </div>
      )}

      <div className="checkout-section" style={{ marginTop: 16 }}>
        <label className="field-label">
          Default delivery address
          <textarea
            className="field-input textarea"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter default address"
          />
        </label>
        <button className="btn-primary" onClick={handleSave}>
          Save
        </button>
        {message && <div className="info-text">{message}</div>}
      </div>
    </div>
  );
}

export default ProfilePage;
