const ChartBackup = require('../modules/mongo/schema/chartbkSchema');
const AppList = require('../modules/mongo/schema/appListing');
const ChartBkmk = require('../modules/mongo/schema/chartbookmarks');
const User = require('../modules/mongo/schema/users');

const controllerFor = 'Visualization Gallery';
exports.getUser = (req, res, next) => {
    res.status(201).json({
        _id: req.user._id,
        name: req.user.givenName
    })
    return;
}

exports.getUserListing = async(req, res, next) => {
    const logger = req.logger;
    try {
        const userList = await User.find({}, {'userid': 1, 'givenName': 1, 'surName': 1, '_id':0})
        res.status(201).json({
            users: userList
        })
    } catch(err){
        if(!err.statusCode){
            err.statusCode = 500;
        }
        logger.error('NM-Rest Chart Gallery Error (GET USERLIST): Server error, cannot retrieve user list data')
        next(err);
    }
}

exports.getChartBackup = async(req, res, next) => {
    const logger = req.logger;
    try {
        const getChart = await ChartBackup.find({},{'_id':1, 'name':1, 'backup':1, 'creator':1, 'creatorref':1, 'enabled':1, 'restored': 1}).sort({bookmarked: -1})
        res.status(201).json({
            charts: getChart
        })
        return;
    } catch(err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        logger.error('NM-Rest Chart Gallery Error (GET CHARTS): Server error, cannot retrieve data')
        next(err);
    }
}

exports.getChartBkmk = async(req, res, next) => {
    const logger = req.logger;
    try {
        const getBkmk = await ChartBkmk.find({creator: req.user._id},{'chart':1, '_id':0}).populate('chart', 'name')
        res.status(201).json({
            charts: getBkmk
        })
        return;
    } catch(err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        logger.error('NM-Rest Chart Gallery Error (GET BOOKMARK): Server error, cannot retrieve bookmarks')
        next(err);
    }
}

exports.createChartBackup = async(req, res, next) => {
    const logger = req.logger;
    let parsedChart = null;
    let user = req.user._id
    let postChart, message = 'Thank you';
    let named = req.body.prevChartID != 'null' ? req.body.prevChartID : req.body.name
    if(req.body.chart) {  
        parsedChart = JSON.stringify(req.body.chart)
    }

    if(parsedChart != null && req.body.name){
        postChart = new ChartBackup({
            name: req.body.name,
            backup: parsedChart,
            creator: req.body.creator,
            creatorref: user,
            restored: req.body.restored,
            enabled: req.body.enabled
        })
    } else {
        const error = new Error('No Content or Incomplete Content')
        error.statusCode = 202;
        logger.error('NM-Rest Chart Gallery Error: User parsed an empty chart data')
        next(error)  
    }

    try {
        const blacklist = await AppList.findOne({appname: controllerFor, blockedusers: user}) // => CHECK IF USER IS BLACKLISTED
        if(!blacklist){
            let check = await ChartBackup.findOne({name: named})
            if(!check){
                await postChart.save();
                message = "Chart Created Successfully"
            } else {
                check.name = req.body.name;
                check.backup = parsedChart;
                check.restored = req.body.restored;
                check.enabled = req.body.enabled;
                await check.save();
                message = "Chart Updated Successfully"
            }    
        } else {
            logger.error('NM-Rest Chart Gallery Error (BlackListed): User is blacklisted')
        }
        res.status(201).json({
            mssg: message
        })
    } catch(err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        logger.error('NM-Rest Chart Gallery Error: '+ err)
        next(err);
    }
}

exports.deleteChartBackup = async(req, res, next) => {
    const logger = req.logger;
    if(!req.body.name){
        const error = new Error('No Content or Incomplete Content')
        error.statusCode = 202;
        logger.error('NM-Rest Chart Gallery Error (Delete Chart): User parsed an empty chart data for deletion')
        next(error)
    }
    try {
        const role = await AppList.findOne({appname: controllerFor, "roles.user": req.user._id}) // => GET USER ROLE
        if(role){
            await ChartBackup.findOneAndDelete({_id: req.body.name});
        } else {
            const blacklist = await AppList.findOne({appname: controllerFor, blockedusers: req.user._id}) // => CHECK IF USER IS BLACKLISTED
            if(!blacklist){
                await ChartBackup.findOneAndDelete({_id: req.body.name, creatorref: req.user._id}); 
            } else {
                logger.error('NM-Rest Chart Gallery Error (BlackListed): User is blacklisted')
            }
        }
        res.status(201).json({
            mssg: "Chart Deleted Successfully"
        })
    } catch(err){
        if(!err.statusCode){
            err.statusCode = 500;
        }
        logger.error('NM-Rest Chart Gallery Error (Delete Chart): '+ err)
        next(err);
    }
}

exports.bookmarkChartBackup = async(req, res, next) => {
    const logger = req.logger;
    let bkmk, user, type;
    let  message = 'Thank you!';
    if(!req.body.bkmk){
        const error = new Error('No Bookmark added')
        error.statusCode = 202;
        logger.error('NM-Rest Chart Gallery Error (Bookmark): Bookmark Info data missing')
        next(error)
    } else {
        bkmk = req.body.bkmk;
        type = req.body.status;
        user =  req.user._id;
        try {
            const blacklist = await AppList.findOne({appname: controllerFor, blockedusers: user}) // => CHECK IF USER IS BLACKLISTED
            if(!blacklist){
                const chartItem = await ChartBackup.findOne({name: bkmk})
                if(type == false && chartItem){
                    const postBkmk = new ChartBkmk({
                        chart: chartItem._id,
                        creator: user
                    })
                    const newBkmark = await postBkmk.save();
                    await chartItem.bookmarked.push(newBkmark)
                    await chartItem.save();
                    message = 'Bookmark Saved!'
                } else {
                    if(chartItem){
                        const item = await ChartBkmk.findOne({chart: chartItem._id, creator: user})
                        await chartItem.bookmarked.pull(item);
                        await chartItem.save();
                        await item.remove()
                        message = "Bookmark Removed!"
                    }
                }
            } else {
                logger.error('NM-Rest Chart Gallery Error (BlackListed): User is blacklisted')
            }
            res.status(201).json({
                mssg: message
            })
        } catch(err){
            if(!err.statusCode){
                err.statusCode = 500;
            }
            logger.error('NM-Rest Chart Gallery Error (Bookmark): '+ err)
            next(err);
        }
    }
}

