#!/usr/bin/env node

// cd to job data directory
// for all directories (except curator)
//   accumulate stats for job type (part of directory name jobtype-jobid)
//     stats right now:
//       by jobtype - #instances and #users i.e. XMLCONV 5 3
//                 JobType   Run Count    Total Users
//                 XMLCONV    5             3
//             XMLCONV was run 5 times by 3 different users
// as of 2019/06/15 there were 21 non-system users in production

const fs = require('fs')
const _ = require('lodash')
const nanomineUtils = require('./modules/utils')
let env = nanomineUtils.getEnv()

let cwd = process.cwd()
let jobDataDir = env.nmJobDataDir

// get a list of job directories -- except for curator
let jobDirs = fs.readdirSync(jobDataDir)
jobDirs = _.remove(jobDirs, function (v) {
  return !v.startsWith('curator')
})

let jobInfo = {} // jobtype, # instances, userlist
function addJobInfo (dir, jobParams) {
  let jobtype = dir.split('-')[0]
  let user = jobParams.submittingUser
  if (jobParams.user && jobParams.user.length > 0) {
    user = jobParams.user
  } else if (jobParams.originalUser && jobParams.originalUser.length > 0) {
    user = jobParams.originalUser
  }
  if (jobInfo[jobtype]) {
    jobInfo[jobtype].runs += 1
    if (!jobInfo[jobtype].users.includes(user)) {
      jobInfo[jobtype].users.push(user)
    }
  } else {
    jobInfo[jobtype] = {'runs': 1, 'users': [user]}
  }
}

function getJobParams (dir) {
  let jobDir = jobDataDir + '/' + dir
  let json = fs.readFileSync(jobDir + '/job_parameters.json')
  let jp = null
  try {
    jp = JSON.parse(json)
  } catch (err) {
    jp = {'user': 'unknown'}
  }
  return jp
}

jobDirs.forEach(function (v,idx) {
  let jp = getJobParams(v)
  addJobInfo(v, jp)
})

let jobs = Object.keys(jobInfo)
console.log('<html><head><title>Job Statistics</title></head><body><table><tr><th>Job Name</th><th># Runs</th><th># Users</th></tr>')
jobs.forEach(function (k) {
  console.log('<tr><td>' + k + '</td><td style="text-align:right;">' + jobInfo[k].runs + '</td><td style="text-align:right;">' + jobInfo[k].users.length + '</td></tr>')
  // jobInfo[k].users.forEach(function (u) {
  //   console.log('            ' + u)
  // })
})
console.log('</table></body></html>')
