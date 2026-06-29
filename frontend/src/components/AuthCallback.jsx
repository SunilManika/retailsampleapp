import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * AuthCallback Component
 * Handles the OAuth callback from IBM Verify
 * Extracts the JWT token from URL and stores it
 */
function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const processCallback = () => {
      // Get token from URL query parameter
      const token = searchParams.get('token');
      
      if (token) {
        try {
          // Store token in localStorage
          localStorage.setItem('authToken', token);
          
          // Decode JWT to get user info (without verification - backend already verified)
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          console.log('[AuthCallback] JWT payload:', payload);
          
          const user = {
            id: payload.userId,
            username: payload.displayName || payload.username, // Use displayName for display
            is_admin: payload.is_admin || false,
            email: payload.email,
            auth_method: payload.auth_method,
            verifyUserInfo: payload.verifyUserInfo
          };
          
          console.log('[AuthCallback] User object to store:', user);
          
          // Store user info
          localStorage.setItem('authUser', JSON.stringify(user));
          
          setStatus('success');
          
          // Redirect to home page after short delay with page reload to update App state
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        } catch (err) {
          console.error('Error processing token:', err);
          setStatus('error');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        // No token - authentication failed
        console.error('No token received from IBM Verify');
        setStatus('error');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-card">
        {status === 'processing' && (
          <>
            <div className="spinner"></div>
            <h2>Authenticating with IBM Verify...</h2>
            <p>Please wait while we complete your login.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>Authentication Successful!</h2>
            <p>Redirecting you to the application...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <h2>Authentication Failed</h2>
            <p>Redirecting you back to login...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthCallback;

// Made with Bob
