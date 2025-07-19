import React, { useState } from 'react';
import axios from 'axios';

interface RegisterFormProps {
    apiUrl: string;
    setMessage: (msg: string) => void;
    setIsLogin: (val: boolean) => void;
    onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ apiUrl, setMessage, setIsLogin, onSuccess }) => {
    const [form, setForm] = useState({
        userName: '',
        dateOfBirth: '',
        address: '',
        phone: '',
        email: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            await axios.post(`${apiUrl}/register`, form);
            setMessage('Register successful! Please login.');
            if (onSuccess) onSuccess();
            // setIsLogin(true); // Không cần nữa nếu chuyển màn hình
        } catch (err: any) {
            setMessage(err.response?.data?.message || 'Register failed');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Name <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    name="userName"
                    value={form.userName}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Date of Birth</label>
                <input
                    type="date"
                    name="dateOfBirth"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    placeholder="YYYY-MM-DD"
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Address <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Phone <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Email <span className="text-red-500">*</span></label>
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-green-700">Password <span className="text-red-500">*</span></label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full border border-green-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition text-lg bg-green-50"
                    required
                    minLength={6}
                />
            </div>
            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-full font-bold shadow-md text-lg transition">Register</button>
        </form>
    );
};

export default RegisterForm; 