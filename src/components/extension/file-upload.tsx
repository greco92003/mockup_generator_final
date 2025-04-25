"use client";

import * as React from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { cn } from "../../lib/utils";

// Context for the FileUploader component
interface FileUploaderContextProps {
  files: File[] | null;
  setFiles: React.Dispatch<React.SetStateAction<File[] | null>>;
  onDrop: (acceptedFiles: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const FileUploaderContext = React.createContext<FileUploaderContextProps | null>(
  null
);

// Hook to use the FileUploader context
export const useFileUploader = () => {
  const context = React.useContext(FileUploaderContext);
  if (!context) {
    throw new Error(
      "useFileUploader must be used within a FileUploaderProvider"
    );
  }
  return context;
};

// Main FileUploader component
interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  value: File[] | null;
  onValueChange: React.Dispatch<React.SetStateAction<File[] | null>>;
  dropzoneOptions?: DropzoneOptions;
  disabled?: boolean;
}

export const FileUploader = React.forwardRef<HTMLDivElement, FileUploaderProps>(
  (
    {
      value,
      onValueChange,
      dropzoneOptions,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Handle file drop
    const onDrop = React.useCallback(
      (acceptedFiles: File[]) => {
        if (disabled) return;
        
        if (dropzoneOptions?.maxFiles === 1) {
          onValueChange(acceptedFiles);
        } else {
          onValueChange((prevFiles) => {
            if (!prevFiles) return acceptedFiles;
            return [...prevFiles, ...acceptedFiles];
          });
        }
      },
      [onValueChange, dropzoneOptions, disabled]
    );

    // Handle file removal
    const onRemove = React.useCallback(
      (index: number) => {
        if (disabled) return;
        
        onValueChange((prevFiles) => {
          if (!prevFiles) return null;
          return prevFiles.filter((_, i) => i !== index);
        });
      },
      [onValueChange, disabled]
    );

    return (
      <FileUploaderContext.Provider
        value={{
          files: value,
          setFiles: onValueChange,
          onDrop,
          onRemove,
          disabled,
        }}
      >
        <div ref={ref} className={cn("", className)} {...props}>
          {children}
        </div>
      </FileUploaderContext.Provider>
    );
  }
);

FileUploader.displayName = "FileUploader";

// FileInput component for the dropzone
interface FileInputProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const FileInput = React.forwardRef<HTMLDivElement, FileInputProps>(
  ({ className, children, ...props }, ref) => {
    const { onDrop, disabled } = useFileUploader();
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      disabled,
    });

    return (
      <div
        {...getRootProps()}
        ref={ref}
        className={cn(
          "relative cursor-pointer rounded-lg border border-dashed border-gray-300 transition-colors",
          isDragActive && "border-primary/50 bg-primary/5",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
        {...props}
      >
        <input {...getInputProps()} />
        {children}
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

// FileUploaderContent component for displaying content
interface FileUploaderContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const FileUploaderContent = React.forwardRef<
  HTMLDivElement,
  FileUploaderContentProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("mt-2 flex flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
});

FileUploaderContent.displayName = "FileUploaderContent";

// FileUploaderItem component for displaying individual files
interface FileUploaderItemProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
}

export const FileUploaderItem = React.forwardRef<
  HTMLDivElement,
  FileUploaderItemProps
>(({ className, index, children, ...props }, ref) => {
  const { onRemove, disabled } = useFileUploader();

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-background p-2",
        className
      )}
      {...props}
    >
      <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
      <button
        type="button"
        className="ml-auto shrink-0 rounded-md p-1 hover:bg-primary/5 disabled:opacity-50"
        onClick={() => onRemove(index)}
        disabled={disabled}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
        <span className="sr-only">Remove file</span>
      </button>
    </div>
  );
});

FileUploaderItem.displayName = "FileUploaderItem";
