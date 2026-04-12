import React, { useState, useEffect } from "react";
import { Wrench, Loader2, AlertCircle, RefreshCcw, History, Plus, LogOut, User as UserIcon } from "lucide-react";
import { Dropzone } from "./components/Dropzone";
import { ResultCard } from "./components/ResultCard";
import { HistoryPage } from "./components/HistoryPage";
import { LoginPage } from "./components/LoginPage";
import { extractCarteGriseData, ExtractionResult } from "./lib/gemini";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy,
  updateDoc,
  arrayUnion 
} from "./lib/firebase";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { User } from "firebase/auth";

type View = "extract" | "history" | "result";
type EntryMode = "ai" | "manual";
type PhotoItem = { id: string; url: string };
type HistoryItem = ExtractionResult & { id: string; timestamp: number };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<View>("extract");
  const [entryMode, setEntryMode] = useState<EntryMode>("ai");
  const [files, setFiles] = useState<File[]>([]);
  const [manualData, setManualData] = useState({
    immatriculation: "",
    nom_complet: "",
    marque: "",
    modele: "",
    vin: "",
    carburant: "",
    date_mise_circulation: ""
  });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Load history from Firestore
  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setHistory([]);
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "dossiers"),
        where("owner_uid", "==", user.uid),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const items: HistoryItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as HistoryItem);
      });
      setHistory(items);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  const handleProcess = async () => {
    if (files.length === 0 || !user) return;

    setIsProcessing(true);
    setError(null);

    try {
      const images = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          return {
            data: base64.split(",")[1],
            mimeType: file.type,
            fullData: base64 // Keep full data for UI display
          };
        })
      );

      // Store base64 for immediate UI display (temporary IDs for preview)
      setPhotos(images.map((img, idx) => ({ id: `temp-${idx}`, url: img.fullData })));

      const data = await extractCarteGriseData(images);
      
      // Save metadata to Firestore
      const dossierData = {
        ...data,
        owner_uid: user.uid,
        timestamp: Date.now(),
      };
      // Remove image_urls from main document to avoid size limit
      delete (dossierData as any).image_urls;

      const docRef = await addDoc(collection(db, "dossiers"), dossierData);
      
      // Save photos to subcollection (each photo gets its own 1MB limit)
      const photosCollection = collection(db, "dossiers", docRef.id, "photos");
      const photoDocs = await Promise.all(images.map(img => 
        addDoc(photosCollection, {
          url: img.fullData,
          owner_uid: user.uid,
          timestamp: Date.now()
        })
      ));
      
      setPhotos(photoDocs.map((doc, idx) => ({ id: doc.id, url: images[idx].fullData })));
      setResult({ ...data, id: docRef.id } as any);
      fetchHistory();
      setView("result");
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(`Échec de l'extraction: ${err.message || "Veuillez vous assurer que les images sont claires."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // 1. Delete photos from subcollection
      const photosSnapshot = await getDocs(collection(db, "dossiers", id, "photos"));
      const deletePromises = photosSnapshot.docs.map(photoDoc => deleteDoc(photoDoc.ref));
      await Promise.all(deletePromises);

      // 2. Delete the main dossier document
      await deleteDoc(doc(db, "dossiers", id));
      
      setHistory(history.filter(item => item.id !== id));
      if (result && (result as any).id === id) {
        reset();
      }
    } catch (err) {
      console.error("Error deleting dossier:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleAddPhotos = async (newImages: string[]) => {
    if (!result || !user || !(result as any).id) return;

    try {
      const dossierId = (result as any).id;
      const photosCollection = collection(db, "dossiers", dossierId, "photos");
      
      // Add each new photo to subcollection
      const newPhotoDocs = await Promise.all(newImages.map(img => 
        addDoc(photosCollection, {
          url: img,
          owner_uid: user.uid,
          timestamp: Date.now()
        })
      ));

      const dossierRef = doc(db, "dossiers", dossierId);
      await updateDoc(dossierRef, {
        attachments_count: (result.attachments_count || 0) + newImages.length
      });

      // Update local state
      const newPhotos = newPhotoDocs.map((doc, idx) => ({ id: doc.id, url: newImages[idx] }));
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      
      const updatedResult = {
        ...result,
        attachments_count: (result.attachments_count || 0) + newImages.length
      };
      setResult(updatedResult);
      
      // Update history list
      setHistory(history.map(item => 
        item.id === dossierId ? { ...item, ...updatedResult } : item
      ));
    } catch (err) {
      console.error("Error updating photos:", err);
      alert("Erreur lors de la mise à jour des photos");
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!result || !user || !(result as any).id) return;
    
    try {
      const dossierId = (result as any).id;
      await deleteDoc(doc(db, "dossiers", dossierId, "photos", photoId));
      
      const updatedPhotos = photos.filter(p => p.id !== photoId);
      setPhotos(updatedPhotos);
      
      const dossierRef = doc(db, "dossiers", dossierId);
      await updateDoc(dossierRef, {
        attachments_count: Math.max(0, (result.attachments_count || 0) - 1)
      });
      
      const updatedResult = {
        ...result,
        attachments_count: Math.max(0, (result.attachments_count || 0) - 1)
      };
      setResult(updatedResult);
      
      setHistory(history.map(item => 
        item.id === dossierId ? { ...item, ...updatedResult } : item
      ));
    } catch (err) {
      console.error("Error deleting photo:", err);
      alert("Erreur lors de la suppression de la photo");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !manualData.immatriculation || !manualData.nom_complet) return;

    setIsProcessing(true);
    setError(null);

    try {
      const dossier_id = `MAN-${Date.now().toString().slice(-6)}`;
      const data: ExtractionResult = {
        garage: "2S AUTO",
        dossier_id,
        vehicule: {
          immatriculation_originale: manualData.immatriculation,
          immatriculation_formatee: manualData.immatriculation,
          marque: manualData.marque,
          modele: manualData.modele,
          carburant: manualData.carburant,
          vin: manualData.vin,
          date_mise_circulation: manualData.date_mise_circulation
        },
        client: {
          nom_complet: manualData.nom_complet
        },
        status: "Vérifié",
        attachments_count: 0
      };

      const dossierData = {
        ...data,
        owner_uid: user.uid,
        timestamp: Date.now(),
      };

      const docRef = await addDoc(collection(db, "dossiers"), dossierData);
      
      setResult({ ...data, id: docRef.id } as any);
      fetchHistory();
      setView("result");
    } catch (err) {
      console.error("Manual entry error:", err);
      setError("Échec de l'enregistrement manuel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPhotos([]);
    setResult(null);
    setError(null);
    setView("extract");
    setEntryMode("ai");
    setManualData({
      immatriculation: "",
      nom_complet: "",
      marque: "",
      modele: "",
      vin: "",
      carburant: "",
      date_mise_circulation: ""
    });
  };

  const viewHistoryItem = async (item: any) => {
    setResult(item);
    setIsProcessing(true);
    try {
      // Fetch photos from subcollection when viewing a dossier
      const photosSnapshot = await getDocs(collection(db, "dossiers", item.id, "photos"));
      const photosData = photosSnapshot.docs
        .sort((a, b) => (a.data().timestamp || 0) - (b.data().timestamp || 0))
        .map(doc => ({ id: doc.id, url: doc.data().url }));
      setPhotos(photosData);
    } catch (err) {
      console.error("Error fetching photos:", err);
      setPhotos([]);
    } finally {
      setIsProcessing(false);
    }
    setView("result");
  };

  const handleLogout = () => signOut(auth);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-garage-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-garage-accent" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-garage-accent text-white py-6 px-4 sm:px-8 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
              <Wrench className="w-6 h-6 text-garage-accent" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none">
                2S AUTO
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-60">
                Système de Gestion de Garage
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Utilisateur</p>
                <p className="text-xs truncate max-w-[150px]">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8">
        <div className="mb-8 flex items-center justify-center sm:justify-start">
          <nav className="flex items-center bg-garage-bg border border-garage-border rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setView("extract")}
              className={cn(
                "px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                view === "extract" || view === "result" ? "bg-garage-accent text-white shadow-md" : "text-garage-muted hover:text-garage-accent"
              )}
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </button>
            <button
              onClick={() => setView("history")}
              className={cn(
                "px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                view === "history" ? "bg-garage-accent text-white shadow-md" : "text-garage-muted hover:text-garage-accent"
              )}
            >
              <History className="w-4 h-4" />
              Historique
            </button>
          </nav>
        </div>

        <AnimatePresence mode="wait">
          {view === "extract" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Nouvelle Entrée d'Archive</h2>
                  <p className="text-garage-muted text-sm max-w-2xl">
                    {entryMode === "ai" 
                      ? "Téléchargez le Recto et le Verso de la Carte Grise marocaine. Notre IA extraira automatiquement les détails."
                      : "Saisissez manuellement les informations du véhicule et du client pour créer un nouveau dossier."}
                  </p>
                </div>
                
                <div className="flex bg-garage-bg border border-garage-border rounded-lg p-1 self-start sm:self-auto">
                  <button
                    onClick={() => setEntryMode("ai")}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                      entryMode === "ai" ? "bg-white text-garage-accent shadow-sm" : "text-garage-muted hover:text-garage-accent"
                    )}
                  >
                    IA Extraction
                  </button>
                  <button
                    onClick={() => setEntryMode("manual")}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                      entryMode === "manual" ? "bg-white text-garage-accent shadow-sm" : "text-garage-muted hover:text-garage-accent"
                    )}
                  >
                    Manuel
                  </button>
                </div>
              </div>

              {entryMode === "ai" ? (
                <>
                  <Dropzone files={files} setFiles={setFiles} />

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleProcess}
                      disabled={files.length === 0 || isProcessing}
                      className="bg-garage-accent text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Traitement...
                        </>
                      ) : (
                        "Extraire les Données"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleManualSubmit} className="technical-card p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">Immatriculation *</label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: 12345 A 67"
                        value={manualData.immatriculation}
                        onChange={(e) => setManualData({ ...manualData, immatriculation: e.target.value })}
                        className="w-full px-4 py-2.5 bg-garage-bg border border-garage-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-garage-accent/5 font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">Nom du Propriétaire *</label>
                      <input
                        required
                        type="text"
                        placeholder="Nom complet"
                        value={manualData.nom_complet}
                        onChange={(e) => setManualData({ ...manualData, nom_complet: e.target.value })}
                        className="w-full px-4 py-2.5 bg-garage-bg border border-garage-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">Marque</label>
                      <input
                        type="text"
                        value={manualData.marque}
                        onChange={(e) => setManualData({ ...manualData, marque: e.target.value })}
                        className="w-full px-3 py-2 bg-garage-bg border border-garage-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">Modèle</label>
                      <input
                        type="text"
                        value={manualData.modele}
                        onChange={(e) => setManualData({ ...manualData, modele: e.target.value })}
                        className="w-full px-3 py-2 bg-garage-bg border border-garage-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">Carburant</label>
                      <input
                        type="text"
                        value={manualData.carburant}
                        onChange={(e) => setManualData({ ...manualData, carburant: e.target.value })}
                        className="w-full px-3 py-2 bg-garage-bg border border-garage-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">Date Mise Circ.</label>
                      <input
                        type="text"
                        placeholder="JJ/MM/AAAA"
                        value={manualData.date_mise_circulation}
                        onChange={(e) => setManualData({ ...manualData, date_mise_circulation: e.target.value })}
                        className="w-full px-3 py-2 bg-garage-bg border border-garage-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-garage-accent/5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">N° de Châssis (VIN)</label>
                    <input
                      type="text"
                      value={manualData.vin}
                      onChange={(e) => setManualData({ ...manualData, vin: e.target.value })}
                      className="w-full px-4 py-2.5 bg-garage-bg border border-garage-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-garage-accent/5 font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="bg-garage-accent text-white px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center gap-2 disabled:opacity-50 hover:bg-black transition-all shadow-lg active:scale-95"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        "Créer le Dossier"
                      )}
                    </button>
                  </div>
                </form>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </motion.div>
          )}

          {view === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Données Extraites</h2>
                <button
                  onClick={reset}
                  className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-garage-muted hover:text-garage-accent transition-colors"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Nouvelle Entrée
                </button>
              </div>

              <ResultCard 
                data={result} 
                photos={photos} 
                onAddPhotos={handleAddPhotos}
                onDeletePhoto={handleDeletePhoto}
              />
            </motion.div>
          )}

          {view === "history" && (
            <HistoryPage 
              history={history} 
              onSelect={viewHistoryItem} 
              onDelete={handleDelete}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="py-8 px-4 border-t border-garage-border mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-garage-muted">
            © 2026 Système de Garage 2S AUTO
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-garage-muted">
                Système en Ligne
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-garage-muted">
              Extraction Sécurisée
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      // Resize image to max 1600px to avoid payload issues and improve speed
      try {
        const resized = await resizeImage(base64, 1600);
        resolve(resized);
      } catch (e) {
        resolve(base64); // Fallback to original if resize fails
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

async function resizeImage(base64: string, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context not available");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
  });
}

