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

export class YoloService {
  /**
   * Get current AI provider configuration
   */
  static getModelInfo() {
    const isYolo = (AI_MODE || '').toLowerCase() === 'yolo';
    return {
      modelName: 'FabriSense YOLOv8',
      modelVersion: 'v4.2.1-textile',
      aiMode: isYolo ? 'yolo' : 'mock',
      aiModeLabel: isYolo ? 'YOLOv8 Production' : 'Demo (Mock Provider)',
      status: 'Active',
      apiStatus: isYolo ? 'Connected' : 'Online (Local Engine)',
      apiUrl: isYolo ? YOLO_API_URL : null,
      datasetName: 'TextileDefect-45k-augmented',
      supportedClasses: [
        'Holes',
        'Stains',
        'Broken Yarn',
        'Slub Knot',
        'Weft Tears',
        'Scratches',
        'Other'
      ],
      lastUpdated: '2024-09-01',
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
        console.error('[YOLO Service] Real YOLO inference failed, falling back to mock engine:', err.message);
        const result = this._generateMockPrediction(imagePath, metadata);
        result.summary = `[Fallback from offline YOLO server] ${result.summary}`;
        return result;
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
      const type = d.type || d.class_name || d.label || 'Defect';
      const conf = Math.round(d.confidence > 1 ? d.confidence : (d.confidence || 0.85) * 100);
      let severity = d.severity || 'Moderate';
      if (!d.severity) {
        if (conf > 92 || type.toLowerCase().includes('hole') || type.toLowerCase().includes('tear')) {
          severity = 'Critical';
        } else if (conf < 85) {
          severity = 'Low';
        }
      }

      return {
        id: index + 1,
        type,
        confidence: conf,
        severity,
        x: Math.round(d.x ?? d.left ?? 20),
        y: Math.round(d.y ?? d.top ?? 20),
        width: Math.round(d.width ?? 30),
        height: Math.round(d.height ?? 30),
        explanation: d.explanation || `Localized ${type} defect identified by YOLOv8 model.`,
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
      modelVersion: 'FabriSense YOLOv8',
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
      // 1 defect or 0 defects
      defectProfiles = [
        {
          type: 'Broken Yarn',
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
          type: 'Stains',
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
          type: 'Slub Knot',
          confidence: 86,
          severity: 'Low',
          x: 22,
          y: 28,
          width: 24,
          height: 20,
          explanation: 'Localized knot and thickened irregularity in raw yarn weave.',
          recommendedAction: 'Check finishing loom yarn feed tension.',
        },
      ];
    } else {
      // Default realistic 3-defect profile
      defectProfiles = [
        {
          type: 'Stains',
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
          type: 'Holes',
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
          type: 'Broken Yarn',
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
        : 'Minor and moderate defects were detected including stain, hole, and broken yarn. The fabric is structurally viable but may require manual review before sewing.',
      recommendedAction: grade === 'A'
        ? 'Approved for packaging and dispatch.'
        : 'Flag affected roll section for cutting or spot cleaning before batch packaging.',
      modelVersion: 'FabriSense YOLOv8',
      aiMode: 'mock',
    };
  }
}

export default YoloService;
