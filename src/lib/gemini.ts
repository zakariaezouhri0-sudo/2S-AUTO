import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ExtractionResult {
  garage: string;
  dossier_id: string;
  vehicule: {
    immatriculation_originale: string;
    immatriculation_formatee: string;
    marque: string;
    modele: string;
    carburant: string;
    vin: string;
    date_mise_circulation: string;
  };
  client: {
    nom_complet: string;
  };
  status: string;
  attachments_count: number;
}

const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    garage: { type: Type.STRING },
    dossier_id: { type: Type.STRING },
    vehicule: {
      type: Type.OBJECT,
      properties: {
        immatriculation_originale: { type: Type.STRING },
        immatriculation_formatee: { type: Type.STRING },
        marque: { type: Type.STRING },
        modele: { type: Type.STRING },
        carburant: { type: Type.STRING },
        vin: { type: Type.STRING },
        date_mise_circulation: { type: Type.STRING },
      },
      required: ["immatriculation_originale", "immatriculation_formatee", "marque", "modele", "carburant", "vin", "date_mise_circulation"],
    },
    client: {
      type: Type.OBJECT,
      properties: {
        nom_complet: { type: Type.STRING },
      },
      required: ["nom_complet"],
    },
    status: { type: Type.STRING },
    attachments_count: { type: Type.NUMBER },
  },
  required: ["garage", "dossier_id", "vehicule", "client", "status", "attachments_count"],
};

export async function extractCarteGriseData(images: { data: string; mimeType: string }[]): Promise<ExtractionResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Clé API Gemini manquante. Veuillez configurer GEMINI_API_KEY dans les paramètres.");
  }

  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    Vous êtes un Assistant Expert en Extraction de Données pour le garage "2S AUTO".
    Votre tâche est d'analyser les images des "Cartes Grises" marocaines.
    
    RÈGLES :
    1. Extrayez les informations du véhicule et reformatez l'immatriculation.
    2. Convertissez les lettres arabes en équivalents latins (A, B, D, H, W, Z, T, J, S, Q, M, R, CH, F, K, L, N, Y).
    3. FORMAT D'IMMATRICULATION : Utilisez des espaces pour séparer les chiffres et la lettre. Exemple : "56818-ب-72" -> "56818 B 72".
    4. Générez "dossier_id" en supprimant tous les espaces de l'immatriculation formatée.
    5. "garage" doit toujours être "2S AUTO".
    6. "status" doit être "Prêt pour l'archivage".
    7. "attachments_count" doit être le nombre d'images fournies.
    8. Si l'image est illisible ou n'est pas une carte grise, essayez d'extraire ce que vous pouvez ou retournez des champs vides, mais NE PAS échouer silencieusement.
    9. Répondez strictement en format JSON valide selon le schéma fourni.
  `;

  const prompt = "Extrayez les données de ces images de Carte Grise marocaine selon les règles.";

  const contents = {
    parts: [
      ...images.map(img => ({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType
        }
      })),
      { text: prompt }
    ]
  };

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: extractionSchema,
    },
  });

  if (!response.text) {
    throw new Error("Aucune réponse reçue de l'IA.");
  }

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", response.text);
    throw new Error("Erreur lors de la lecture des données extraites.");
  }
}
