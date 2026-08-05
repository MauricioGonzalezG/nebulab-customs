import React, { createContext, useContext, useState, useEffect } from 'react';
import { tursoService, CustomerUser } from '../lib/turso';

interface AdminUser {
  email: string;
  role: string;
}

interface AuthContextType {
  // Admin auth
  isAuthenticated: boolean;
  adminUser: AdminUser | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isCheckingAuth: boolean;

  // Customer auth
  customerUser: CustomerUser | null;
  isCustomerAuthenticated: boolean;
  registerCustomer: (name: string, email: string, pass: string) => Promise<CustomerUser>;
  loginCustomer: (email: string, pass: string) => Promise<boolean>;
  logoutCustomer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_AUTH_KEY = 'nebulab_admin_session_v1';
const CUSTOMER_AUTH_KEY = 'nebulab_customer_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    // Check saved admin session
    const savedAdmin = localStorage.getItem(ADMIN_AUTH_KEY);
    if (savedAdmin) {
      try {
        const parsed = JSON.parse(savedAdmin);
        if (parsed && parsed.email && parsed.role === 'admin') {
          setAdminUser(parsed);
          setIsAuthenticated(true);
        }
      } catch (e) {
        localStorage.removeItem(ADMIN_AUTH_KEY);
      }
    }

    // Check saved customer session
    const savedCustomer = localStorage.getItem(CUSTOMER_AUTH_KEY);
    if (savedCustomer) {
      try {
        const parsed = JSON.parse(savedCustomer);
        if (parsed && parsed.email) {
          setCustomerUser(parsed);
        }
      } catch (e) {
        localStorage.removeItem(CUSTOMER_AUTH_KEY);
      }
    }

    setIsCheckingAuth(false);

    // Initialize database in background
    tursoService.initDatabase().catch((err) => console.error('Init DB error:', err));
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const isValid = await tursoService.authenticateAdmin(email, pass);
    if (isValid) {
      const user = { email: email.trim().toLowerCase(), role: 'admin' };
      setAdminUser(user);
      setIsAuthenticated(true);
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setAdminUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem(ADMIN_AUTH_KEY);
  };

  const registerCustomer = async (name: string, email: string, pass: string): Promise<CustomerUser> => {
    const customer = await tursoService.registerCustomer(name, email, pass);
    setCustomerUser(customer);
    localStorage.setItem(CUSTOMER_AUTH_KEY, JSON.stringify(customer));
    return customer;
  };

  const loginCustomer = async (email: string, pass: string): Promise<boolean> => {
    const customer = await tursoService.authenticateCustomer(email, pass);
    if (customer) {
      setCustomerUser(customer);
      localStorage.setItem(CUSTOMER_AUTH_KEY, JSON.stringify(customer));
      return true;
    }
    return false;
  };

  const logoutCustomer = () => {
    setCustomerUser(null);
    localStorage.removeItem(CUSTOMER_AUTH_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        adminUser,
        login,
        logout,
        isCheckingAuth,
        customerUser,
        isCustomerAuthenticated: !!customerUser,
        registerCustomer,
        loginCustomer,
        logoutCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
