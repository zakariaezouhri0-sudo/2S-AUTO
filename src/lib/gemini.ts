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
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    Vous êtes un Assistant Expert en Extraction de Données pour le garage "2S AUTO".
    Votre tâche est d'analyser les images des "Cartes Grises" marocaines.
    
    RÈGLES :
    1. Extrayez les informations du véhicule et reformatez l'immatriculation.
    2. Convertissez les lettres arabes en équivalents latins :
       - "أ" -> "A"
       - "ب" -> "B"
       - "د" -> "D"
       - "هـ" -> "H"
       - "و" -> "W"
       - "ز" -> "Z"
       - "ط" -> "T"
       - "ج" -> "J"
       - "س" -> "S"
       - "ق" -> "Q"
       - "م" -> "M"
       - "ر" -> "R"
       - "ش" -> "CH"
       - "ف" -> "F"
       - "ك" -> "K"
       - "ل" -> "L"
       - "ن" -> "N"
       - "ي" -> "Y"
    3. FORMAT D'IMMATRICULATION : Utilisez des espaces pour séparer les chiffres et la lettre.
       Exemple : "56818-ب-72" doit être formaté comme "56818 B 72".
    4. Générez "dossier_id" en supprimant tous les espaces de l'immatriculation formatée (ex: "56818B72").
    5. "garage" doit toujours être "2S AUTO".
    6. "status" doit être "Prêt pour l'archivage".
    7. "attachments_count" doit être le nombre d'images fournies.
    8. Ne faites PAS d'analyse de dommages ou de description visuelle.
    9. Si une information est manquante, utilisez une chaîne vide.
    10. Répondez strictement en format JSON.
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
    throw new Error("No response from Gemini");
  }

  return JSON.parse(response.text);
}
