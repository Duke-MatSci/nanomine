const express = require('express');
const { body, param, query } = require('express-validator/check')
const apiAccessController = require('../controllers/apiAccess');
const middleware = require('../middlewares/tempVerifier');
const Apiaccess = require('../modules/mongo/schema/accessApi');
const router = express.Router();

/*** RETURN TO HOME PAGE IF NO ROUTE IS SPECIFIED */
router.get('/', apiAccessController.redirectToHome)

/*** CHECK IF USER API EXIST */
router.get('/check', middleware.verifyToken, apiAccessController.checkApi)

/*** FRONT END APP TOKEN PARSER */
router.get('/parser', apiAccessController.tokenParser)

/** CHEMPROPS ENTRY API */
router.get('/chemprops', apiAccessController.chemprops)

/** XML Conversion API Connection */
router.get('/chemprops_parser', apiAccessController.chempropsParser)

/** CREATE API TOKEN */
router.post('/create', middleware.verifyToken, [
    query('userToken')
        .custom((value, {req}) => {
            return Apiaccess.findOne({user: req.userToken.mail}).then(user => {
                if(user){
                    return Promise.reject("A user already exist")
                }
            })
        }),
    body('token')
        .isString()
        .trim()
        .notEmpty()
], 
apiAccessController.createAccess)

module.exports = router;