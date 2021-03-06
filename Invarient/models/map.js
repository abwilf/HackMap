const mongoose = require('mongoose');


var mapSchema = new mongoose.Schema(
{
    // REMEMBER ._id
    title: {
        type: String,
        required: true
    },
    data: {
        type: String,
        required: true
    },
    userEmail: {
    	type: String,
    	required: true
    },
    otherUsers: [{
        email: String,
        permission: String
    }]
},
{ 
    collection: 'maps2.0',
    usePushEach: true
}
);

var Map = mongoose.model('Map', mapSchema);
module.exports = Map;
