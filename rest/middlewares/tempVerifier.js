/*** This code will be removed from the project 
 *** as soon as the permanent auth-middleware is completed.
***/
const { body, validationResult } = require('express-validator');
const User = require('../modules/mongo/schema/users');

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