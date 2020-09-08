const express = require('express');
const apiAccessController = require('../controllers/apiAccess');
const middleware = require('../middlewares/tempVerifier');

const router = express.Router();

/** SINGLE ACCESS ENTRY FOR ALL API */
router.get('/apiaccess', apiAccessController.getData)

/** CREATE API TOKEN */
router.post('/create', apiAccessController.createAccess)


module.exports = router;