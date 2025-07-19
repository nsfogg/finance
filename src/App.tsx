import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Finance from './pages/Finance';


function App() {
    return(
        <>
            <BrowserRouter>
                <Routes> 
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/finance" element={<Finance />} />
                    {/* Add more routes as needed */}
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;