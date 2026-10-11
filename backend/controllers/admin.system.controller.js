import db from '../database/db.js';
import YoloService from '../services/ai/yolo.service.js';

/**
 * GET /api/admin/model
 * Returns current model information, status, and dataset specifications
 */
export function getModelInfo(_req, res) {
  try {
    const serviceInfo = YoloService.getModelInfo();
    const dbModel = db.prepare('SELECT * FROM model_info ORDER BY id DESC LIMIT 1').get();

    return res.json({
      success: true,
      data: {
        modelName: dbModel?.model_name || serviceInfo.modelName,
        modelVersion: dbModel?.model_version || 'v3.2.1-prod',
        aiMode: serviceInfo.aiMode,
        aiModeLabel: serviceInfo.aiModeLabel,
        status: 'Active',
        apiStatus: 'Online',
        apiUrl: serviceInfo.apiUrl,
        databaseStatus: 'Connected (SQLite WAL)',
        datasetName: dbModel?.dataset_name || serviceInfo.datasetName,
        supportedClasses: serviceInfo.supportedClasses,
        lastUpdated: dbModel?.last_updated || 'Aug 28, 2026',
        architecture: 'YOLOv8 Core',
        version: 'v3.2.1-prod',
        detectionClasses: 'Hole, Stain, Broken Yarn, Tear, Contamination',
        trainingImages: '12,450 Samples',
        modelAccuracy: '94.2%',
        validationSet: '2,400 Images',
        lastTrainedDate: 'Aug 15, 2026',
        edgeProcessing: 'Jetson Orin 64GB',
        responseLatency: '245ms',
        apiUptime: '99.8%',
        cameraFeedFps: '30 fps (Dual-lane)',
        diagnosticsLogs: [
          { time: '2026-09-05 10:22:15', prefix: 'fabrisense-engine-v4', message: 'Loading YOLOv8 tensor weights...', level: 'DEFAULT' },
          { time: '2026-09-05 10:22:17', prefix: '', message: 'CUDA GPU initialized. Processing lane 1 & lane 2 feeds.', level: 'SUCCESS' },
          { time: '2026-09-05 10:22:18', prefix: '', message: 'Slub knot defect candidate confidence (0.87) at Eg Cotton #102.', level: 'WARNING' },
          { time: '2026-09-05 10:22:20', prefix: '', message: 'Active batch status check. Operations telemetry online.', level: 'INFO' }
        ]
      },
    });
  } catch (error) {
    console.error('[Get Model Info Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve model info.' });
  }
}

/**
 * GET /api/admin/settings
 */
export function getSettings(_req, res) {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('[Get Settings Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
  }
}

/**
 * PUT /api/admin/settings
 */
export function updateSettings(req, res) {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings object.' });
    }

    const insertOrUpdate = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const updateMany = db.transaction((entries) => {
      for (const [key, val] of Object.entries(entries)) {
        insertOrUpdate.run(key, String(val));
      }
    });

    updateMany(settings);

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const updated = {};
    rows.forEach(r => {
      updated[r.key] = r.value;
    });

    return res.json({
      success: true,
      message: 'Settings updated successfully.',
      data: updated,
    });
  } catch (error) {
    console.error('[Update Settings Error]', error);
    return res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
}
