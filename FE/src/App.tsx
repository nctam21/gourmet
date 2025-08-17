import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import AuthTabs from './components/AuthTabs';
import HeaderBar from './components/HeaderBar';
import HomePage from './pages/HomePage';
import FoodManagement from './pages/FoodManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
console.log('API URL:', apiUrl); // Debug log

// Component riêng để sử dụng useNavigate
function AuthScreenContent() {
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSuccess = () => {
        console.log('Login/Register successful, navigating to /main'); // Debug log
        navigate('/main');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-blue-50 font-sans">
            <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center border border-gray-200">
                <AuthTabs isLogin={isLogin} setIsLogin={setIsLogin} />
                {message && <div className="mb-4 text-center text-blue-600 w-full font-semibold">{message}</div>}
                {isLogin ? (
                    <LoginForm apiUrl={apiUrl} setMessage={setMessage} onSuccess={handleSuccess} />
                ) : (
                    <RegisterForm apiUrl={apiUrl} setMessage={setMessage} setIsLogin={setIsLogin} onSuccess={handleSuccess} />
                )}
            </div>
        </div>
    );
}

const MainScreen: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <HeaderBar />
            <HomePage />
        </div>
    );
};

const AdminScreen: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <HeaderBar />
            <FoodManagement />
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<AuthScreenContent />} />
                        <Route path="/main" element={<MainScreen />} />
                        <Route path="/admin" element={<AdminScreen />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App; 