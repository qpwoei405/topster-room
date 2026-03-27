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
        canvas.width = 2000;
        canvas.height = 2667;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(img, sx, sy, size, size, 0, 0, 500, 500);

        const croppedImage = canvas.toDataURL("image/png");

        const newSections = [...sections];
        newSections[sectionIndex].images[imageIndex] = croppedImage;
        setSections(newSections);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleCapture = async () => {
    const element = captureRef.current;
    if (!captureRef.current) return;

    element.style.width = "1200px";

    await new Promise((resolve) => setTimeout(resolve, 200));

    const canvas = await html2canvas(element, {
      backgroundColor: roomImage ? null : "#000",
      useCORS: true,
      scale: 3,
    });

    element.style.width = "1200px";

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

  const handleCapture = async () => {
    const element = captureRef.current;
    if (!element) return;

    // 🔥 원래 스타일 저장
    const prev = {
      width: element.style.width,
      maxWidth: element.style.maxWidth,
    };

    // 🔥 캡처용으로 크게 (핵심)
    element.style.width = "1400px";
    element.style.maxWidth = "1400px";

    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(element, {
      backgroundColor: roomImage ? null : "#000",
      useCORS: true,
      scale: 2, // 여기 2~3 추천
    });

    // 🔥 원상복구
    element.style.width = prev.width;
    element.style.maxWidth = prev.maxWidth;

    // 🔥 고품질 PNG
    const image = canvas.toDataURL("image/png", 1.0);
    setTopsterImage(image);
    return image;
  };

  const handleDownload = async () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 기본 3:4
    let WIDTH = 1536;
    let HEIGHT = 2048;

    let bg: HTMLImageElement | null = null;

    // 룸이미지 먼저 로드
    if (roomImage) {
      bg = new Image();
      bg.crossOrigin = "anonymous";
      bg.src = roomImage;

      await new Promise<void>((resolve, reject) => {
        bg!.onload = () => resolve();
        bg!.onerror = reject;
      });

      // 배경 원본 기준으로 3:4 맞추기
      const portraitWidthFromBg = Math.round((bg.height * 3) / 4);
      const portraitHeightFromBg = Math.round((bg.width * 4) / 3);

      if (bg.width / bg.height > 3 / 4) {
        // 배경이 더 넓으면 높이 기준
        HEIGHT = bg.height;
        WIDTH = portraitWidthFromBg;
      } else {
        // 배경이 더 세로면 너비 기준
        WIDTH = bg.width;
        HEIGHT = portraitHeightFromBg;
      }
    }

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // 검정 배경
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 룸이미지 cover 크롭
    if (bg) {
      const imgRatio = bg.width / bg.height;
      const canvasRatio = WIDTH / HEIGHT;

      let sx = 0;
      let sy = 0;
      let sWidth = bg.width;
      let sHeight = bg.height;

      if (imgRatio > canvasRatio) {
        sWidth = bg.height * canvasRatio;
        sx = (bg.width - sWidth) / 2;
      } else {
        sHeight = bg.width / canvasRatio;
        sy = (bg.height - sHeight) / 2;
      }

      ctx.drawImage(
        bg,
        sx,
        sy,
        sWidth,
        sHeight,
        0,
        0,
        WIDTH,
        HEIGHT
      );

      ctx.fillStyle = "rgba(0,0,0,0.26)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const padding = Math.round(WIDTH * 0.04);
    const gap = Math.round(WIDTH * 0.013);
    const titleGap = Math.round(WIDTH * 0.012);
    const sectionGap = Math.round(WIDTH * 0.022);

    let y = padding;
    const gridWidth = WIDTH - padding * 2;
    const cellSize = (gridWidth - gap * 3) / 4;

    ctx.textBaseline = "top";

    for (const section of sections) {
      if (!section.title.trim() || !section.rows) continue;

      ctx.fillStyle = "red";
      ctx.font = `bold ${Math.round(WIDTH * 0.05)}px Arial`;
      ctx.fillText(section.title, padding, y);
      y += Math.round(WIDTH * 0.06) + titleGap;

      const total = section.rows * 4;

      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / 4);
        const col = i % 4;

        const x = padding + col * (cellSize + gap);
        const boxY = y + row * (cellSize + gap);

        ctx.fillStyle = "white";
        ctx.fillRect(x, boxY, cellSize, cellSize);

        const src = section.images[i];
        if (src) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = src;

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const size = Math.min(img.width, img.height);
              const sx = (img.width - size) / 2;
              const sy = (img.height - size) / 2;

              ctx.drawImage(
                img,
                sx,
                sy,
                size,
                size,
                x,
                boxY,
                cellSize,
                cellSize
              );
              resolve();
            };
            img.onerror = reject;
          });
        }
      }

      y += section.rows * cellSize + (section.rows - 1) * gap + sectionGap;
    }

    const image = canvas.toDataURL("image/png");
    setTopsterImage(image);

    const link = document.createElement("a");
    link.href = image;
    link.download = "my-topster-room-3x4.png";
    link.click();
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
        ref={captureRef} id="capture_area"
        style={{
          width: "100%",
          maxWidth: "520px",
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