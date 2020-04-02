# Nanomine Gallery 

The following details uploading Schema & related files for Nanomine Gallery of Interactive Chart. 

## Start Here!

Download this repo. Change the folder name to any name of your choice. 


## Schema Thumb Image

Remove the image in the folder and replace it with your own image (png, jpg, etc). 


## Schema Resource File

This can be a .json or .csv file. Remove the attached nano.json resource file and replace it with the file the schema should point to.


## Schema Construct File

Open the schema-template.js file. Do the following:

```javascript
// Note:
// => +Provide a class name for the schema,
// => +Copy and Paste your schema into the returnSchema curly brace
// => +Replace the data property with the following
//     "data": {"values": this.data},

class SchemaName {
    constructor(args) {
        this.data = args;
        this.events();
    }

    events(){
        const returnSchema = { 
            // Remove Opening and Closing Curly Braces & Paste Your Vega Generated Schema Here.
            // Your Vega generated schema comes with its own curly braces
        }
        
        // Leave this line
        return returnSchema; 
    }
}
```

## Finally

Create a new branch with the name of the schema and upload to git.

## Contributing
Pull requests are welcome. For major changes, please contact [Mike Deagen](mailto:mike.deagen@gmail.com) or open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)