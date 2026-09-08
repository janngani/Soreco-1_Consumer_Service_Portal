import { supabase } from "./supabase";

const API_BASE = "/api";

async function request(endpoint, options = {}) {
  let token = localStorage.getItem("auth_token");
  
  if (!token) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        token = data.session.access_token;
        localStorage.setItem("auth_token", token);
      }
    } catch {
      // ignore
    }
  }

  const getHeaders = (currToken) => ({
    "Content-Type": "application/json",
    ...(currToken ? { "Authorization": `Bearer ${currToken}` } : {}),
    ...options.headers
  });
  
  let response;
  let attempts = 0;
  const maxAttempts = 3;
  let retryDelay = 300;

  while (attempts < maxAttempts) {
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: getHeaders(token)
      });
      break;
    } catch (err) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Network connection error on ${endpoint}: ${err.message || 'Failed to fetch'}`);
      }
      await new Promise((r) => setTimeout(r, retryDelay));
      retryDelay *= 2;
    }
  }

  // If unauthorized, attempt a session refresh via Supabase once
  if (response.status === 401 && token && token !== "mock_admin_token") {
    try {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr && refreshData?.session?.access_token) {
        const newToken = refreshData.session.access_token;
        localStorage.setItem("auth_token", newToken);
        response = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers: getHeaders(newToken)
        });
      }
    } catch {
      // Refresh failed
    }
  }

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
      const textData = await response.text();
      if (textData) {
        try {
          const errorData = JSON.parse(textData);
          errorMsg = errorData.error || textData;
        } catch {
          errorMsg = textData;
        }
      }
    } catch {
    }

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth-expired", { detail: { error: errorMsg } }));
    }

    throw new Error(errorMsg);
  }
  return response.json();
}
export const api = {
  auth: {
    me: () => request("/auth/me"),
    completeOnboarding: (data) => request("/auth/complete-onboarding", { method: "POST", body: JSON.stringify(data) }),
    updateProfile: (data) => request("/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),
    sendOtp: (email) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),
    verifyOtp: (email, otp) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),
    resetPassword: (email, password, otp) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, password, otp }) }),
    login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    checkAccountNumber: (accountNumber, excludeUserId = "") => request(`/auth/check-account-number?accountNumber=${encodeURIComponent(accountNumber)}&excludeUserId=${encodeURIComponent(excludeUserId)}`),
    forgotPassword: (email) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) }),
    resendConfirmation: (email) => request("/auth/resend-confirmation", { method: "POST", body: JSON.stringify({ email }) })
  },
  tickets: {
    list: () => request("/tickets"),
    get: (id) => request(`/tickets/${id}`),
    create: (data) => request("/tickets", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => request(`/tickets/${id}`, { method: "DELETE" })
  },
  announcements: {
    list: () => request("/announcements"),
    create: (data) => request("/announcements", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    reorder: (items) => request("/announcements/reorder", { method: "POST", body: JSON.stringify({ items }) }),
    delete: (id) => request(`/announcements/${id}`, { method: "DELETE" })
  },
  public: {
    getRatings: () => request("/public/ratings")
  },
  settings: {
    get: (key) => request(`/settings/${key}`),
    set: (key, value) => request(`/settings/${key}`, { method: "POST", body: JSON.stringify({ value }) })
  },
  users: {
    list: () => request("/users"),
    create: (data) => request("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => request(`/users/${id}`, { method: "DELETE" })
  },
  backend: {
    status: () => request("/backend-status")
  },
  inquiries: {
    list: () => request("/inquiries"),
    listMy: () => request("/my-inquiries"),
    create: (data) => request("/inquiries", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) => request(`/inquiries/${id}`, { method: "PATCH", body: JSON.stringify(data) })
  }
};
