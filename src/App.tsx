import { HashRouter, Routes, Route } from 'react-router-dom'
import Finance from './pages/Finance';
import Login from './pages/Login';


function App() {
    return(
        <>
            <HashRouter>
                <Routes> 
                    <Route path="/" element={<Login />} />
                    <Route path="/finance" element={<Finance />} />
                    {/* Add more routes as needed */}
                </Routes>
            </HashRouter>
        </>
    );
}

export default App;