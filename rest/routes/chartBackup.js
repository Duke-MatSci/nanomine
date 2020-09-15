const express = require('express');
const chartBackupController = require('../controllers/chartBackup');
const middleware = require('../middlewares/tempVerifier');
const apiAccessController = require('../controllers/apiAccess');
const router = express.Router();

/*** RETURN TO HOME PAGE IF NO ROUTE IS SPECIFIED */
router.get('/', apiAccessController.redirectToHome)

/** GET CHART BACKUP STORED IN MONGO */
router.get('/retrievecharts', chartBackupController.getChartBackup)

/** GET USER CHART BOOKMARKS STORED IN MONGO */
router.post('/retrievechartbkmks', middleware.check, middleware.getUser, chartBackupController.getChartBkmk)

/** STORE/UPDATE MONGO WITH NEW CHART */
router.post('/postcharts', middleware.check, middleware.getUser, chartBackupController.createChartBackup)

/** MANAGES CHART BOOKMARKS */
router.post('/postchartbkmks', middleware.check, middleware.getUser, chartBackupController.bookmarkChartBackup)

/** CREATE NEW CHART TAG */
router.post('/submittag', middleware.check, middleware.getUser, chartBackupController.submitTag)

/** RETREIVE CHART TAG */
router.post('/gettag', middleware.check, middleware.getUser, chartBackupController.getChartTag)

/** RESET RESTORE */
router.post('/resetcharts', middleware.check, middleware.getUser, chartBackupController.resetChart)

/** DELETE CHARTS */
router.delete('/deletecharts', middleware.check, middleware.getUser, chartBackupController.deleteChartBackup)

/** GET USER */
router.post('/vu', middleware.check, middleware.getUser, chartBackupController.getUser)

/** GET USER LIST */
router.post('/chartuserlist', middleware.check, middleware.getUser, chartBackupController.getUserListing)

module.exports = router;

