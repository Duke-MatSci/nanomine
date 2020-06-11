const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chartBackupSchema = new Schema(
    {
        name: {
            type: String,
            required: true
        },
        backup: {
            type: String,
            required: true
        },
        creator: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
)

module.exports = mongoose.model('chartbackup', chartBackupSchema)