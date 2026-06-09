import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { UserRole } from './types';

import AdminDashboard from './screens/AdminDashboard';
import EmployeeDashboard from './screens/EmployeeDashboard';
import ClientForm from './screens/ClientForm';
import AuthScreen from './screens/AuthScreen';

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
          // Check employees table first
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('role')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
            
          if (employeeData && !employeeError) {
            setUserRole(employeeData.role as UserRole);
          } else {
            // Fallback to legacy users table
            const { data: userData, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('uid', session.user.id)
              .maybeSingle();

            if (userData) {
              setUserRole(userData.role as UserRole);
            } else {
              // Create default user doc if not exists
              const email = session.user.email || '';
              let defaultRole: UserRole = 'employee'; // Default to employee
              if (email.includes('principal')) defaultRole = 'principal';
              else if (email.includes('hr')) defaultRole = 'hr_manager';
              else if (email.includes('support') || email.includes('it')) defaultRole = 'it_support';

              await supabase
                .from('users')
                .insert({
                  uid: session.user.id,
                  email: email,
                  role: defaultRole
                });
              
              setUserRole(defaultRole);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('hr_manager'); // Fallback
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    }
  }, []);

  if (isAuthenticated === null || (isAuthenticated && userRole === null)) {
    return <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-blue-600 font-bold">جاري التحميل...</div>;
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
