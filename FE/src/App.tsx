import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import AuthTabs from './components/AuthTabs';
import HeaderBar from './components/HeaderBar';
import HomePage from './pages/HomePage';
import { AuthProvider } from './context/AuthContext';

const apiUrl = process.env.REACT_APP_API_URL ?? '';
if (!apiUrl) {
    throw new Error('Missing REACT_APP_API_URL in .env file');
}

function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-white to-blue-50 font-sans">
            <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center border border-gray-200">
                <AuthTabs isLogin={isLogin} setIsLogin={setIsLogin} />
                {message && <div className="mb-4 text-center text-blue-600 w-full font-semibold">{message}</div>}
                {isLogin ? (
                    <LoginForm apiUrl={apiUrl} setMessage={setMessage} onSuccess={() => navigate('/')} />
                ) : (
                    <RegisterForm apiUrl={apiUrl} setMessage={setMessage} setIsLogin={setIsLogin} onSuccess={() => navigate('/')} />
                )}
            </div>
        </div>
    );
}

function MainScreen() {
    return (
        <>
            <HeaderBar />
            <HomePage />
        </>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/auth" element={<AuthScreen />} />
                    <Route path="/" element={<MainScreen />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App; 