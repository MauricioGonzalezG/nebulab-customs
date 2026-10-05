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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    // Clear legacy browser-side identities, which were user-editable and included customer passwords.
    localStorage.removeItem('nebulab_admin_session_v1');
    localStorage.removeItem('nebulab_customer_session_v1');
    localStorage.removeItem('nebulab_litho_customers_v1');
    tursoService.getSession()
      .then((session) => {
        if (!active) return;
        setAdminUser(session.adminUser);
        setIsAuthenticated(session.adminUser?.role === 'admin');
        setCustomerUser(session.customerUser);
      })
      .catch((err) => console.error('No se pudo verificar la sesión del servidor:', err))
      .finally(() => {
        if (active) setIsCheckingAuth(false);
      });
    return () => { active = false; };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const isValid = await tursoService.authenticateAdmin(email, pass);
    if (isValid) {
      const user = { email: email.trim().toLowerCase(), role: 'admin' };
      setCustomerUser(null);
      setAdminUser(user);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setAdminUser(null);
    setIsAuthenticated(false);
    setCustomerUser(null);
    void tursoService.logout();
  };

  const registerCustomer = async (name: string, email: string, pass: string): Promise<CustomerUser> => {
    const customer = await tursoService.registerCustomer(name, email, pass);
    setAdminUser(null);
    setIsAuthenticated(false);
    setCustomerUser(customer);
    return customer;
  };

  const loginCustomer = async (email: string, pass: string): Promise<boolean> => {
    const customer = await tursoService.authenticateCustomer(email, pass);
    if (customer) {
      setAdminUser(null);
      setIsAuthenticated(false);
      setCustomerUser(customer);
      return true;
    }
    return false;
  };

  const logoutCustomer = () => {
    setAdminUser(null);
    setIsAuthenticated(false);
    setCustomerUser(null);
    void tursoService.logout();
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
