import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface DropzoneProps {
  files: File[];
  setFiles: (files: File[]) => void;
  maxFiles?: number;
}

export function Dropzone({ files, setFiles, maxFiles = 2 }: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles([...files, ...acceptedFiles].slice(0, maxFiles));
    },
    [files, setFiles, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles,
    multiple: maxFiles > 1,
  } as any);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
          isDragActive
            ? "border-garage-accent bg-garage-accent/5"
            : "border-garage-border hover:border-garage-muted bg-white",
          files.length >= maxFiles && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-full bg-garage-bg flex items-center justify-center">
          <Upload className="w-6 h-6 text-garage-muted" />
        </div>
        <div className="text-center">
          <p className="font-medium text-garage-accent">
            {isDragActive ? "Déposez les images ici" : "Téléchargez les images de la Carte Grise"}
          </p>
          <p className="text-sm text-garage-muted">
            Recto et Verso (Max {maxFiles} images)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative technical-card p-3 flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded bg-garage-bg flex items-center justify-center flex-shrink-0">
                <FileImage className="w-5 h-5 text-garage-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-garage-muted">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
