const express = require('express');
const chartBackupController = require('../controllers/chartBackup');

const router = express.Router();

/** GET CHART BACKUP STORED IN MONGO */
router.get('/retrievecharts', chartBackupController.getChartBackup)

/** STORE/UPDATE MONGO WITH NEW CHART */
router.post('/postcharts', chartBackupController.createChartBackup)

/** DELETE CHARTS */
router.delete('/deletecharts', chartBackupController.deleteChartBackup)

module.exports = router;

