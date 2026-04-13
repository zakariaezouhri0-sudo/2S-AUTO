import React, { useState } from "react";
import { auth, googleProvider, signInWithPopup } from "@/src/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Wrench, Mail, Lock, LogIn, UserPlus, AlertCircle } from "lucide-react";

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // @ts-ignore - get access token for Google Drive
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem("google_drive_token", token);
      }
    } catch (err: any) {
      setError(err.message || "Erreur Google Sign-In");
    }
  };

  return (
    <div className="min-h-screen bg-garage-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-garage-accent text-white mb-4 shadow-xl">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-garage-accent">2S AUTO</h1>
          <p className="text-sm text-garage-muted mt-2 uppercase tracking-widest font-bold">
            Système de Gestion de Garage
          </p>
        </div>

        <div className="technical-card p-8 space-y-6">
          <div className="flex border-b border-garage-border">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 pb-4 text-xs font-bold uppercase tracking-widest transition-all ${
                isLogin ? "border-b-2 border-garage-accent text-garage-accent" : "text-garage-muted"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 pb-4 text-xs font-bold uppercase tracking-widest transition-all ${
                !isLogin ? "border-b-2 border-garage-accent text-garage-accent" : "text-garage-muted"
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-garage-muted">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-garage-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-garage-bg/50 border border-garage-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-garage-muted">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-garage-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-garage-bg/50 border border-garage-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-600 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-garage-accent text-white py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  S'inscrire
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-garage-border"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="px-2 bg-white text-garage-muted">Ou continuer avec</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full border border-garage-border py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-garage-bg transition-all"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Gmail / Google
          </button>
        </div>
      </div>
    </div>
  );
}
