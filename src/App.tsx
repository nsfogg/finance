import { HashRouter, Routes, Route } from 'react-router-dom'
import Finance from './pages/Finance';
import Login from './pages/Login';
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';


function App() {
    const [session, setSession] = useState<any>(null);

    const fetchSession = async () => {
        const currentSession = await supabase.auth.getSession();
        console.log("Current session:", currentSession.data);
        setSession(currentSession.data.session);
    }

    useEffect(() => {
        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        // Cleanup the auth listener on component unmount
        // This prevents memory leaks and ensures the listener is removed when the component is unmounted
        return () => {
            authListener.subscription.unsubscribe();
        }
    }, [])
    return(
        <>
            {session ? (
                <HashRouter>
                    <Routes> 
                        <Route path="/" element={<Finance />} />
                        {/* Add more routes as needed */}
                    </Routes>
                </HashRouter>
            ) : (
                <Login />
            )}

        </>
    );
}

export default App;