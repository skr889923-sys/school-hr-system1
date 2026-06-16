import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { UserRole } from './types';

import AdminDashboard from './screens/AdminDashboard';
import EmployeeDashboard from './screens/EmployeeDashboard';
import ClientForm from './screens/ClientForm';
import AuthScreen from './screens/AuthScreen';

const ROLE_VALUES: UserRole[] = ['principal', 'hr_manager', 'it_support', 'employee', 'unassigned', 'system'];

function normalizeRole(role: unknown): UserRole {
  return ROLE_VALUES.includes(role as UserRole) ? role as UserRole : 'employee';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();

    async function handleSession(session: any) {
      if (session?.user) {
        setIsAuthenticated(true);
        try {
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
            
          if (employeeData && !employeeError) {
            if ('active' in employeeData && employeeData.active === false) {
              await supabase.auth.signOut();
              setIsAuthenticated(false);
              setUserRole(null);
              return;
            }

            if ('last_login_at' in employeeData) {
              await supabase
                .from('employees')
                .update({ last_login_at: new Date().toISOString() })
                .eq('auth_user_id', session.user.id);
            }
            setUserRole(normalizeRole(employeeData.role));
          } else {
            const { data: userData, error: fetchError } = await supabase
              .from('users')
              .select('role')
              .eq('uid', session.user.id)
              .maybeSingle();

            if (userData && !fetchError) {
              setUserRole(normalizeRole(userData.role));
            } else {
              await supabase
                .from('users')
                .insert({
                  uid: session.user.id,
                  email: session.user.email || '',
                  role: 'employee'
                });
              
              setUserRole('employee');
            }
          }
        } catch (error) {
          setUserRole('employee');
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    }
  }, []);

  if (isAuthenticated === null || (isAuthenticated && userRole === null)) {
    return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-slate-700 font-bold">جاري تحميل الصلاحيات...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? (
            userRole === 'employee' ? <Navigate to="/dashboard" /> : <Navigate to="/admin" />
          ) : <Navigate to="/login" />
        } />
        <Route path="/login" element={
          isAuthenticated ? (
            userRole === 'employee' ? <Navigate to="/dashboard" /> : <Navigate to="/admin" />
          ) : <AuthScreen />
        } />
        <Route path="/admin" element={
          isAuthenticated && userRole !== 'employee' ? <AdminDashboard userRole={userRole!} /> : <Navigate to="/" />
        } />
        <Route path="/dashboard" element={
          isAuthenticated && userRole === 'employee' ? <EmployeeDashboard /> : <Navigate to="/" />
        } />
        <Route path="/request/:id" element={<ClientForm />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
