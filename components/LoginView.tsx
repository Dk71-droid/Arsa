import React, { useState } from 'react';
import type { AuthError } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { BookOpenIcon, MailIcon, LockIcon } from './icons';
import { Loader } from './Loader';

export const LoginView: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { signIn, signUp, loading: authLoading } = useAuth();

    const handleFirebaseError = (err: any) => {
        const authError = err as AuthError;
        switch (authError.code) {
            case 'auth/user-not-found':
                return 'Tidak ada pengguna yang ditemukan dengan email ini.';
            case 'auth/wrong-password':
                return 'Kata sandi salah. Silakan coba lagi.';
            case 'auth/email-already-in-use':
                return 'Email ini sudah terdaftar. Silakan masuk.';
            case 'auth/weak-password':
                return 'Kata sandi harus terdiri dari setidaknya 6 karakter.';
            case 'auth/invalid-email':
                return 'Format email tidak valid.';
            default:
                console.error(authError);
                return 'Terjadi kesalahan. Silakan coba lagi.';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Email dan kata sandi tidak boleh kosong.");
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
        } catch (err) {
            setError(handleFirebaseError(err));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (authLoading) {
        return <div className="h-screen flex items-center justify-center"><Loader text="Memverifikasi sesi..." /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <BookOpenIcon className="mx-auto h-16 w-16 text-teal-500" />
                    <h1 className="mt-4 text-3xl font-bold text-slate-800">Arsa</h1>
                    <p className="mt-2 text-slate-600">Alat bantu cerdas untuk merancang pembelajaran.</p>
                </div>
                
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-center text-slate-700">{isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}</h2>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Alamat Email</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MailIcon className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-md border-slate-300 pl-10 focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5"
                                    placeholder="anda@email.com"
                                />
                            </div>
                        </div>

                        <div>
                            {/* FIX: Corrected typo from `cldivassName` to `className` */}
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">Kata Sandi</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <LockIcon className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete={isLogin ? "current-password" : "new-password"}
                                    required
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-md border-slate-300 pl-10 focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2.5"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        
                        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400"
                            >
                                {isSubmitting ? <Loader text="" /> : (isLogin ? 'Masuk' : 'Daftar')}
                            </button>
                        </div>
                    </form>
                </div>
                 <div className="mt-6 text-center">
                    <p className="text-sm text-slate-600">
                        {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                        <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-medium text-teal-600 hover:text-teal-500 ml-1">
                            {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
                        </button>
                    </p>
                </div>
            </div>
             <p className="mt-8 text-xs text-slate-400">Versi 2.2</p>
        </div>
    );
};