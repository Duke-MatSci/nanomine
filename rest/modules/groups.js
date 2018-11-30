
function isGroupMember(groupName, remoteUser) {
  let groups = [
    {'admins': ['adminuser']}
  ]
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      let rv = false
      groups.forEach(function (v) {
        if (v[groupName]) {
          let members = v[groupName]
          members.forEach(function (v2) {
            if (remoteUser === v2) {
              rv = true
            }
          })
        }
      })
      resolve(rv)
    }, 100)
  })
}

module.exports = {
  isGroupMember: isGroupMember
}
