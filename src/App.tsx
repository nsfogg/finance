import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Finance from './pages/Finance';
import Login from './pages/Login';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Connect from './pages/Connect';
import Goals from './pages/Goals';


function App() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchSession = async () => {
        const currentSession = await supabase.auth.getSession();
        console.log("Current session:", currentSession.data);
        setSession(currentSession.data.session);
    }

    useEffect(() => {
        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        // Cleanup the auth listener on component unmount
        // This prevents memory leaks and ensures the listener is removed when the component is unmounted
        return () => {
            authListener.subscription.unsubscribe();
        }
    }, [])

    // Show loading while checking session
    if (loading) {
        console.log("Loading session...");
        return <div>Loading...</div>;
    }

    return(
        <>
            <HashRouter>
                <Routes>
                    {session ? (
                        <>
                            <Route path="/" element={<Finance />} />
                            <Route path="/connect" element={<Connect />} />
                            <Route path="/goals" element={<Goals />} />
                        </>
                    ) : (
                        <>
                            <Route path="/login" element={<Login />} />
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </>
                    )}
                </Routes>
            </HashRouter>
        </>
    );
}

export default App;