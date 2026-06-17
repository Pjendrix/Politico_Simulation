import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { LogIn, LogOut, Cloud, CloudOff, RefreshCw } from 'lucide-react';

interface UserAuthBarProps {
  onUserChanged: (user: User | null) => void;
  syncStatus: "synced" | "syncing" | "offline" | "error" | "none";
  cloudErrorDetails?: string | null;
}

export default function UserAuthBar({ onUserChanged, syncStatus, cloudErrorDetails }: UserAuthBarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      onUserChanged(u);
      setLoading(false);
    });
    return unsubscribe;
  }, [onUserChanged]);

  // Detekuje konkrétně chybu "missing initial state" / storage problémy,
  // které jsou typické pro Safari ITP a storage-partitioned prostředí.
  const isStorageRelatedAuthError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes("missing initial state") ||
      msg.includes("web-storage-unsupported") ||
      msg.includes("sessionstorage")
    );
  };

  const attemptSignIn = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await attemptSignIn();
    } catch (error) {
      console.error("Authentication failed: ", error);

      if (isStorageRelatedAuthError(error)) {
        // Z dostupných veřejných reportů k této chybě vyplývá, že je často
        // tranzientní a druhý pokus uspěje (storage se mezitím stihne
        // korektně inicializovat). Zkusíme to tedy jednou automaticky znovu.
        setIsRetrying(true);
        try {
          await new Promise((resolve) => setTimeout(resolve, 800));
          await attemptSignIn();
          setIsRetrying(false);
          return;
        } catch (retryError) {
          console.error("Authentication retry also failed: ", retryError);
          setIsRetrying(false);
          setLoginError(
            "Přihlášení se nezdařilo. Pokud používáte Safari na iPhonu, zkuste prosím v Nastavení Safari dočasně vypnout volbu 'Bránit přeshraničnímu sledování' (Prevent Cross-Site Tracking), nebo nepoužívat anonymní režim."
          );
          return;
        }
      }
      setLoginError("Přihlášení se nezdařilo. Zkuste to prosím znovu.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed: ", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-400 font-sans">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
        <span className="hidden md:inline">Načítání cloudu...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 border-l border-slate-200 pl-3">
      {user ? (
        <div className="flex items-center space-x-3">
          {/* Cloud Sync Status */}
          <div className="flex items-center space-x-1" title="Stav synchronizace s cloudem">
            {syncStatus === 'synced' && (
              <span className="flex items-center space-x-1 text-[10px] text-emerald-600 font-sans font-medium">
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden lg:inline">Cloud aktivní</span>
              </span>
            )}
            {syncStatus === 'syncing' && (
              <span className="flex items-center space-x-1 text-[10px] text-sky-600 font-sans font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                <span className="hidden lg:inline">Ukládání...</span>
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="flex items-center space-x-1 text-[10px] text-amber-600 font-sans font-medium">
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden lg:inline">Offline</span>
              </span>
            )}
            {syncStatus === 'error' && (
              <span 
                className="flex items-center space-x-1 text-[10px] text-rose-600 font-sans font-medium cursor-help"
                title={cloudErrorDetails ? `Chyba cloudu: ${cloudErrorDetails}` : "Chyba synchronizace – najeďte myší pro detaily nebo zkuste znovu"}
              >
                <CloudOff className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden lg:inline">Chyba</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || ''}
                className="w-6 h-6 rounded-full border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-250 flex items-center justify-center text-xs font-bold text-slate-655 border border-slate-350">
                {user.displayName ? user.displayName[0].toUpperCase() : 'P'}
              </div>
            )}
            <span className="hidden sm:inline text-xs font-medium text-slate-705 max-w-[100px] truncate">
              {user.displayName || 'Politik'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-xs text-rose-600 hover:text-rose-750 font-sans hover:bg-rose-50 py-1 px-2 rounded-lg transition-colors cursor-pointer"
            title="Odhlásit se z cloudu"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Odhlásit</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-end space-y-1">
          <button
            onClick={handleLogin}
            disabled={isRetrying}
            className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-blue-700 hover:bg-slate-50 py-1 px-2.5 rounded-lg border border-slate-200 transition-colors bg-white font-sans font-bold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-500" />
            <span>{isRetrying ? "Zkouším znovu..." : "Přihlásit přes Google"}</span>
          </button>
          {loginError && (
            <span className="text-[10px] text-rose-600 font-sans max-w-[220px] text-right leading-tight">
              {loginError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
