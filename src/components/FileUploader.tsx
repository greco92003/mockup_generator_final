import { useState, useRef } from "react";
import "./FileUploader.css";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "application/pdf"];

    if (!validTypes.includes(file.type)) {
      setErrorMessage(
        "Formato de arquivo inválido. Use apenas JPG, PNG ou PDF."
      );
      setSelectedFile(null);
      onFileChange(null);
    } else {
      setSelectedFile(file);
      setErrorMessage(null);
      onFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="custom-file-uploader">
      <div
        className={`file-drop-area ${isDragging ? "dragging" : ""} ${
          error || errorMessage ? "error" : ""
        } ${disabled ? "disabled" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.pdf"
          disabled={disabled}
          className="file-input"
        />

        <div className="upload-icon">
          <svg
            width="32"
            height="32"
            viewBox="0 0 20 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="upload-text">
          <p className="primary-text">Clique ou arraste aqui seu arquivo</p>
          <p className="secondary-text">JPG, PNG ou PDF</p>
        </div>
      </div>

      {selectedFile && (
        <div className="selected-file">
          <span className="file-name">{selectedFile.name}</span>
          <button
            type="button"
            className="remove-file-btn"
            onClick={handleRemoveFile}
            disabled={disabled}
          >
            ✕
          </button>
        </div>
      )}

      {(error || errorMessage) && (
        <p className="error-text">
          {errorMessage || "Por favor, selecione um arquivo."}
        </p>
      )}
    </div>
  );
};

export default CustomFileUploader;
