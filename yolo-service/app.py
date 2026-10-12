from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from ultralytics import YOLO
from PIL import Image, ImageOps
import io

app = FastAPI(title="FabriSense YOLO11n Inference API")

# Load the trained model
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best.pt"

model = YOLO(str(MODEL_PATH))


@app.get("/")
def home():
    return {
        "message": "FabriSense AI service is running",
        "model": "Trained YOLO11n",
        "status": "ready"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model_loaded": True,
        "classes": model.names
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if image.content_type not in [
        "image/jpeg",
        "image/png",
        "image/webp"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Please upload a JPEG, PNG, or WebP image."
        )

    try:
        contents = await image.read()
        pil_image = ImageOps.exif_transpose(
            Image.open(io.BytesIO(contents))
        ).convert("RGB")

        # Run the trained model
        results = model.predict(
            source=pil_image,
            conf=0.25,
            verbose=False
        )

        result = results[0]
        image_width, image_height = pil_image.size

        defects = []

        for box in result.boxes:
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            defects.append({
                "type": model.names[class_id],
                "confidence": round(confidence, 4),
                "x": round((x1 / image_width) * 100, 2),
                "y": round((y1 / image_height) * 100, 2),
                "width": round(((x2 - x1) / image_width) * 100, 2),
                "height": round(((y2 - y1) / image_height) * 100, 2)
            })

        return {
            "success": True,
            "model": "FabriSense YOLO11n",
            "image_width": image_width,
            "image_height": image_height,
            "defect_count": len(defects),
            "defects": defects
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}"
        )