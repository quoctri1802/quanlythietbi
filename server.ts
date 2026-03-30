import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: AI Predict
  app.post("/api/ai/predict", async (req, res) => {
    const { logs, deviceName } = req.body;
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "Logs are required" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `
        Dựa trên lịch sử bảo trì của thiết bị y tế "${deviceName}" sau đây, hãy phân tích rủi ro hư hỏng:
        ${JSON.stringify(logs)}

        Hãy trả về kết quả dưới định dạng JSON với các trường sau:
        - risk_percentage: (số từ 0-100)
        - prediction_7_days: (dự đoán tình trạng trong 7 ngày tới)
        - suggestions: (danh sách các gợi ý bảo trì)
        - language: Vietnamese
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const analysis = JSON.parse(result.text);
      res.json(analysis);
    } catch (error) {
      console.error("AI Prediction Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API: Telegram Alert
  app.post("/api/alert", async (req, res) => {
    const { message } = req.body;
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.warn("Telegram config missing");
      return res.status(200).json({ status: "skipped", reason: "config_missing" });
    }

    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      });
      res.json({ status: "ok" });
    } catch (error) {
      console.error("Telegram Alert Error:", error);
      res.status(500).json({ error: "Failed to send alert" });
    }
  });

  // API: PDF Report
  app.post("/api/report", async (req, res) => {
    const { devices, tenantName } = req.body;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Báo cáo thiết bị y tế - ${tenantName}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Ngày tạo: ${new Date().toLocaleDateString("vi-VN")}`, 14, 30);

    const tableData = devices.map((d: any) => [
      d.name,
      d.department,
      d.status === "normal" ? "Bình thường" : d.status === "warning" ? "Cảnh báo" : "Hư hỏng",
      new Date(d.lastUpdate).toLocaleDateString("vi-VN"),
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [["Tên thiết bị", "Khoa/Phòng", "Trạng thái", "Cập nhật cuối"]],
      body: tableData,
    });

    const pdfBuffer = doc.output("arraybuffer");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
    res.send(Buffer.from(pdfBuffer));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Simple "Cron" Job (runs every 24 hours)
  setInterval(async () => {
    console.log("Running daily maintenance check...");
    // In a real app, we would query Firestore here using firebase-admin
    // and send alerts for devices not updated in > 24h.
    // For this demo, we'll just log it.
  }, 24 * 60 * 60 * 1000);
}

startServer();
