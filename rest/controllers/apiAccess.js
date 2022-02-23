const controllerFor = 'API ACCESS';
const https = require('https')
const jwt = require('jsonwebtoken');
const axios = require('axios');
const bycrypt = require('bcryptjs');
const mongoose = require('mongoose');
const mimetypes = require('mime-types');
const s2a = require('stream-to-array')
const ObjectId = require('mongodb').ObjectId
const { validationResult } = require('express-validator/check');
const User = require('../modules/mongo/schema/users');
const Apiaccess = require('../modules/mongo/schema/accessApi');

exports.chempropsParser = async(req, res, next) => {
    const logger = req.logger;
    const receivedToken = await dbChecker(req.env.emailTestAddr);
    if(!receivedToken) {
        logger.error("CHEMPROPS API: No internal token available to process this request. Create a new internal token")
        return apiResponse(res, 401, {mssg: "No Internal Token"})
    }
    
    return postToChemprops(req, res, receivedToken.token)
}

exports.chemprops = async(req, res, next) => {
    let result = "Nothing Found";
    const logger = req.logger;
    const authHeader = req.get('Authorization')
    if(!authHeader){
        logger.error("CHEMPROPS API: No Authorization header information")
        return apiResponse(res, 401, {mssg: "Nothing Found"})
    }
    const receivedToken = authHeader.split(' ')[1];
    return postToChemprops(req, res, receivedToken)
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

const postToChemprops = async(req, res, receivedToken) => {
    let result;
    const logger = req.logger;
    // logger.error("test-token: " + req.query.ChemicalName)
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
            const polfil = req.query.polfil ? req.query.polfil : 'pol';
            const ChemicalName = req.query.chemicalname || req.query.ChemicalName;
            const nmId = req.params.nmId ? req.params.nmId : 'restNmId';
            const Abbreviation = req.query.abbreviation || req.query.Abbreviation;
            const TradeName = req.query.tradename || req.query.TradeName;
            const SMILES = req.query.smiles || req.query.SMILES;
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
                // 'url': req.env.nmLocalRestBase + `/api/v1/chemprops?polfil=${polfil}&nmId=${nmId}&ChemicalName=${ChemicalName}&SMILES=${SMILES}`,
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

const getImageFromMongo = (arg, logger) => {
    return new Promise(function(resolve, reject) {
        const options = {};
        if(arg){
            const  imageId = new URL(arg).searchParams.get('id')
            if(imageId){
                let dlStream = null
                const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, options)
                try {
                    dlStream = bucket.openDownloadStream(ObjectId.createFromHexString(imageId), {})
                    s2a(dlStream, function (err, a) {
                        if (err) {
                          logger.error('[getImageFromMongo Function]:: '+ err)
                          reject(err)
                        } else {
                          let buffers = a.map(a => Buffer.isBuffer(a) ? a : Buffer.from(a))
                          resolve(Buffer.concat(buffers).toString('base64'))
                        }
                    })
                } catch (err) {
                    logger.error('[getImageFromMongo]:: '+ err)
                    reject(null)
                }
            }
        } else {
            resolve(null)
        }
    })
}

const processImageArray = async (arg,logger,res, toggle) => {
    const retrievedImages = await arg.map(async (el) => {
        let processImage
        if(toggle){
            processImage = await getImageFromMongo(el.thumbnail, logger)
            el.thumbnail = processImage
        } else {
            logger.info('nope')
            processImage = await getImageFromMongo(el.image, logger)
            el.image = processImage
        }
        return el
    })
    Promise.all(retrievedImages).then(function(retrievedImage) {
        return apiResponse(res, 200, {data: retrievedImage});
    })
}

const filterSparqlResult = async(arg) => {
    let retrievedImage = await arg.bindings.map((imgResult) => {
        const imageObject = {}
        Object.entries(imgResult)
            .forEach(([field, value]) => imageObject[field] = value.value)
        return imageObject
    })
    return retrievedImage;
}

const imageSparqlResult = async (res, arg, logger) => {
    const retrievedImage = await filterSparqlResult(arg, logger)
    return processImageArray(retrievedImage, logger, res)
}

exports.microstructureImageApi = async(req, res) => {
    if(req.body.images) {
        return processImageArray(req.body.images, req.logger, res, true)
    }
    return apiResponse(res, 400, {mssg: "No image list url provided"})
}

exports.galleryParser = async(req,res) => {
    const logger = req.logger;
    const queryType = {}
    queryType.defaultQuery = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX sio: <http://semanticscience.org/resource/>
        PREFIX mm: <http://materialsmine.org/ns/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT * WHERE {
            ?sample a mm:PolymerNanocomposite ;
                    sio:isRepresentedBy ?image ;
                    rdfs:label ?sample_label .
            ?image a sio:Image .
        }
        LIMIT 10 OFFSET ${req.body.limit * 10}
        `.trim()

    queryType.imageQuery = `
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX sio: <http://semanticscience.org/resource/>
        PREFIX mm: <http://materialsmine.org/ns/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        SELECT * WHERE {
            ?sample a mm:PolymerNanocomposite ;
                    sio:isRepresentedBy ?image ;
                    rdfs:label ?sample_label .
            ?image a sio:Image .
            filter(regex((str(?sample_label)), "${req.body.query}", "i" )) .
        }
        LIMIT 10 OFFSET ${req.body.limit * 10}
        `.trim()
        
    const SPARQL_ENDPOINT = req.env.nmLocalRestBase + '/sparql'
    const request = {
        method: 'post',
        url: SPARQL_ENDPOINT,
        data: `query=${encodeURIComponent(queryType[req.body.type])}`,
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        withCredentials: true
    }
    const response = await axios(request)
    if(response){ return imageSparqlResult(res, response.data.results, logger)   }
    else { return apiResponse(res, 400, {mssg: "An error occurred"}) }
}