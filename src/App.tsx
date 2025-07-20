import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Finance from './pages/Finance';
import Login from './pages/Login';


function App() {
    return(
        <>
            <BrowserRouter>
                <Routes> 
                    <Route path="/" element={<Login />} />
                    <Route path="/finance" element={<Finance />} />
                    {/* Add more routes as needed */}
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;