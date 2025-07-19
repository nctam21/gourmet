import React, { useState } from 'react';
import axios from 'axios';

interface LoginFormProps {
    apiUrl: string;
    setMessage: (msg: string) => void;
    onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ apiUrl, setMessage, onSuccess }) => {
    const [form, setForm] = useState({ emailOrPhone: '', password: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            const payload = form.emailOrPhone.includes('@')
                ? { email: form.emailOrPhone, password: form.password }
                : { phone: form.emailOrPhone, password: form.password };
            await axios.post(`${apiUrl}/login`, payload);
            setMessage('Login successful!');
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setMessage(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Email or Phone</label>
                <input
                    type="text"
                    name="emailOrPhone"
                    value={form.emailOrPhone}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Password</label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                />
            </div>
            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-full font-bold shadow-md text-lg transition">Login</button>
        </form>
    );
};

export default LoginForm; 