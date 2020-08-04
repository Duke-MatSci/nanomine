/** THIS SCRIPT RUNS ALL SERVICES AT REST INITIALIZATION */

module.exports = {
    init: (conn, funcs, args) => {

        /** ON FAILED DB CONNECTION */
        conn.on('error', (err)=> {
            console.log('dbPromise.catch - db open failed: ' + err)
            return funcs.logger.error('db error: ' + err)
        })

        /** ON DB CONNECTION */
        conn.once('open', () =>{
            funcs.logger.info('database opened successfully via mongoose connect.')
            if (!args.nmAutostartCurator) {
                console.log('NOT SUBMITTING CURATOR AT THIS TIME. DISABLED.')
                return;
            }
            /** run the curator job (long running job) TODO: monitor curator */ 
            funcs.submitCurator(args.nmAuthSystemUserId) 
            .then(function () {
                funcs.logger.info('successfully submitted curator job.')
                // console.log(msg) // for convenience
            })
            .catch(function (err) {
                funcs.logger.error('submission of curator job failed. Error: ' + err)
                // console.log(msg)
            })
            /** run the curator job (long running job) TODO: monitor generateSeoFiles */ 
            funcs.submitGenerateSeoFiles(args.nmAuthSystemUserId) 
            .then(function () {
                funcs.logger.info('successfully submitted generate seo files job.')
                // console.log(msg) // for convenience
            })
            .catch(function (err) {
                funcs.logger.error('submission of generate seo files job failed. Error: ' + err)
                // console.log(msg)
            })
        })
    }
}