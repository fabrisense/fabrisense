/**
 * backend/services/ai/yolo.service.js
 * YOLOv8 AI Service Adapter for FabriSense Fabric Defect Detection.
 * 
 * Exposes a unified analyzeFabric(imagePath, options) contract.
 * Automatically adapts between:
 *   - AI_MODE=yolo : Calls real YOLOv8 inference server (YOLO_API_URL)
 *   - AI_MODE=mock : Uses deterministic/intelligent demo inspection engine
 */

import fs from 'fs';
import path from 'path';
import { AI_MODE, YOLO_API_URL } from '../../config/env.js';
import {
  CANONICAL_DEFECT_CLASSES,
  DEFECT_DISPLAY_NAMES,
  normalizeDefectType,
  getDefectSeverity,
} from './taxonomy.js';

export class YoloService {
  /**
   * Get current AI provider configuration
   */
  static getModelInfo() {
    const isYolo = (AI_MODE || '').toLowerCase() === 'yolo';
    const weightsPath = path.resolve(process.cwd(), 'yolo-service/best.pt');
    const weightsExist = fs.existsSync(weightsPath);

    return {
      modelName: 'FabriSense YOLO11n',
      modelVersion: 'yolo11n_v3',
      architecture: 'YOLO11 Nano (Ultralytics 8.4.175)',
      aiMode: isYolo ? 'yolo' : 'mock',
      aiModeLabel: isYolo ? 'YOLO11n Live Inference' : 'Demo (Mock Provider)',
      status: isYolo ? 'Active' : (weightsExist ? 'Weights Present (Inference Standby)' : 'Demo Mode'),
      apiStatus: isYolo ? 'Connected' : 'Offline / Standby (FastAPI server on port 8000 required)',
      apiUrl: isYolo ? YOLO_API_URL : null,
      datasetName: 'FabriSense Textile Defect Dataset (Kaggle)',
      supportedClasses: CANONICAL_DEFECT_CLASSES,
      detectionClasses: CANONICAL_DEFECT_CLASSES.join(', '),
      weightsPath: 'yolo-service/best.pt',
      weightsPresent: weightsExist,
      mAP50: '68.89%',
      mAP50_95: '41.18%',
      precision: '65.35%',
      recall: '64.65%',
      epochs: 50,
      optimizer: 'AdamW',
      imgsz: 640,
      batchSize: 16,
      lastUpdated: '2026-10-11',
      lastTrainedDate: '2026-10-11',
    };
  }

  /**
   * Analyze fabric image and return detected defects and quality grade
   * 
   * @param {string} imagePath - Local file path or relative asset path
   * @param {object} [metadata] - Optional fabric metadata (fabricType, fabricName, etc.)
   * @returns {Promise<{
   *   defects: Array<{
   *     type: string,
   *     confidence: number,
   *     severity: string,
   *     x: number,
   *     y: number,
   *     width: number,
   *     height: number,
   *     explanation: string,
   *     recommendedAction: string
   *   }>,
   *   grade: 'A' | 'B' | 'C',
   *   status: 'Passed' | 'Review' | 'Failed',
   *   defectCount: number,
   *   summary: string,
   *   recommendedAction: string,
   *   modelVersion: string,
   *   aiMode: string
   * }>}
   */
  static async analyzeFabric(imagePath, metadata = {}) {
    const isYolo = (AI_MODE || '').toLowerCase() === 'yolo';

    if (isYolo) {
      try {
        return await this._callRealYoloEndpoint(imagePath, metadata);
      } catch (err) {
        throw new Error(`YOLO inference failed: ${err.message}`);
      }
    }

    return this._generateMockPrediction(imagePath, metadata);
  }

  /**
   * Calls external YOLOv8 inference API
   */
  static async _callRealYoloEndpoint(imagePath, metadata) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }

    const fileBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);

    // Native multipart/form-data upload using fetch and Blob
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    formData.append('image', blob, fileName);
    if (metadata.fabricType) {
      formData.append('fabric_type', metadata.fabricType);
    }

    const response = await fetch(YOLO_API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`YOLO API responded with HTTP ${response.status}`);
    }

    const rawData = await response.json();
    return this._normalizeYoloResponse(rawData, metadata);
  }

  /**
   * Normalizes raw YOLO response into standard FabriSense schema
   */
  static _normalizeYoloResponse(data, metadata) {
    const rawDefects = Array.isArray(data.defects) ? data.defects : [];
    
    const defects = rawDefects.map((d, index) => {
      const rawType = d.type || d.class_name || d.label || 'defect';
      const norm = normalizeDefectType(rawType);
      const conf = Math.round(d.confidence > 1 ? d.confidence : (d.confidence || 0.85) * 100);
      const severity = d.severity || getDefectSeverity(norm.canonical, conf / 100);

      return {
        id: index + 1,
        type: norm.display,
        rawClass: rawType,
        canonicalClass: norm.canonical,
        confidence: conf,
        severity,
        x: Math.round(d.x ?? d.left ?? 20),
        y: Math.round(d.y ?? d.top ?? 20),
        width: Math.round(d.width ?? 30),
        height: Math.round(d.height ?? 30),
        explanation: d.explanation || `Localized ${norm.display} defect identified by YOLO11n model.`,
        recommendedAction: d.recommendedAction || d.action || 'Inspect affected fabric area.',
      };
    });

    const defectCount = defects.length;
    let grade = 'A';
    let status = 'Passed';

    const criticalCount = defects.filter(d => d.severity === 'Critical').length;
    if (defectCount === 0) {
      grade = 'A';
      status = 'Passed';
    } else if (criticalCount > 0 || defectCount >= 4) {
      grade = 'C';
      status = 'Failed';
    } else {
      grade = 'B';
      status = defectCount > 1 ? 'Review' : 'Passed';
    }

    return {
      defects,
      defectCount,
      grade,
      status,
      summary: data.summary || (grade === 'A' 
        ? 'Zero defects detected. Fabric meets Grade A export quality standards.'
        : grade === 'B'
        ? `${defectCount} defect(s) detected. Minor or moderate variations within acceptable threshold.`
        : `${defectCount} defects detected including critical anomalies. Fabric fails standard quality thresholds.`),
      recommendedAction: data.recommendedAction || (grade === 'A'
        ? 'Approved for packaging and dispatch.'
        : grade === 'B'
        ? 'Secondary manual review recommended before sewing.'
        : 'Reject roll section. Divert to rework/salvage processing.'),
      modelVersion: data.model || 'FabriSense YOLO11n',
      aiMode: 'yolo',
    };
  }

  /**
   * Deterministic and realistic mock engine for testing and presentation demo
   */
  static _generateMockPrediction(imagePath, metadata) {
    const filename = (imagePath || '').toLowerCase();
    const fabricType = (metadata.fabricType || '').toLowerCase();

    // Check if image filename or fabric type hints at clean / defective fabric
    let defectProfiles = [];

    if (filename.includes('kanchipuram') || fabricType.includes('silk')) {
      defectProfiles = [
        {
          type: 'Thread Error',
          canonicalClass: 'thread error',
          confidence: 88,
          severity: 'Low',
          x: 42,
          y: 48,
          width: 25,
          height: 20,
          explanation: 'Localized discontinuity in warp or weft thread with visible loose ends.',
          recommendedAction: 'Trim excess filament and reinforce weave density.',
        },
      ];
    } else if (filename.includes('denim') || fabricType.includes('denim')) {
      defectProfiles = [
        {
          type: 'Stain',
          canonicalClass: 'stain',
          confidence: 92,
          severity: 'Moderate',
          x: 52,
          y: 38,
          width: 38,
          height: 34,
          explanation: 'Visible area of discoloration detected on the fabric surface.',
          recommendedAction: 'Inspect affected area before further processing or rolling.',
        },
        {
          type: 'Oil Spot',
          canonicalClass: 'oil spot',
          confidence: 86,
          severity: 'Moderate',
          x: 22,
          y: 28,
          width: 24,
          height: 20,
          explanation: 'Surface oil residue droplet identified along weft path.',
          recommendedAction: 'Divert to degreasing station.',
        },
      ];
    } else {
      // Default realistic 3-defect profile
      defectProfiles = [
        {
          type: 'Stain',
          canonicalClass: 'stain',
          confidence: 92,
          severity: 'Moderate',
          x: 52,
          y: 38,
          width: 40,
          height: 36,
          explanation: 'A visible area of discoloration has been detected on the fabric surface.',
          recommendedAction: 'Inspect the affected area before further processing or rolling.',
        },
        {
          type: 'Hole',
          canonicalClass: 'hole',
          confidence: 94,
          severity: 'Critical',
          x: 14,
          y: 18,
          width: 32,
          height: 28,
          explanation: 'A puncture or missing warp/weft structure creating an open gap in weave.',
          recommendedAction: 'Flag roll section for cutting or mend with micro-stitching if permitted.',
        },
        {
          type: 'Thread Error',
          canonicalClass: 'thread error',
          confidence: 91,
          severity: 'Low',
          x: 10,
          y: 60,
          width: 30,
          height: 24,
          explanation: 'A localized discontinuity in warp or weft thread with visible loose ends.',
          recommendedAction: 'Trim excess filament and reinforce weave density.',
        },
      ];
    }

    const defectCount = defectProfiles.length;
    const criticalCount = defectProfiles.filter(d => d.severity === 'Critical').length;
    let grade = 'B';
    let status = 'Review';

    if (defectCount === 0) {
      grade = 'A';
      status = 'Passed';
    } else if (criticalCount > 0 && defectCount >= 4) {
      grade = 'C';
      status = 'Failed';
    } else {
      grade = 'B';
      status = 'Review';
    }

    return {
      defects: defectProfiles,
      defectCount,
      grade,
      status,
      summary: grade === 'A'
        ? 'Zero defects detected. Fabric meets Grade A export quality standards.'
        : 'Minor and moderate defects were detected including stain, hole, and thread error. The fabric is structurally viable but may require manual review before sewing.',
      recommendedAction: grade === 'A'
        ? 'Approved for packaging and dispatch.'
        : 'Flag affected roll section for cutting or spot cleaning before batch packaging.',
      modelVersion: 'FabriSense YOLO11n (Simulated)',
      aiMode: 'mock',
    };
  }
}

export default YoloService;
