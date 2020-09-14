/*** This code will be removed from the project 
 *** as soon as the permanent auth-middleware is completed.
***/
const { body, validationResult } = require('express-validator');
const User = require('../modules/mongo/schema/users');
const jwt = require('jsonwebtoken');
const nanomineUtils = require('../modules/utils')
const env = nanomineUtils.getEnv()
const nmAuthSecret = env.nmAuthSecret

exports.check = [
    body('creator')
        .isString()
        .notEmpty()
        // .isLength({ min: 7, max: 7 })
        .withMessage('Invalid data')
        .custom((value, {req}) => {
            return User.findOne({ userid: value }).then(user => {
                if(!user){
                    return Promise.reject('This user not found')
                }
            })
        })
]

exports.getUser = async(req, res, next) => {
    const logger = req.logger;
    let error;
    error = validationResult(req);
    if(!error.isEmpty()){
        error = new Error('Validation Error!')
        error.statusCode = 401;
        logger.error('Rest Chart Gallery User Validation Error: Validation Error!')
        throw error;
    }
    try {
        const getUser = await User.findOne({userid: req.body.creator});
        if(!getUser){
            error = new Error('Not Authorized')
            error.statusCode = 401;
            logger.error('Rest Chart Gallery User Validation Error: Unauthorized User Access Failure')
            throw error;
        }
        req.user = getUser;
        next();
    } catch(err) {
        error = new Error(err)
        error.statusCode = 401;
        logger.error('NM-Rest Chart Gallery User Validation Error: Server error, cannot pull data from mongo')
        throw error;
    }
}

exports.verifyToken = async(req, res, next) => {
    let error, decodedToken;
    const logger = req.logger;
    const authHeader = req.get('Authorization')
    if(!authHeader){
        error = new Error('Not Authenticated')
        error.statusCode = 402
        logger.error("User failed to pass authentication token!")
        throw error
    }
    const token = authHeader.split(' ')[1]
    try {
        decodedToken = jwt.verify(token, nmAuthSecret)
        if(!decodedToken) {
            logger.error("Error! Token verification decoding return empty string")
            error = new Error('Authentication failed')
            error.statusCode = 401
            throw error
        }
        req.userToken = decodedToken
    } catch(err){
        error = err
        error.statusCode = 500
        logger.error("Token verification failed!")
        throw error
    }
    next();
}