"use client";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";

type Section = {
  title: string;
  rows: number | null;
  images: string[];
  isEditing: boolean;
};

export default function Home() {
  const [screen, setScreen] = useState<"home" | "editor">("home");
  const [sections, setSections] = useState<Section[]>([]);
  const [topsterImage, setTopsterImage] = useState<string>("");
  const [roomImage, setRoomImage] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");

  const captureRef = useRef<HTMLDivElement>(null);

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: "",
        rows: null,
        images: [],
        isEditing: true,
      },
    ]);
  };

  const removeSection = (sectionIndex: number) => {
    setSections(sections.filter((_, index) => index !== sectionIndex));
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].title = title;
    setSections(newSections);
  };

  const updateSectionRows = (sectionIndex: number, newRows: number) => {
    const newSections = [...sections];
    const oldImages = newSections[sectionIndex].images;
    const newSize = newRows * 4;

    newSections[sectionIndex].rows = newRows;
    newSections[sectionIndex].images = Array.from(
      { length: newSize },
      (_, i) => oldImages[i] || ""
    );
    newSections[sectionIndex].isEditing = false;

    setSections(newSections);
  };

  const handleUpload = (
    sectionIndex: number,
    imageIndex: number,
    file: File
  ) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, sx, sy, size, size, 0, 0, 500, 500);

        const croppedImage = canvas.toDataURL("image/jpeg", 0.95);

        const newSections = [...sections];
        newSections[sectionIndex].images[imageIndex] = croppedImage;
        setSections(newSections);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleCapture = async () => {
    if (!captureRef.current) return;

    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(captureRef.current, {
      backgroundColor: roomImage ? null : "#000",
      useCORS: true,
      scale: 2,
    });

    const image = canvas.toDataURL("image/png");
    setTopsterImage(image);
    return image;
  };

  const handleDecorate = async (imageData: string) => {
    const res = await fetch("/api/decorate", {
      method: "POST",
      body: JSON.stringify({ image: imageData }),
    });

    const data = await res.json();
    setRoomImage(data.roomImage);
    setAnalysis(data.analysis);
  };

  const handleDownload = async () => {
    const image = await handleCapture();
    if (!image) return;

    const link = document.createElement("a");
    link.href = image;
    link.download = "my-topster-room-3x4.png";
    link.click();
  };

  const getTasteDescription = (text: string) => {
    const match = text.match(/TASTE DESCRIPTION:\s*([\s\S]*?)(?:ROOM PROMPT:|$)/);
    if (!match) return "";
    return match[1]
      .replace(/^- /gm, "")
      .trim();
  };

  const tasteDescription = getTasteDescription(analysis);

  if (screen === "home") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <h1 className="text-5xl font-bold mb-10 text-center">My Topster Room</h1>

        <button
          onClick={() => setScreen("editor")}
          className="border border-white px-8 py-4 text-xl font-semibold hover:bg-white hover:text-black transition"
        >
          make topster
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center py-10">
      <div className="w-full max-w-md flex justify-between items-center mb-8 px-2">
        <button
          onClick={() => setScreen("home")}
          className="border border-white px-4 py-2 text-sm hover:bg-white hover:text-black transition"
        >
          back
        </button>

        <h1 className="text-2xl font-bold">My Topster Room</h1>

        <button
          onClick={handleDownload}
          className="border border-white px-4 py-2 text-sm hover:bg-white hover:text-black transition"
        >
          save
        </button>
      </div>

      <div className="w-full max-w-md mb-6 px-2">
        <button
          onClick={addSection}
          className="w-full border border-white py-3 text-base font-semibold hover:bg-white hover:text-black transition"
        >
          + add section
        </button>
      </div>

      <div
        ref={captureRef}
        style={{
          width: "100%",
          maxWidth: "420px",
          aspectRatio: "3 / 4",
          padding: "20px",
          backgroundColor: roomImage ? "transparent" : "#000",
          backgroundImage: roomImage
            ? `linear-gradient(rgba(0,0,0,0.26), rgba(0,0,0,0.26)), url(${roomImage})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {sections.length === 0 && (
            <div
              style={{
                color: "#fff",
                opacity: 0.7,
                textAlign: "center",
                paddingTop: "80px",
              }}
            >
              add a section to start your topster
            </div>
          )}

          {sections.map((section, sectionIndex) => (
            <section key={sectionIndex} style={{ marginBottom: "14px" }}>
              {section.isEditing && (
                <div
                  style={{
                    marginBottom: "12px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    value={section.title}
                    onChange={(e) =>
                      updateSectionTitle(sectionIndex, e.target.value)
                    }
                    placeholder="category name"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      backgroundColor: "#fff",
                      color: "#000",
                      borderRadius: "4px",
                      border: "none",
                      height: "40px",
                    }}
                  />

                  <button
                    onClick={() => removeSection(sectionIndex)}
                    style={{
                      padding: "0 12px",
                      height: "40px",
                      borderRadius: "4px",
                      border: "1px solid white",
                      background: "transparent",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    delete
                  </button>
                </div>
              )}

              {section.isEditing &&
                section.title.trim() !== "" &&
                section.rows === null && (
                  <div style={{ marginBottom: "12px" }}>
                    <select
                      value=""
                      onChange={(e) =>
                        updateSectionRows(sectionIndex, Number(e.target.value))
                      }
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#fff",
                        color: "#000",
                        borderRadius: "4px",
                        border: "none",
                        height: "40px",
                      }}
                    >
                      <option value="" disabled>
                        select grid size
                      </option>
                      <option value={1}>4 x 1</option>
                      <option value={2}>4 x 2</option>
                      <option value={3}>4 x 3</option>
                      <option value={4}>4 x 4</option>
                    </select>
                  </div>
                )}

              {!section.isEditing &&
                section.title.trim() !== "" &&
                section.rows !== null && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      <h2
                        style={{
                          color: "red",
                          fontWeight: "bold",
                          margin: 0,
                          fontSize: "20px",
                        }}
                      >
                        {section.title}
                      </h2>

                      <button
                        onClick={() => removeSection(sectionIndex)}
                        style={{
                          width: "16px",
                          height: "16px",
                          backgroundColor: "#fff",
                          border: "none",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {Array.from({ length: section.rows * 4 }).map(
                        (_, imageIndex) => (
                          <label
                            key={imageIndex}
                            style={{
                              position: "relative",
                              width: "100%",
                              aspectRatio: "1 / 1",
                              backgroundColor: "#fff",
                              cursor: "pointer",
                              overflow: "hidden",
                              display: "block",
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUpload(sectionIndex, imageIndex, file);
                                }
                              }}
                            />

                            {section.images[imageIndex] && (
                              <img
                                src={section.images[imageIndex]}
                                alt=""
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  objectPosition: "center",
                                  display: "block",
                                }}
                              />
                            )}
                          </label>
                        )
                      )}
                    </div>
                  </>
                )}
            </section>
          ))}
        </div>
      </div>

      <button
        onClick={async () => {
          const image = await handleCapture();
          if (image) await handleDecorate(image);
        }}
        className="w-full max-w-md mt-10 border border-white py-4 text-xl font-semibold hover:bg-white hover:text-black transition"
      >
        decorate my room
      </button>

      {tasteDescription && (
        <div className="w-full max-w-md mt-6 px-4 text-center leading-7 text-neutral-200">
          {tasteDescription}
        </div>
      )}

      {topsterImage && (
        <div className="w-full max-w-md mt-6">
          <p className="mb-2 text-center">preview</p>
          <img src={topsterImage} alt="topster preview" className="w-full" />
        </div>
      )}
    </main>
  );
}