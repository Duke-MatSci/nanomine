const controllerFor = 'API ACCESS';
const https = require('https')
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bycrypt = require('bcryptjs');
const { validationResult } = require('express-validator/check');
const User = require('../modules/mongo/schema/users');
const Apiaccess = require('../modules/mongo/schema/accessApi');

exports.chempropsParser = async(req, res, next) => {
    const receivedToken = await dbChecker(req.env.emailTestAddr);
    if(!receivedToken) {
        logger.error("CHEMPROPS API: No internal token available to process this request. Create a new internal token")
        return apiResponse(res, 401, {mssg: "No Internal Token"})
    }
    
    const polfil = req.params.polfil ? req.params.polfil : 'pol';
    const ChemicalName = req.params.ChemicalName;
    const nmId = req.params.nmId ? req.params.nmId : 'restNmId';
    const Abbreviation = req.params.Abbreviation ? req.params.Abbreviation : req.params.ChemicalName;
    const TradeName = req.params.TradeName ? req.params.TradeName : req.params.ChemicalName;
    const SMILES = req.params.uSMILES ? req.params.uSMILES : req.params.ChemicalName;
    return postToChemprops(receivedToken.token, polfil, nmId, ChemicalName, Abbreviation, TradeName, SMILES)
}

exports.chemprops = (req, res, next) => {
    let result = "Nothing Found";
    const logger = req.logger;
    const authHeader = req.get('Authorization')
    if(!authHeader){
        logger.error("CHEMPROPS API: No Authorization header information")
        return apiResponse(res, 401, {mssg: "Nothing Found"})
    }
    const receivedToken = authHeader.split(' ')[1];
    const polfil = req.query.polfil ? req.query.polfil : 'pol';
    const ChemicalName = req.query.chemicalname;
    const nmId = 'restNmId';
    const Abbreviation = req.query.abbreviation ? req.query.abbreviation : req.query.chemicalname;
    const TradeName = req.query.tradename ? req.query.tradename : req.query.chemicalname;
    const SMILES = req.query.smiles ? req.query.smiles : req.query.chemicalname;
    return postToChemprops(receivedToken, polfil, nmId, ChemicalName, Abbreviation, TradeName, SMILES)
}

exports.checkApi = async(req,res,next) => {
    if(!req.userToken){
        const error = new Error("Authentication failed")
        error.statusCode = 300
        throw error
    }
    // const exist = await Apiaccess.findOne({user: req.userToken.mail}, {'user':1, 'token':1})
    const exist = await dbChecker(req.userToken.mail)
    if(exist){
        apiResponse(res, 201, {
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
    // const exist = await Apiaccess.findOne({user: req.env.emailTestAddr}, {'user':1, 'token':1})
    const exist = await dbChecker(req.env.emailTestAddr)
    if(exist){
        return apiResponse(res, 201, {
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
        return apiResponse(res, 401, {mssg: "Failed Validation. Try again!"})
    }

    if (!req.userToken) {
        const error = new Error("Authentication failed")
        error.statusCode = 300
        throw error
    }

    const userExist = await userExistCheck(req.userToken.mail)
    if (!userExist || !req.body.token) {
        logger.error("Invalid token. Token does not match any user")
        return apiResponse(res, 401, {mssg: "Authentication failed"})
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
    return apiResponse(res, 201, {
        token: token,
        email: req.userToken.mail
    })
}

exports.redirectToHome = (req, res, next) => {
    res.redirect('/nm')
}

const dbChecker = async(userMail) => {
    const exist = await Apiaccess.findOne({user: userMail}, {'user':1, 'token':1})
    return exist;
}

const apiResponse = (x,y,z) =>{
    return x.status(y).json(z)
}

const userExistCheck = async(email) => {
    const result = await User.findOne({email: email}, {'userid': 1, '_id':0})
    return result;
}

const postToChemprops = async(receivedToken) => {
    let result;
    const exist = await Apiaccess.findOne({token:receivedToken})
    if(!exist){
        logger.error("CHEMPROPS API: Received token does not match any record")
        return apiResponse(res, 401, {mssg: "Nothing Found"})
    }
    const decoded = jwt.verify(exist.token, exist.key)
    if(decoded && decoded.mail && req.query.chemicalname){
        try {
            const userExist = await userExistCheck(decoded.mail)
            if(!userExist){
                logger.error("CHEMPROPS API: Token failed user verification")
                return apiResponse(res, 401, {mssg: "Cannot process data"})
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
            }, req.env.nmAuthSecret);

            let httpsAgent = {
                host: 'localhost',
                port: '443',
                // path: '/',
                path: '/api/v1/chemprops',
                rejectUnauthorized: false
            }

            result = await axios({
                'method': 'get',
                'url': req.env.nmLocalRestBase + `/api/v1/chemprops?polfil=${polfil}&nmId=${nmId}&ChemicalName=${ChemicalName}&Abbreviation=${Abbreviation}&TradeName=${TradeName}&SMILES=${SMILES}`,
                // 'params': {ID: 12345},
                'httpsAgent': new https.Agent(httpsAgent),
                'headers': {'Content-Type': 'application/json', 'token': token}
            })
            
            return apiResponse(res, 200, {data: result.data})   
        } catch(err){
            logger.error("CHEMPROPS API: " + err)
            result = err.data
            return apiResponse(res, 404, {mssg: "An error occurred"})
        }
    }
    apiResponse(res, 200, {data: 'Cannot verify user and or chemical name'})
}