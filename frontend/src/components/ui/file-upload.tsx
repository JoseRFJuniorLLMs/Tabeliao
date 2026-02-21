"use client";

import * as React from "react";
import { Upload, X, File, Image as ImageIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface FileUploadFile {
  file: File;
  id: string;
  progress: number;
  preview?: string;
  error?: string;
}

export interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  value?: FileUploadFile[];
  onFilesChange?: (files: FileUploadFile[]) => void;
  onFilesAdded?: (files: File[]) => void;
  onFileRemove?: (fileId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      className,
      accept,
      maxSize = 10 * 1024 * 1024, // 10MB default
      maxFiles = 5,
      multiple = true,
      disabled = false,
      value,
      onFilesChange,
      onFilesAdded,
      onFileRemove,
      ...props
    },
    ref
  ) => {
    const [files, setFiles] = React.useState<FileUploadFile[]>(value || []);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (value !== undefined) {
        setFiles(value);
      }
    }, [value]);

    const updateFiles = React.useCallback(
      (newFiles: FileUploadFile[]) => {
        setFiles(newFiles);
        onFilesChange?.(newFiles);
      },
      [onFilesChange]
    );

    const validateFile = React.useCallback(
      (file: File): string | null => {
        if (maxSize && file.size > maxSize) {
          return `Arquivo excede o limite de ${formatFileSize(maxSize)}`;
        }
        if (accept) {
          const acceptedTypes = accept.split(",").map((t) => t.trim());
          const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
          const fileType = file.type;
          const isAccepted = acceptedTypes.some(
            (t) =>
              t === fileExt ||
              t === fileType ||
              (t.endsWith("/*") && fileType.startsWith(t.replace("/*", "/")))
          );
          if (!isAccepted) {
            return "Tipo de arquivo nao permitido";
          }
        }
        return null;
      },
      [accept, maxSize]
    );

    const addFiles = React.useCallback(
      (newRawFiles: File[]) => {
        const remainingSlots = maxFiles - files.length;
        const filesToAdd = newRawFiles.slice(0, remainingSlots);

        const newUploadFiles: FileUploadFile[] = filesToAdd.map((file) => {
          const error = validateFile(file);
          const isImage = file.type.startsWith("image/");
          let preview: string | undefined;
          if (isImage && !error) {
            preview = URL.createObjectURL(file);
          }
          return {
            file,
            id: generateId(),
            progress: error ? 0 : 100,
            preview,
            error: error || undefined,
          };
        });

        const updated = [...files, ...newUploadFiles];
        updateFiles(updated);
        onFilesAdded?.(filesToAdd);
      },
      [files, maxFiles, validateFile, updateFiles, onFilesAdded]
    );

    const removeFile = React.useCallback(
      (fileId: string) => {
        const fileToRemove = files.find((f) => f.id === fileId);
        if (fileToRemove?.preview) {
          URL.revokeObjectURL(fileToRemove.preview);
        }
        const updated = files.filter((f) => f.id !== fileId);
        updateFiles(updated);
        onFileRemove?.(fileId);
      },
      [files, updateFiles, onFileRemove]
    );

    const handleDragOver = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      },
      [disabled]
    );

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    }, []);

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles);
      },
      [disabled, addFiles]
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        addFiles(selectedFiles);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      },
      [addFiles]
    );

    const isImage = (file: File) => file.type.startsWith("image/");

    return (
      <div ref={ref} className={cn("w-full space-y-3", className)} {...props}>
        {/* Drop Zone */}
        <div
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "cursor-not-allowed opacity-50",
            files.length >= maxFiles && "pointer-events-none opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled || files.length >= maxFiles}
            onChange={handleInputChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Selecionar arquivos"
          />
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="mt-3 text-center">
            <p className="text-sm font-medium text-foreground">
              Arraste e solte arquivos aqui
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ou{" "}
              <span className="text-primary font-medium">
                clique para selecionar
              </span>
            </p>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {maxSize && <span>Max: {formatFileSize(maxSize)}</span>}
            {accept && <span>Tipos: {accept}</span>}
            {maxFiles && (
              <span>
                {files.length}/{maxFiles} arquivos
              </span>
            )}
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  uploadFile.error
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-border"
                )}
              >
                {/* Preview / Icon */}
                {uploadFile.preview ? (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                    {isImage(uploadFile.file) ? (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)}
                    </span>
                    {uploadFile.error && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {uploadFile.error}
                      </span>
                    )}
                  </div>
                  {uploadFile.progress > 0 &&
                    uploadFile.progress < 100 &&
                    !uploadFile.error && (
                      <Progress
                        value={uploadFile.progress}
                        className="mt-1.5 h-1"
                      />
                    )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeFile(uploadFile.id)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remover arquivo</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
FileUpload.displayName = "FileUpload";

export { FileUpload };
