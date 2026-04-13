import { ExtractionResult } from "@/src/lib/gemini";
import { CheckCircle2, Car, FileImage, Check, Plus, Loader2, Trash2, Download, CheckSquare, Square, Camera, Cloud } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

interface ResultCardProps {
  data: ExtractionResult & { id?: string };
  photos: { id: string; url: string }[];
  onAddPhotos?: (newImages: string[]) => Promise<void>;
  onDeletePhoto?: (photoId: string) => Promise<void>;
  onTakePhoto?: () => void;
  onSaveToDrive?: () => void;
}

export function ResultCard({ data, photos, onAddPhotos, onDeletePhoto, onTakePhoto, onSaveToDrive }: ResultCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map(p => p.id));
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSelected = () => {
    selectedIds.forEach((id, idx) => {
      const photo = photos.find(p => p.id === id);
      if (photo) {
        downloadImage(photo.url, `carte-grise-${data.dossier_id}-${idx + 1}.png`);
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (!onDeletePhoto) return;
    if (window.confirm(`Voulez-vous supprimer les ${selectedIds.length} photos sélectionnées ?`)) {
      for (const id of selectedIds) {
        await onDeletePhoto(id);
      }
      setSelectedIds([]);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!onAddPhotos) return;
    setIsAdding(true);
    try {
      const newImages = await Promise.all(
        acceptedFiles.map(async (file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
        })
      );
      await onAddPhotos(newImages);
    } catch (err) {
      console.error("Error adding photos:", err);
      alert("Erreur lors de l'ajout des photos");
    } finally {
      setIsAdding(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    multiple: true,
  } as any);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold uppercase tracking-wider text-sm">
            {data.status}
          </span>
        </div>
        <div className="text-xs font-mono text-garage-muted">
          DOSSIER ID: {data.dossier_id}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicle Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="technical-card">
            <div className="px-4 py-3 border-b border-garage-border bg-garage-bg/50 flex items-center gap-2">
              <Car className="w-4 h-4 text-garage-muted" />
              <h3 className="text-xs font-bold uppercase tracking-widest">
                Informations du Véhicule
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataField
                  label="Immatriculation (Formatée)"
                  value={data.vehicule.immatriculation_formatee}
                  highlight
                />
                <DataField label="Nom du Propriétaire" value={data.client.nom_complet} highlight />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Marque" value={data.vehicule.marque} />
                <DataField label="Modèle" value={data.vehicule.modele} />
                <DataField label="Carburant" value={data.vehicule.carburant} />
                <DataField label="Date Mise Circ." value={data.vehicule.date_mise_circulation} />
              </div>
              <DataField label="N° de Châssis (VIN)" value={data.vehicule.vin} mono />
            </div>
          </div>

          {/* Photos Section */}
          <div className="technical-card">
            <div className="px-4 py-3 border-b border-garage-border bg-garage-bg/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-garage-muted" />
                <h3 className="text-xs font-bold uppercase tracking-widest">
                  Documents Joints
                </h3>
              </div>
              
              {photos.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-[10px] font-bold uppercase tracking-widest text-garage-muted hover:text-garage-accent flex items-center gap-1.5 transition-colors"
                  >
                    {selectedIds.length === photos.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {selectedIds.length === photos.length ? "Désélectionner" : "Tout Sélectionner"}
                  </button>
                  
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 border-l border-garage-border pl-3 animate-in fade-in slide-in-from-right-2">
                      <button
                        onClick={handleDownloadSelected}
                        className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Télécharger ({selectedIds.length})
                      </button>
                      <button
                        onClick={handleDeleteSelected}
                        className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((photo, idx) => {
                const isSelected = selectedIds.includes(photo.id);
                return (
                  <div 
                    key={photo.id} 
                    className={cn(
                      "aspect-[3/2] rounded-lg overflow-hidden border bg-garage-bg group relative transition-all",
                      isSelected ? "border-garage-accent ring-2 ring-garage-accent/20" : "border-garage-border"
                    )}
                  >
                    <img
                      src={photo.url}
                      alt={`Carte Grise ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Selection Overlay */}
                    <div 
                      onClick={() => toggleSelect(photo.id)}
                      className={cn(
                        "absolute top-3 left-3 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-all border shadow-sm",
                        isSelected ? "bg-garage-accent border-garage-accent text-white" : "bg-white/80 border-white text-transparent hover:text-garage-muted"
                      )}
                    >
                      <Check className="w-4 h-4" />
                    </div>

                    {/* Actions Overlay */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(photo.url, `carte-grise-${data.dossier_id}-${idx + 1}.png`);
                        }}
                        className="w-8 h-8 rounded-lg bg-white/90 text-garage-accent shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {onDeletePhoto && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Supprimer cette photo ?")) {
                              onDeletePhoto(photo.id);
                            }
                          }}
                          className="w-8 h-8 rounded-lg bg-white/90 text-red-600 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-white text-[10px] font-bold uppercase tracking-widest">
                        {isSelected ? "Sélectionné" : "Cliquer pour sélectionner"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {onAddPhotos && (
                <div
                  {...getRootProps()}
                  className={cn(
                    "aspect-[3/2] rounded-lg border-2 border-dashed border-garage-border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-garage-accent hover:bg-garage-bg/50",
                    isDragActive && "border-garage-accent bg-garage-bg",
                    isAdding && "opacity-50 cursor-wait"
                  )}
                >
                  <input {...getInputProps()} />
                  {isAdding ? (
                    <Loader2 className="w-6 h-6 animate-spin text-garage-muted" />
                  ) : (
                    <>
                      <Plus className="w-6 h-6 text-garage-muted" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-garage-muted">
                        Ajouter des photos
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="space-y-6">
          <div className="technical-card p-4 bg-garage-accent text-white">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-4">
              Statut de l'Archive
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs opacity-60">ID Dossier</span>
                <span className="text-xs font-mono">{data.dossier_id}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs opacity-60">Pièces Jointes</span>
                <span className="text-xs font-mono">{data.attachments_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-60">Vérifié</span>
                <Check className="w-4 h-4 text-green-400" />
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <button
                onClick={onSaveToDrive}
                className="w-full bg-white text-garage-accent py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-white/90 transition-all shadow-lg"
              >
                <Cloud className="w-4 h-4" />
                Sauvegarder sur Drive
              </button>
              
              <button
                onClick={onTakePhoto}
                className="w-full bg-black/20 text-white border border-white/20 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-black/30 transition-all"
              >
                <Camera className="w-4 h-4" />
                Prendre une Photo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({
  label,
  value,
  highlight,
  mono,
  className,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-[10px] font-bold uppercase tracking-wider text-garage-muted">
        {label}
      </label>
      <div
        className={cn(
          "mono-value",
          highlight && "text-lg font-bold text-garage-accent",
          mono && "font-mono tracking-tighter",
          !highlight && !mono && "text-sm font-medium"
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}
