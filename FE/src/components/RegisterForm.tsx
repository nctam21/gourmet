import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface RegisterFormProps {
    apiUrl: string;
    setMessage: (msg: string) => void;
    setIsLogin: (val: boolean) => void;
    onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ apiUrl, setMessage, setIsLogin, onSuccess }) => {
    if (!apiUrl) {
        throw new Error('Missing apiUrl prop in RegisterForm');
    }
    const { login } = useAuth();
    const [form, setForm] = useState({
        name: '',
        age: '',
        region: '',
        gender: '',
        phone: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/register`, form);
            setMessage('Register successful! Please login.');
            if (res.data && res.data.token) {
                login(res.data, res.data.token);
            }
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setMessage(err.response?.data?.message || 'Register failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Age</label>
                <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                    placeholder="Age"
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Gender</label>
                <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                >
                    <option value="" disabled selected>Select gender</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                </select>
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Region <span className="text-red-500">*</span></label>
                <select
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                    required
                >
                    <option value="" disabled selected>Select region</option>
                    <option value="Trung du và miền núi phía Bắc">Trung du và miền núi phía Bắc</option>
                    <option value="Đồng Bằng Sông Hồng">Đồng Bằng Sông Hồng</option>
                    <option value="Bắc Trung Bộ">Bắc Trung Bộ</option>
                    <option value="Duyên Hải Nam Trung Bộ">Duyên Hải Nam Trung Bộ</option>
                    <option value="Tây Nguyên">Tây Nguyên</option>
                    <option value="Đông Nam Bộ">Đông Nam Bộ</option>
                    <option value="Đồng Bằng Sông Cửu Long">Đồng Bằng Sông Cửu Long</option>
                </select>
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                    required
                />
            </div>
            <div className="mb-6">
                <label className="block mb-2 text-base font-medium text-gray-700">Password <span className="text-red-500">*</span></label>
                <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full border border-gray-200 px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-gray-50"
                    required
                    minLength={6}
                />
            </div>
            <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-full font-bold shadow-md text-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
            >
                {loading ? 'Registering...' : 'Register'}
            </button>
        </form>
    );
};

export default RegisterForm; 