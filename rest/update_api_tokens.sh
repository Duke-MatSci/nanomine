#!/usr/bin/env bash
export REST_DIR=/apps/nanomine/rest

export tmpFile=$(mktemp)
echo $tmpFile
# remove the old tokens
sed -e 's/export NM_AUTH_SYSTEM_TOKEN.*//' /apps/nanomine_env |
sed -e 's/export NM_AUTH_API_TOKEN_CURATE.*//'   |
sed -e 's/export NM_AUTH_API_REFRESH_CURATE.*//' |
sed -e 's/export NM_AUTH_API_TOKEN_JOBS.*//'     |
sed -e 's/export NM_AUTH_API_REFRESH_JOBS.*//'   |
sed -e 's/export NM_AUTH_API_TOKEN_EMAIL.*//'    |
sed -e 's/export NM_AUTH_API_REFRESH_EMAIL.*//'  |
sed -e 's/export NM_AUTH_API_TOKEN_ADMIN.*//'    |
sed -e 's/export NM_AUTH_API_REFRESH_ADMIN.*//'  |
sed -r '/^\s*$/d' > $tmpFile  # GNU sed extension to remove blank lines

# create new tokens
cp $tmpFile /apps/nanomine_env
echo 'export NM_AUTH_SYSTEM_TOKEN="'$(/apps/nanomine/install/random.js)'"' >> /apps/nanomine_env
echo 'export NM_AUTH_API_TOKEN_CURATE="'$(node ${REST_DIR}/updateRestApiToken.js updateToken curate)'"' >> /apps/nanomine_env
echo 'export NM_AUTH_API_REFRESH_CURATE="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} curate)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken {USERID} curate' here
echo 'export NM_AUTH_API_TOKEN_JOBS="'$(node ${REST_DIR}/updateRestApiToken.js updateToken jobs)'"' >> /apps/nanomine_env # use token output from 'node /apps/nanomine/rest/updateRestApiToken.js updateToken jobs' here
echo 'export NM_AUTH_API_REFRESH_JOBS="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} jobs)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken {USERID} jobs' here
echo 'export NM_AUTH_API_TOKEN_EMAIL="'$(node ${REST_DIR}/updateRestApiToken.js updateToken email)'"' >> /apps/nanomine_env # use token output from '/updateRestApiToken.js updateToken email' here
echo 'export NM_AUTH_API_REFRESH_EMAIL="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} email)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} email' here
echo 'export NM_AUTH_API_TOKEN_ADMIN="'$(node ${REST_DIR}/updateRestApiToken.js updateToken admin)'"' >> /apps/nanomine_env # use token output from '/updateRestApiToken.js updateToken admin' here
echo 'export NM_AUTH_API_REFRESH_ADMIN="'$(node ${REST_DIR}/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} admin)'"' >> /apps/nanomine_env # use token output '/generateUserRefreshToken.js generateRefreshToken ${NM_AUTH_SYSTEM_USER_ID} admin' here
