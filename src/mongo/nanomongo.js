//NanoMine tools script for mongo

//listSchemas()
function listSchemas() {
  db = db.getSiblingDB('mgi');
  db.template
    .find()
    .forEach(function(doc) {
      print(doc.title+' '+doc._id);
    });
}
// Mongoose does not allow a field named 'schema', so swizzle the field named 'schema' to 'schemaId'.
// Note that there are functions below that still require the 'schema' field name and will be updated and tested with the new name.
//     So far, the name change was done, but not tested on the other functions below.
function swizzleForMongoose () {
  db = db.getSiblingDB('mgi');
  db.xmldata.updateMany({}, {$rename: { "schema": "schemaId" }})
}

// listXmlsForSchema(schemaName)
function listXmlsForSchema(schemaName) {
  db = db.getSiblingDB('mgi');
  var cur = db.template.find({'title':{$eq:schemaName}});
  if(cur.count() > 0) {
    var schemaId_ = cur[0]._id.valueOf();
    cur = db.xmldata
      .find({'schemaId':{ $eq: schemaId_}});
    if(cur.count() > 0) {
      cur.forEach(function(doc) {
        print('schema: ' + schemaName + ' (' + doc.schemaId + ') xml: ' + doc.title + ' (' + doc._id + ')');
      });
    } else {
      print('schema exists, but there are no curation xmls for schema: ' + schemaName);
    }
  } else {
    print('schema name not found.');
  }
}
function showXmlForSchema(schemaName, xmlName) {
  db = db.getSiblingDB('mgi')
  var cur = db.template.find({'title':{$eq: schemaName}});
  if(cur.count() > 0) {
    var schemaId_ = cur[0]._id.valueOf();
    cur = db.xmldata
      .find({'schemaId':{ $eq: schemaId_}});
    if(cur.count() > 0) {
      cur.forEach(function(doc) {
        print('schema: ' + schemaName + ' (' + doc.schemaId + ') xml: ' + doc.title + ' (' + doc._id + ')');
        print('     ' + doc.content);
      });
    } else {
      print('schema exists, but there are no curation xmls for schema: ' + schemaName);
    }
  } else {
    print('schema name not found.');
  }

}

// backupXmlsForSchema(schemaName)
//    Backup the xmls to a backup collection.
//    This effectively removes the copied XMLs from view in NanoMine, but
//       keeps the data around just in case.
//    Use deleteBackupXmls(schemaName) to delete the backup XMLs.
function backupXmlsForSchema(schemaName, afterFunction) {
  var ts = new Date().valueOf();
  db = db.getSiblingDB('mgi');
  var cur = db.template.find({'title':{$eq:schemaName}});
  if(cur.count() > 0) {
    var schemaId_ = cur[0]._id.valueOf();
    cur = db.xmldata
      .find({'schemaId':{ $eq: schemaId_}});
    if(cur.count() > 0) {
      var newCollection = 'backupxmldata_'+ts;
      var xmlCt = 0;
      cur.forEach(function(doc) {
        var newDoc = doc;
        newDoc.oldId = doc._id.valueOf();
        db[newCollection].insertOne(newDoc);
        ++xmlCt;
      });
      print('copied ' + xmlCt + ' xml records to collection: ' + newCollection);
    } else {
      print('schema exists, but there are no curation xmls for schema: ' + schemaName);
    }
  } else {
    print('schema name not found.');
  }

}
//removeAllXmlsForSchema(schemaName)
//   Removes all Xmls for a given schema by backing them up to a new collection and then removing them.
function removeAllXmlsForSchema(schemaName) {
  db = db.getSiblingDB('mgi');
  backupXmlsForSchema(schemaName);
  print('backup complete.');
  print('removing records from xmldata for schemaName: ' + schemaName);
  var cur = db.template.find({'title':{$eq:schemaName}});
  if(cur.count() > 0) {
    var schemaId_ = cur[0]._id.valueOf();
    var result = db.xmldata.remove(
      {	'schemaId': schemaId_ }
    );
    print('Results: ' + JSON.stringify(result));
  } else {
    print('schema name not found.');
  }
}

//restoreBackupXmls(backupName)
//  Restore all XMLs in the collection backupName to the xmldata collection
//    NOTE: If a record already exists, it will NOT be overwritten
function restoreBackupXmls(backupName) {
  db = db.getSiblingDB('mgi');
  var cur = db[backupName].find();
  if(cur.count() > 0) {
    while(cur.hasNext()) {
      var inrec = cur.next();
      var schema = inrec.schemaId;
      var id = inrec._id.valueOf();
      var c2 = db.xmldata.find({'schema':schemaId,_id:ObjectId(id)});
      var status = 'skipped...';
      if(c2.count() < 1) {
        db.xmldata.insert(inrec);
        status = 'restored...';
      }
      print('Input record schema: ' + schema + ' _id: ' + id + ' ' + status);
    }
  } else {
    print('backup collection: ' + backupName + ' does not exist or has no records.');
  }
}


