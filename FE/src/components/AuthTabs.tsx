import React from 'react';

interface AuthTabsProps {
    isLogin: boolean;
    setIsLogin: (val: boolean) => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({ isLogin, setIsLogin }) => (
    <div className="flex justify-center mb-8 w-full">
        <button
            className={`px-6 py-2 mr-2 rounded-full font-semibold transition-colors duration-200 shadow border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 text-lg ${isLogin ? 'bg-gray-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setIsLogin(true)}
        >
            Login
        </button>
        <button
            className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 shadow border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 text-lg ${!isLogin ? 'bg-gray-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => setIsLogin(false)}
        >
            Register
        </button>
    </div>
);

export default AuthTabs; 