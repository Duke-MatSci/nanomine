#!/usr/bin/env bash
source /apps/nanomine_env
echo "$0 environment $(env)"
/apps/nanomine/install/mongoSetupAdminUser
/apps/nanomine/install/mongoSetupApiUser
/apps/nanomine/install/mongoSetupOwnerUser

