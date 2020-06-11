const ChartBackup = require('../modules/mongo/schema/chartbkSchema');

exports.getChartBackup = async(req, res, next) => {
    try {
        const getChart = await ChartBackup.find()
        res.status(201).json({
            charts: getChart
        })
        return;
    } catch(err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.createChartBackup = async(req, res, next) => {
    let parsedChart = null;
    let postChart;

    if(req.body.chart) {  
        parsedChart = JSON.stringify(req.body.chart)
    }

    if(parsedChart != null && req.body.name){
        postChart = new ChartBackup({
            name: req.body.name,
            backup: parsedChart,
            creator: req.body.creator
        })
    } else {
        const error = new Error('No Content or Incomplete Content')
        error.statusCode = 202;
        next(error)  
    }

    try {
        let check = await ChartBackup.findOne({name: req.body.name})
        if(!check){
            await postChart.save();
            res.status(200).json({
                mssg: 'Chart Created Successfully'
            })
        } else {
            check.name = req.body.name;
            check.backup = parsedChart;
            check.creator = req.body.creator;
            await check.save();
            res.status(201).json({
                mssg: "Chart Updated Successfully"
            })
        }    
    } catch(err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.deleteChartBackup = async(req, res, next) => {
    if(!req.body.name){
        const error = new Error('No Content or Incomplete Content')
        error.statusCode = 202;
        next(error)
    }
    try {
        await ChartBackup.findOneAndDelete({_id: req.body.name});
        res.status(201).json({
            mssg: "Chart Deleted Successfully"
        })
    } catch(err){
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}

