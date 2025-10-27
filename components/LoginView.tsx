import React, { useState } from 'react';
import type { AuthError } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { BookOpenIcon, MailIcon, LockIcon } from './icons';
import { Loader } from './Loader';

const DecorativeElement: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <svg width="100%" height="100%" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute -bottom-40 -left-40 w-auto h-[150%] text-white opacity-10">
            <path d="M-100 800L700 0" stroke="currentColor" strokeWidth="2"/>
            <path d="M-50 800L750 0" stroke="currentColor" strokeWidth="1"/>
            <path d="M0 800L800 0" stroke="currentColor" strokeWidth="2"/>
            <path d="M-150 600L650 -200" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="250" cy="400" r="200" stroke="currentColor" strokeWidth="2"/>
            <circle cx="250" cy="400" r="250" stroke="currentColor" strokeWidth="1"/>
        </svg>
    </div>
);


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
        <div className="min-h-screen flex flex-col md:flex-row bg-white">
            {/* --- Branding Column (Left) --- */}
            <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-gradient-to-br from-indigo-600 to-violet-600 relative items-center justify-center p-12 text-white overflow-hidden">
                 <DecorativeElement />
                 <div className="relative z-10">
                     <div className="flex items-center gap-4">
                         <BookOpenIcon className="h-12 w-12" />
                         <div>
                             <h1 className="text-5xl font-bold tracking-tight">Arsa</h1>
                             <p className="mt-1 text-lg opacity-90">Asisten Cerdas Pendidik</p>
                         </div>
                     </div>
                     <p className="mt-10 text-xl max-w-md leading-relaxed opacity-90">
                         Platform cerdas untuk pendidik modern. Rancang, nilai, dan analisis pembelajaran dengan lebih mudah.
                     </p>
                 </div>
            </div>

            {/* --- Form Column (Right) --- */}
            <div className="w-full md:w-1/2 lg:w-3/5 flex flex-col items-center justify-center bg-slate-50 p-6 sm:p-12">
                <div className="w-full max-w-lg">
                    {/* Mobile Header */}
                    <div className="text-center mb-8 md:hidden">
                        <BookOpenIcon className="mx-auto h-20 w-20 text-indigo-500" />
                        <h1 className="mt-4 text-3xl font-bold text-slate-800">Arsa</h1>
                    </div>
                    
                    {/* Form Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg w-full">
                        <h2 className="text-3xl font-bold text-center text-slate-800 mb-8">{isLogin ? 'Masuk' : 'Daftar'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Alamat Email</label>
                                <div className="mt-1 relative rounded-lg shadow-sm">
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
                                        className="block w-full rounded-lg border-slate-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                                        placeholder="anda@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Kata Sandi</label>
                                <div className="mt-1 relative rounded-lg shadow-sm">
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
                                        className="block w-full rounded-lg border-slate-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            
                            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}

                            <div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-wait transition-all transform hover:-translate-y-0.5"
                                >
                                    {isSubmitting ? 'Memproses...' : (isLogin ? 'Masuk' : 'Daftar')}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Toggle Link */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-600">
                            {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
                            <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="font-semibold text-indigo-600 hover:text-indigo-500 ml-1">
                                {isLogin ? 'Daftar di sini' : 'Masuk di sini'}
                            </button>
                        </p>
                    </div>
                    
                    {/* Version */}
                    <p className="mt-10 text-center text-xs text-slate-400">Versi 2.2</p>
                </div>
            </div>
        </div>
    );
};