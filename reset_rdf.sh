#!/usr/bin/env bash
echo do not use this script!
exit
pushd /apps/whyis
echo "Clearing knowledge namespace"
curl -X DELETE http://localhost:8080/blazegraph/namespace/knowledge
echo "Setting required properties for knowledge namespace"
curl -X POST --data-binary @knowledge.properties -H 'Content-Type:text/plain' http://localhost:8080/blazegraph/namespace
echo "Clearing nanopublications working directory"
rm -rf /apps/nanomine-nanopubs/nanopublications/*
echo "Deleting file depot files"
rm -rf /apps/nanomine-data/files/*
echo "Stopping celeryd"
systemctl stop celeryd
#### echo "Restarting jetty8"
#### systemctl restart jetty8
echo "Flushing/deleting redis data"
redis-cli flushall
echo "Restarting apache2/whyis"
systemctl restart apache2
echo "NOTE: importing nanomine.ttl and xml_ingest.setl.ttl"
(su - whyis -c "cd whyis;python manage.py load -i /apps/nanomine/setl/nanomine.ttl -f turtle")
(su - whyis -c "cd whyis;python manage.py load -i /apps/nanomine/setl/xml_ingest.setl.ttl -f turtle")
echo "Restarting celeryd"
systemctl restart celeryd
#curl -X DELETE http://localhost:8080/blazegraph/namespace/admin
#curl -X POST --data-binary @admin.properties -H 'Content-Type:text/plain' http://localhost:8080/blazegraph/namespace
popd

