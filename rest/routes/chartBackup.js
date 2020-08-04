const express = require('express');
const chartBackupController = require('../controllers/chartBackup');
const middleware = require('../middlewares/tempVerifier');

const router = express.Router();

/** GET CHART BACKUP STORED IN MONGO */
router.get('/retrievecharts', chartBackupController.getChartBackup)

/** GET USER CHART BOOKMARKS STORED IN MONGO */
router.post('/retrievechartbkmks', middleware.check, middleware.getUser, chartBackupController.getChartBkmk)

/** STORE/UPDATE MONGO WITH NEW CHART */
router.post('/postcharts', middleware.check, middleware.getUser, chartBackupController.createChartBackup)

/** MANAGES CHART BOOKMARKS */
router.post('/postchartbkmks', middleware.check, middleware.getUser, chartBackupController.bookmarkChartBackup)

/** DELETE CHARTS */
router.delete('/deletecharts', middleware.check, middleware.getUser, chartBackupController.deleteChartBackup)

/** GET USER */
router.post('/vu', middleware.check, middleware.getUser, chartBackupController.getUser)

/** GET USER LIST */
router.post('/chartuserlist', middleware.check, middleware.getUser, chartBackupController.getUserListing)

module.exports = router;

