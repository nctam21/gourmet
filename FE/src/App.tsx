import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import AuthTabs from './components/AuthTabs';
import { useState } from 'react';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/user';

function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-green-50 font-sans">
            <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center border border-green-100">
                <AuthTabs isLogin={isLogin} setIsLogin={setIsLogin} />
                {message && <div className="mb-4 text-center text-green-600 w-full font-semibold">{message}</div>}
                {isLogin ? (
                    <LoginForm apiUrl={apiUrl} setMessage={setMessage} onSuccess={() => navigate('/main')} />
                ) : (
                    <RegisterForm apiUrl={apiUrl} setMessage={setMessage} setIsLogin={setIsLogin} onSuccess={() => navigate('/main')} />
                )}
            </div>
        </div>
    );
}

function MainScreen() {
    const navigate = useNavigate();
    const handleLogout = () => {
        // Xoá thông tin đăng nhập nếu có (localStorage, v.v.)
        navigate('/');
    };
    return (
        <div className="min-h-screen flex flex-col bg-green-100">
            <header className="w-full bg-green-600 text-white py-4 px-8 flex items-center justify-between shadow-md">
                <h1 className="text-2xl font-bold">Gourmet App</h1>
                <button
                    onClick={handleLogout}
                    className="bg-white text-green-700 font-semibold px-4 py-2 rounded-full shadow hover:bg-green-50 transition border border-green-200"
                >
                    Đăng xuất
                </button>
            </header>
            <main className="flex flex-1 items-center justify-center">
                <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col items-center border border-green-200">
                    <h2 className="text-3xl font-bold text-green-700 mb-4">Welcome to the Main Screen!</h2>
                    <p className="text-lg text-green-800">You have successfully logged in or registered.</p>
                </div>
            </main>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AuthScreen />} />
                <Route path="/main" element={<MainScreen />} />
            </Routes>
        </Router>
    );
}

export default App; 