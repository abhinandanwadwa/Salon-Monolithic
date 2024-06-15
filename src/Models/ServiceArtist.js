import mongoose from 'mongoose';

const ArtistService = new mongoose.Schema({
    Artist : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artist'
    },                                          
    Service : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
    },                                                                                                                                                                                                                      
    Price : {
        type: Number,
        required: true
    },
});

const ServiceArtist = mongoose.model('ServiceArtist', ArtistService);   
export default ServiceArtist;

