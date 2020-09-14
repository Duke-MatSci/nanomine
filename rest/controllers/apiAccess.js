const controllerFor = 'API ACCESS';
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bycrypt = require('bcryptjs');
const { validationResult } = require('express-validator/check');
const User = require('../modules/mongo/schema/users');
const Apiaccess = require('../modules/mongo/schema/accessApi');

exports.chemprops = async(req, res, next) => {
    let result = "Nothing Found";
    const logger = req.logger;
    const authHeader = req.get('Authorization')
    if(!authHeader){
        logger.error("CHEMPROPS API: No Authorization header information")
        return errorResponse(res, 401, "Nothing Found")
    }
    const receivedToken = authHeader.split(' ')[1]
    const exist = await Apiaccess.findOne({token:receivedToken})
    if(!exist){
        logger.error("CHEMPROPS API: Received token does not match any record")
        return errorResponse(res, 401, "Nothing Found")
    }
    const decoded = jwt.verify(exist.token, exist.key)
    if(decoded && decoded.mail && req.query.search){
        try {
            const userExist = await userExistCheck(decoded.mail)
            if(!userExist){
                logger.error("CHEMPROPS API: Token failed user verification")
                return errorResponse(res, 401, "Cannot process data")
            }
            const token = jwt.sign({
                sub: decoded.sub,
                givenName: decoded.givenName,
                sn: decoded.sn,
                displayName: decoded.displayName,
                isTestUser: decoded.isTestUser,
                isAdmin: decoded.isAdmin,
                isUser: decoded.isUser,
                mail: decoded.mail,
                isAnonymous: false,
                userExists: decoded.userExists,
            }, req.env.nmAuthSecret)
            const polfil = req.query.type ? req.query.type : 'pol';
            const ChemicalName = req.query.search;
            const nmId = 'restNmId';
            const Abbreviation = req.query.abbreviation ? req.query.abbreviation : req.query.search;
            const TradeName = req.query.tradename ? req.query.tradename : req.query.search;
            const uSMILES = req.query.smiles ? req.query.usmiles : req.query.search;
            result = await axios.request({
                url: `http://localhost:80/api/v1/chemprops/?polfil=${polfil}&nmId=${nmId}&ChemicalName=${ChemicalName}&Abbreviation=${Abbreviation}&TradeName=${TradeName}&uSMILES=${uSMILES}`,
                method: "get", 
                headers: {
                    token: token
                }
           })
        } catch(err){
            logger.error("CHEMPROPS API: " + err)
            result = err.data
            return errorResponse(res, 404, "An error occurred")
        }
    }
    res.status(200).json({
        data: result
    })
}

exports.checkApi = async(req,res,next) => {
    if(!req.userToken){
        const error = new Error("Authentication failed")
        error.statusCode = 300
        throw error
    }
    const exist = await Apiaccess.findOne({user: req.userToken.mail}, {'user':1, 'token':1})
    if(exist){
        res.status(201).json({
            token: exist.token,
            email: req.userToken.mail,
            user: req.userToken.user
        })
    } else {
        res.status(201)
    }
}

exports.tokenParser = async(req,res,next) => {
    const logger = req.logger;
    const exist = await Apiaccess.findOne({user: req.env.emailTestAddr}, {'user':1, 'token':1})
    if(exist){
        res.status(201).json({
            token: exist.token
        })
    } else {
        logger.debug('CHEMPROPS API: No test user found')
        res.status(201)
    }
}

exports.createAccess = async(req, res, next) => {
    const logger = req.logger;
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        logger.error("Request to create API access failed middleware validation")
        return errorResponse(res, 401, "Failed Validation. Try again!")
    }

    if (!req.userToken) {
        const error = new Error("Authentication failed")
        error.statusCode = 300
        throw error
    }

    const userExist = await userExistCheck(req.userToken.mail)
    if (!userExist || !req.body.token) {
        logger.error("Invalid token. Token does not match any user")
        return errorResponse(res, 401, "Authentication failed")
    }
    const hashedKey = await bycrypt.hash(req.body.token, 12)
    const token = jwt.sign({
        sub: req.userToken.sub,
        givenName: req.userToken.givenName,
        sn: req.userToken.sn,
        displayName: req.userToken.displayName,
        isTestUser: req.userToken.isTestUser,
        isAdmin: req.userToken.isAdmin,
        isUser: req.userToken.isUser,
        mail: req.userToken.mail,
        isAnonymous: req.userToken.isAnonymous,
        userExists: req.userToken.userExists,
    }, hashedKey)

    const apiAccess = new Apiaccess({
        user: req.userToken.mail,
        key: hashedKey,
        token: token
    })
    await apiAccess.save();
    res.status(201).json({
        token: token,
        email: req.userToken.mail
    })
}

exports.redirectToHome = (req, res, next) => {
    res.redirect('/nm')
}

const errorResponse = (x,y,z) =>{
    return x.status(y).json({
        mssg: z
    })
}

const userExistCheck = async(email) =>{
    const result = await User.findOne({email: email}, {'userid': 1, '_id':0})
    return result;
}