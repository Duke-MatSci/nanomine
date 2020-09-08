const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chartTagSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        uri: {
            type: String,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('charttag', chartTagSchema)