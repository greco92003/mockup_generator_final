import { useState, FormEvent } from "react";
import "./App.css";
import CustomFileUploader from "./components/FileUploader";

function App() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (newFile: File | null) => {
    setFile(newFile);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError("Por favor, selecione um arquivo de logo");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("phone", formData.phone);
      formDataToSend.append("logo", file);

      const response = await fetch("http://localhost:3000/api/mockup", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error("Failed to generate mockup");
      }

      const data = await response.json();
      setPreview(data.image);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Mockup Generator</h1>
      <p className="description">
        Upload your logo (PDF, PNG, or JPG) and we'll generate a mockup for you.
        If you upload a PDF, we'll convert it to PNG automatically.
      </p>

      <div className="content">
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="logo">Logo</label>
            <CustomFileUploader
              onFileChange={handleFileChange}
              error={error !== null && error.includes("logo")}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Generating..." : "Generate Mockup"}
          </button>

          {error && <div className="error-message">{error}</div>}
        </form>

        {preview && (
          <div className="preview">
            <h2>Your Mockup</h2>
            <img src={preview} alt="Generated mockup" />
            <a href={preview} download="mockup.png" className="download-btn">
              Download Mockup
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
