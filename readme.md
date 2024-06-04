APIs:

AUTH API : 
1.  @desc Send OTP to the user
    @route POST /api/auth/send-otp
    @access Public
    @request { phoneNumber, role }

2.  @desc Verify OTP
    @route POST /api/auth/verify-otp
    @access Public
    @request { phoneNumber, enteredOTP }
    @response { _id, phoneNumber, role }

3.  @desc Change Role
    @route POST /api/auth/changeRole
    @access Private
    @request { artists }

4.  @desc Logout
    @route POST /api/auth/logout
    @access Private

Salon Api :

1.  @desc Create a new salon
    @method POST
    @route /api/salon/create-salon
    @access Private
    @requestBody { SalonName: String, OwnerName: String, BusinessType: String, Gender: String, workingDays: [String], startTime: String, endTime: String, location: { type: String, coordinates: [Number] }, CoverImage: String, StorePhotos: [String], Brochure: String , Address: { Address1: String, Address2: String, Landmark: String, Pincode: Number, City: String, State: String Country: String}}

2.  @desc Update salon
    @method PUT
    @route /api/salon/update-salon
    @access Private
    @requestBody { salonName: String, ownerName: String, ShopPhoneNumber: Number, location: { type: String, coordinates: [Number] }, workingDays: [String], startTime: String, endTime: String, Insta: String, Facebook: String }

3.  @desc Get salon by location
    @method POST
    @route /api/salon/getSalon
    @access Public
    @requestBody { latitude: Number, longitude: Number }
    @response { Salon }

4.  @desc Get salon by ID
    @method GET
    @route /api/salon/getSalon/:id
    @access Public
    @request { id }

5.  @desc Get salon by owner
    @method GET
    @route /api/salon/get-owner-salon
    @access Private
    @request None

6.  @desc Search salons
    @method POST
    @route /api/salon/search-salons
    @access Public
    @requestBody { service: String, address: String, location: { latitude: Number, longitude: Number } }
    @response { Salon }
 
7.   * @desc Upload salon brochure
 * @method POST
 * @route /api/salon/upload-brochure
 * @access Private
 * @requestBody { Brochure: String }

8.  * @desc Delete salon
 * @method DELETE
 * @route /api/salon/delete-salon
 * @access Private
 * @request None

9.  * @desc Add photos to salon
 * @method POST
 * @route /api/salon/add-photos
 * @access Private
 * @requestBody { coverPhoto: String, ProfilePhotos: [String] }


Artist APIs:

1.  * @desc Create an artist with all services
 * @method POST
 * @route /api/artist/create-artist-with-services
 * @access Private
 * @requestBody { artistData: Array }
 * @requestBodyExample { artistData: [{ ArtistName: String, PhoneNumber: Number, ArtistType: String, workingDays: Array of Strings, startTime: String, endTime: String, ArtistPhoto: String }] }

2.  * @desc Create Artists
 * @method POST
 * @access Private
 * @route /api/artist/create-artists
 * @requestBody { artistsData: [ { ArtistName: String, PhoneNumber: Number, ArtistType: String, workingDays: Array of Strings, startTime: String, endTime: String, ArtistPhoto: String, services: Array of Strings } ] }

3. /**
 * @desc Update Artist
 * @method PUT
 * @access Private
 * @route /api/artist/update-artist/:artistId
 * @requestBody { name: String, phoneNumber: Number, workingDays: Array of Strings, services: Array of Strings }

 
4.  * @desc Delete Artist
 * @method DELETE
 * @access Private
 * @route /api/artist/delete-artist/:artistId
 * @requestParams { artistId: String }

5.  * @desc Get Artists by Salon
 * @method GET
 * @access Private
 * @route /api/artist/get-artists-by-salon

6.  * @desc Get Artists by Service
 * @method POST
 * @access Public
 * @route /api/artist/get-artist-by-service
 * @requestBody { serviceIds: Array of Strings }
 * @requestParams { salonid: String }


Services API:

1.  * @desc Create services
 * @method POST
 * @route /api/services/create-services
 * @access Private
 * @requestBody { servicesData: [ { ServiceName, ServiceType, ServiceCost, ServiceTime, ServiceGender } ] }

2.  * @desc Update services
 * @method PUT
 * @route /api/services/update-service/:serviceId
 * @access Private
 * @requestBody { ServiceName, ServiceType, ServiceCost, ServiceTime, ServiceGender }

3.  * @desc Delete service
 * @method DELETE
 * @route /api/services/delete-service/:serviceId
 * @access Private
 * @requestParams { serviceId: String }

4.  * @desc Get services
 * @method GET
 * @route /api/services/get-services/:SalonId
 * @access Public
 * @requestParams { SalonId: String }


Offer API :

1.  * @desc Create Offer
 * @method POST
 * @route /api/offer/create-offer
 * @access Private
 * @requestBody {
 *   OfferName: String,
 *   OfferStartDate: Date,
 *   OfferEndDate: Date,
 *   OfferDiscountinRuppees: Number,
 *   OfferDiscountinPercentage: Number,
 *   OfferDescription: String,
 *   OfferDays: Array of Strings
 * }

2.  * @desc Get Offers
 * @method GET
 * @route /api/offer/get
 * @access Private
 * @request None

3.  * @desc Delete Offer
 * @method DELETE
 * @route /api/offer/delete/:offerId
 * @access Private
 * @requestParams { offerId: String }

4. * @desc Validate Offer
 * @method POST
 * @route /api/offer/validate
 * @access Public
 * @requestBody { offerName: String }
 * @requestParams { salonId: String }


Appointment API :

1.  * @desc Get Time Slots
 * @route POST /api/appointments/get-time-slots
 * @access Public
 * @request { artistId, timePeriod }
 * @response { slots }
 * @errors Artist not found

2.  * @desc Create Appointment By Owner
 * @route POST /api/appointments/create-appointment
 * @access Public
 * @request { artistId, appointmentDate, appointmentStartTime, appointmentEndTime, name, phoneNumber }
 */

3.  * @desc Create Appointment Lock
 * @route POST /api/appointments/create-appointment-lock
 * @access Public
 * @request { artistId, appointmentDate, appointmentStartTime, appointmentEndTime }

4.  * @desc Book Appointment
 * @route POST /api/appointments/book-appointment
 * @access Public
 * @params { appointmentId }
 * @request { appointmentCost }
 * @response { message }