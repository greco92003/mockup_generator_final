"use client";

import { useState, useEffect } from "react";
import {
  FileUploader,
  FileUploaderContent,
  FileUploaderItem,
  FileInput,
} from "./extension/file-upload";
import { Paperclip } from "lucide-react";

interface FileUploaderProps {
  onFileChange: (file: File | null) => void;
  error?: boolean;
  disabled?: boolean;
}

const CustomFileUploader = ({
  onFileChange,
  error = false,
  disabled = false,
}: FileUploaderProps) => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Configure dropzone options
  const dropZoneConfig = {
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB max size
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
  };

  // Update parent component when files change
  useEffect(() => {
    if (files && files.length > 0) {
      onFileChange(files[0]);

      // Validate file type
      const file = files[0];
      const validTypes = ["image/png", "image/jpeg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setErrorMessage(
          "Formato de arquivo inválido. Use apenas JPG, PNG ou PDF."
        );
      } else {
        setErrorMessage(null);
      }
    } else {
      onFileChange(null);
    }
  }, [files, onFileChange]);

  return (
    <div className="w-full">
      <FileUploader
        value={files}
        onValueChange={setFiles}
        dropzoneOptions={dropZoneConfig}
        disabled={disabled}
        className="relative bg-background rounded-lg"
      >
        <FileInput
          className={`outline-dashed outline-1 ${
            error || errorMessage ? "outline-red-500" : "outline-gray-300"
          } hover:outline-blue-500 transition-colors`}
        >
          <div className="flex items-center justify-center flex-col pt-4 pb-4 w-full">
            <svg
              className="w-8 h-8 mb-3 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-1 text-sm text-gray-700">
              <span className="font-semibold">
                Clique ou arraste aqui seu arquivo
              </span>
            </p>
            <p className="text-xs text-gray-500">JPG, PNG ou PDF</p>
          </div>
        </FileInput>
        <FileUploaderContent>
          {files &&
            files.length > 0 &&
            files.map((file, i) => (
              <FileUploaderItem key={i} index={i}>
                <Paperclip className="h-4 w-4 stroke-current mr-2" />
                <span className="text-sm">{file.name}</span>
              </FileUploaderItem>
            ))}
        </FileUploaderContent>
      </FileUploader>
      {(error || errorMessage) && (
        <p className="text-red-500 text-sm mt-1">
          {errorMessage || "Por favor, selecione um arquivo."}
        </p>
      )}
    </div>
  );
};

export default CustomFileUploader;
