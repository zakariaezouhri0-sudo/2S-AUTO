import { ExtractionResult } from "@/src/lib/gemini";
import React, { useState } from "react";
import { Search, Calendar, Car, User, ArrowRight, Trash2 } from "lucide-react";

interface HistoryPageProps {
  history: (ExtractionResult & { id: string; timestamp: number })[];
  onSelect: (item: ExtractionResult) => void;
  onDelete: (id: string) => void;
}

export function HistoryPage({ history, onSelect, onDelete }: HistoryPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const confirmDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
    setConfirmDeleteId(null);
  };

  const filteredHistory = history.filter(
    (item) =>
      item.vehicule.immatriculation_formatee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client.nom_complet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dossier_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Historique d'Archive</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-garage-muted" />
          <input
            type="text"
            placeholder="Rechercher par plaque ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-garage-border rounded-lg text-sm w-full sm:w-[300px] focus:outline-none focus:ring-2 focus:ring-garage-accent/5 transition-all"
          />
        </div>
      </div>

      <div className="technical-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-garage-bg/50 border-b border-garage-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-garage-muted">
                  Date
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-garage-muted">
                  Immatriculation
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-garage-muted">
                  Nom du Client
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-garage-muted">
                  Véhicule
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-garage-muted">
                  ID Dossier
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-garage-border">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-garage-bg/30 transition-colors cursor-pointer group"
                    onClick={() => onSelect(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-garage-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs font-mono">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-sm bg-garage-accent text-white px-2 py-0.5 rounded">
                        {item.vehicule.immatriculation_formatee}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-garage-accent">
                        <User className="w-3.5 h-3.5 opacity-40" />
                        <span className="text-sm font-semibold truncate max-w-[200px]">
                          {item.client.nom_complet}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-garage-muted" />
                        <span className="text-xs font-medium">
                          {item.vehicule.marque} {item.vehicule.modele}
                        </span>
                      </div>
                      <div className="text-[10px] text-garage-muted font-mono mt-1">
                        {item.vehicule.carburant}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono text-garage-muted">
                        {item.dossier_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <button
                              onClick={(e) => confirmDelete(e, item.id)}
                              className="text-[10px] font-bold uppercase tracking-widest bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="text-[10px] font-bold uppercase tracking-widest bg-garage-bg text-garage-muted px-2 py-1 rounded hover:bg-garage-border transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleDeleteClick(e, item.id)}
                              className="p-2 text-garage-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-all sm:opacity-0 group-hover:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ArrowRight className="w-4 h-4 text-garage-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-garage-muted italic text-sm">
                    Aucun enregistrement trouvé dans l'archive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
