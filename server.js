const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const crypto = require("crypto");

const app = express();


// ======================================================
// CONFIGURATION
// ======================================================

const PORT =
    process.env.PORT || 3000;

const MONGODB_URI =
    process.env.MONGO_URI;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
    express.json({
        limit: "10mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// ======================================================
// SERVE FRONTEND FILES
// ======================================================

app.use(
    express.static(
        path.join(__dirname)
    )
);


// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "home.html"
        )
    );

});


// ======================================================
// /HOME
// ======================================================

app.get("/home", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "home.html"
        )
    );

});


// ======================================================
// MONGODB CONNECTION
// ======================================================

if (!MONGODB_URI) {

    console.error(
        "❌ MONGO_URI environment variable is missing."
    );

} else {

    mongoose
        .connect(
            MONGODB_URI,
            {
                serverSelectionTimeoutMS: 10000
            }
        )
        .then(() => {

            console.log(
                "✅ Connected to MongoDB"
            );

        })
        .catch(error => {

            console.error(
                "❌ MongoDB CONNECTION ERROR:",
                error
            );

        });

}


// ======================================================
// USER SCHEMA
// ======================================================

const userSchema =
    new mongoose.Schema({

        firstName: {
            type: String,
            required: true,
            trim: true
        },

        secondName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        dob: {
            type: String,
            required: true
        },

        nationality: {
            type: String,
            required: true,
            trim: true
        },

        /*
         * Kept as-is so existing accounts continue
         * working with your current login system.
         */
        password: {
            type: String,
            required: true
        },

        sessionToken: {
            type: String,
            default: null,
            index: true
        }

    }, {
        timestamps: true
    });


const User =
    mongoose.model(
        "User",
        userSchema
    );


// ======================================================
// TRIP SCHEMA
// ======================================================

const tripSchema =
    new mongoose.Schema({

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        destination: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
        },

        maxMembers: {
            type: Number,
            required: true,
            min: 1,
            max: 1000
        },

        tripType: {
            type: String,
            default: "Other",
            trim: true
        },

        image: {
            type: String,
            default: ""
        },

        description: {
            type: String,
            default: "",
            maxlength: 1000
        },

        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]

    }, {
        timestamps: true
    });


const Trip =
    mongoose.model(
        "Trip",
        tripSchema
    );


// ======================================================
// POST SCHEMA
// ======================================================

const postSchema =
    new mongoose.Schema({

        text: {
            type: String,
            default: "",
            trim: true,
            maxlength: 5000
        },

        /*
         * URL of image/video.
         *
         * Later we can connect this to Cloudinary
         * or another media storage provider.
         */
        mediaUrl: {
            type: String,
            default: ""
        },

        mediaType: {
            type: String,
            enum: [
                "image",
                "video",
                ""
            ],
            default: ""
        },

        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        comments: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },

                text: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 1000
                },

                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        shareCount: {
            type: Number,
            default: 0
        }

    }, {
        timestamps: true
    });


const Post =
    mongoose.model(
        "Post",
        postSchema
    );


// ======================================================
// AUTHENTICATION HELPER
// ======================================================

function getSessionToken(req) {

    const cookieHeader =
        req.headers.cookie || "";


    const cookies =
        cookieHeader
            .split(";")
            .map(cookie =>
                cookie.trim()
            );


    const sessionCookie =
        cookies.find(cookie =>
            cookie.startsWith(
                "tourismo_session="
            )
        );


    if (!sessionCookie) {

        return null;

    }


    return sessionCookie
        .split("=")
        .slice(1)
        .join("=");

}
// ======================================
// VIRTUAL TOUR MODEL
// ======================================

const virtualTourSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        location: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        description: {
            type: String,
            default: "",
            maxlength: 2000
        },

        image: {
            type: String,
            default: ""
        },

        image360: {
            type: String,
            default: ""
        },

        panoramaUrl: {
            type: String,
            default: ""
        },

        category: {
            type: String,
            default: "Other"
        },

        country: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const VirtualTour =
    mongoose.model(
        "VirtualTour",
        virtualTourSchema
    );

// ======================================
// GALLERY MODEL
// ======================================

const gallerySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        image: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            default: "",
            trim: true,
            maxlength: 150
        },

        category: {
            type: String,
            default: "Other",
            trim: true
        },

        country: {
            type: String,
            default: "",
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Gallery =
    mongoose.model(
        "Gallery",
        gallerySchema
    );
// ======================================================
// REQUIRE LOGIN
// ======================================================

async function requireLogin(
    req,
    res,
    next
) {

    try {

        const sessionToken =
            getSessionToken(req);


        if (!sessionToken) {

            return res.status(401).json({

                success: false,

                message:
                    "Please log in first."

            });

        }


        const user =
            await User.findOne({
                sessionToken
            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Your session has expired."

            });

        }


        req.user =
            user;

        req.userId =
            user._id;


        next();

    }

    catch (error) {

        console.error(
            "❌ AUTH ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Authentication error."

        });

    }

}
// ======================================
// WISHLIST MODEL
// ======================================

const wishlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 1000
        },

        image: {
            type: String,
            default: "",
            trim: true
        },

        location: {
            type: String,
            default: "",
            trim: true,
            maxlength: 150
        },

        category: {
            type: String,
            default: "Other",
            trim: true
        },

        country: {
            type: String,
            default: "",
            trim: true
        },

        // Optional reference to a virtual tour
        virtualTourId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VirtualTour",
            default: null
        }
    },
    {
        timestamps: true
    }
);


// Prevent the same user from
// saving the exact same virtual tour twice.
wishlistSchema.index(
    {
        user: 1,
        virtualTourId: 1
    },
    {
        unique: true,
        sparse: true
    }
);


const Wishlist =
    mongoose.model(
        "Wishlist",
        wishlistSchema
    );


// ======================================================
// USER RESPONSE HELPER
// ======================================================

function publicUser(user) {

    if (!user) {

        return null;

    }


    return {

        _id:
            user._id,

        firstName:
            user.firstName,

        secondName:
            user.secondName,

        email:
            user.email,

        phone:
            user.phone,

        dob:
            user.dob,

        nationality:
            user.nationality

    };

}


// ======================================================
// SIGNUP
// ======================================================

app.post(
    "/signup",
    async (req, res) => {

        try {

            console.log(
                "📥 SIGNUP REQUEST RECEIVED"
            );


            const {

                firstName,
                secondName,
                email,
                phone,
                dob,
                nationality,
                password

            } = req.body;


            if (
                !firstName ||
                !secondName ||
                !email ||
                !phone ||
                !dob ||
                !nationality ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All fields are required."

                });

            }


            const normalizedEmail =
                String(email)
                    .trim()
                    .toLowerCase();


            const existingUser =
                await User.findOne({
                    email:
                        normalizedEmail
                });


            if (existingUser) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This email is already registered."

                });

            }


            const sessionToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            const newUser =
                new User({

                    firstName:
                        String(firstName)
                            .trim(),

                    secondName:
                        String(secondName)
                            .trim(),

                    email:
                        normalizedEmail,

                    phone:
                        String(phone)
                            .trim(),

                    dob:
                        String(dob)
                            .trim(),

                    nationality:
                        String(nationality)
                            .trim(),

                    password,

                    sessionToken

                });


            await newUser.save();


            console.log(
                "✅ USER SAVED:",
                normalizedEmail
            );


            setSessionCookie(
                req,
                res,
                sessionToken
            );


            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully!",

                user:
                    publicUser(newUser)

            });

        }

        catch (error) {

            console.error(
                "❌ SIGNUP ERROR:",
                error
            );


            if (
                error.code === 11000
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This email is already registered."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Server error. Please try again."

            });

        }

    }
);


// ======================================================
// SESSION COOKIE
// ======================================================

function setSessionCookie(
    req,
    res,
    token
) {

    const isHttps =
        req.headers[
            "x-forwarded-proto"
        ] === "https" ||
        req.secure;


    let cookie =
        `tourismo_session=${token}; ` +
        `HttpOnly; ` +
        `Path=/; ` +
        `SameSite=Lax; ` +
        `Max-Age=604800`;


    if (isHttps) {

        cookie += "; Secure";

    }


    res.setHeader(
        "Set-Cookie",
        cookie
    );

}


// ======================================================
// LOGIN
// ======================================================

app.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            const normalizedEmail =
                String(email || "")
                    .trim()
                    .toLowerCase();


            if (
                !normalizedEmail ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required."

                });

            }


            const user =
                await User.findOne({
                    email:
                        normalizedEmail
                });


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email or password is incorrect."

                });

            }


            if (
                user.password !== password
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email or password is incorrect."

                });

            }


            const sessionToken =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            user.sessionToken =
                sessionToken;


            await user.save();


            setSessionCookie(
                req,
                res,
                sessionToken
            );


            console.log(
                "✅ LOGIN SUCCESS:",
                normalizedEmail
            );


            return res.json({

                success: true,

                message:
                    "Login successful!",

                user:
                    publicUser(user)

            });

        }

        catch (error) {

            console.error(
                "❌ LOGIN ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server error. Please try again."

            });

        }

    }
);


// ======================================================
// CURRENT USER
// ======================================================

app.get(
    "/me",
    requireLogin,
    async (req, res) => {

        return res.json({

            success: true,

            user:
                publicUser(req.user)

        });

    }
);


// ======================================================
// LOGOUT
// ======================================================

app.post(
    "/logout",
    async (req, res) => {

        try {

            const sessionToken =
                getSessionToken(req);


            if (sessionToken) {

                await User.updateOne(

                    {
                        sessionToken
                    },

                    {
                        $set: {
                            sessionToken:
                                null
                        }
                    }

                );

            }


            res.setHeader(
                "Set-Cookie",

                "tourismo_session=; " +
                "HttpOnly; " +
                "Path=/; " +
                "SameSite=Lax; " +
                "Max-Age=0"
            );


            return res.json({

                success: true,

                message:
                    "Logged out successfully."

            });

        }

        catch (error) {

            console.error(
                "❌ LOGOUT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to logout."

            });

        }

    }
);


// ======================================================
// ====================== TRIPS ==========================
// ======================================================


// ======================================================
// GET TRIPS
// ======================================================

app.get(
    "/trips",
    requireLogin,
    async (req, res) => {

        try {

            const trips =
                await Trip.find()
                    .populate(
                        "creator",
                        "firstName secondName email"
                    )
                    .populate(
                        "members",
                        "firstName secondName email"
                    )
                    .sort({
                        startDate: 1
                    });


            return res.json({

                success: true,

                trips

            });

        }

        catch (error) {

            console.error(
                "❌ GET TRIPS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load trips."

            });

        }

    }
);


// ======================================================
// CREATE TRIP
// ======================================================

app.post(
    "/trips",
    requireLogin,
    async (req, res) => {

        try {

            const {

                title,
                destination,
                startDate,
                endDate,
                maxMembers,
                tripType,
                image,
                description

            } = req.body;


            if (
                !title ||
                !destination ||
                !startDate ||
                !endDate ||
                !maxMembers
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Title, destination, dates and maximum travelers are required."

                });

            }


            const start =
                new Date(startDate);

            const end =
                new Date(endDate);


            if (
                Number.isNaN(
                    start.getTime()
                ) ||
                Number.isNaN(
                    end.getTime()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid trip dates."

                });

            }


            if (end < start) {

                return res.status(400).json({

                    success: false,

                    message:
                        "End date cannot be before the start date."

                });

            }


            const capacity =
                Number(maxMembers);


            if (
                !Number.isInteger(
                    capacity
                ) ||
                capacity < 1 ||
                capacity > 1000
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Maximum travelers must be between 1 and 1000."

                });

            }


            const trip =
                new Trip({

                    title:
                        String(title)
                            .trim(),

                    destination:
                        String(destination)
                            .trim(),

                    startDate:
                        start,

                    endDate:
                        end,

                    maxMembers:
                        capacity,

                    tripType:
                        String(
                            tripType ||
                            "Other"
                        ).trim(),

                    image:
                        String(
                            image ||
                            ""
                        ).trim(),

                    description:
                        String(
                            description ||
                            ""
                        ).trim(),

                    creator:
                        req.userId,

                    members: [
                        req.userId
                    ]

                });


            await trip.save();


            await trip.populate(
                "creator",
                "firstName secondName email"
            );


            await trip.populate(
                "members",
                "firstName secondName email"
            );


            console.log(
                "✅ TRIP CREATED:",
                trip._id
            );


            return res.status(201).json({

                success: true,

                message:
                    "Trip created successfully.",

                trip

            });

        }

        catch (error) {

            console.error(
                "❌ CREATE TRIP ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to create trip."

            });

        }

    }
);


// ======================================================
// GET ONE TRIP
// ======================================================

app.get(
    "/trips/:id",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid trip ID."

                });

            }


            const trip =
                await Trip.findById(
                    req.params.id
                )
                .populate(
                    "creator",
                    "firstName secondName email"
                )
                .populate(
                    "members",
                    "firstName secondName email"
                );


            if (!trip) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Trip not found."

                });

            }


            return res.json({

                success: true,

                trip

            });

        }

        catch (error) {

            console.error(
                "❌ GET TRIP ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load trip."

            });

        }

    }
);


// ======================================================
// JOIN TRIP
// ======================================================

app.post(
    "/trips/:id/join",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid trip ID."

                });

            }


            const trip =
                await Trip.findById(
                    req.params.id
                );


            if (!trip) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Trip not found."

                });

            }


            const alreadyJoined =
                trip.members.some(
                    memberId =>
                        String(memberId) ===
                        String(req.userId)
                );


            if (alreadyJoined) {

                return res.status(400).json({

                    success: false,

                    message:
                        "You have already joined this trip."

                });

            }


            if (
                trip.members.length >=
                trip.maxMembers
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This trip is already full."

                });

            }


            trip.members.push(
                req.userId
            );


            await trip.save();


            await trip.populate(
                "creator",
                "firstName secondName email"
            );


            await trip.populate(
                "members",
                "firstName secondName email"
            );


            return res.json({

                success: true,

                message:
                    "You joined the trip.",

                trip

            });

        }

        catch (error) {

            console.error(
                "❌ JOIN TRIP ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to join trip."

            });

        }

    }
);


// ======================================================
// LEAVE TRIP
// ======================================================

app.post(
    "/trips/:id/leave",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid trip ID."

                });

            }


            const trip =
                await Trip.findById(
                    req.params.id
                );


            if (!trip) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Trip not found."

                });

            }


            if (
                String(trip.creator) ===
                String(req.userId)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "The trip creator cannot leave their own trip."

                });

            }


            trip.members =
                trip.members.filter(
                    memberId =>
                        String(memberId) !==
                        String(req.userId)
                );


            await trip.save();


            await trip.populate(
                "creator",
                "firstName secondName email"
            );


            await trip.populate(
                "members",
                "firstName secondName email"
            );


            return res.json({

                success: true,

                message:
                    "You left the trip.",

                trip

            });

        }

        catch (error) {

            console.error(
                "❌ LEAVE TRIP ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to leave trip."

            });

        }

    }
);


// ======================================================
// ====================== POSTS ==========================
// ======================================================


// ======================================================
// GET POSTS
// ======================================================

app.get(
    "/posts",
    requireLogin,
    async (req, res) => {

        try {

            const posts =
                await Post.find()
                    .populate(
                        "author",
                        "firstName secondName email"
                    )
                    .populate(
                        "comments.user",
                        "firstName secondName email"
                    )
                    .sort({
                        createdAt: -1
                    });


            return res.json({

                success: true,

                posts

            });

        }

        catch (error) {

            console.error(
                "❌ GET POSTS ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load posts."

            });

        }

    }
);


// ======================================================
// GET ONE POST
// ======================================================

app.get(
    "/posts/:id",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid post ID."

                });

            }


            const post =
                await Post.findById(
                    req.params.id
                )
                .populate(
                    "author",
                    "firstName secondName email"
                )
                .populate(
                    "comments.user",
                    "firstName secondName email"
                );


            if (!post) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Post not found."

                });

            }


            return res.json({

                success: true,

                post

            });

        }

        catch (error) {

            console.error(
                "❌ GET POST ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load post."

            });

        }

    }
);


// ======================================================
// CREATE POST
// ======================================================

app.post(
    "/posts",
    requireLogin,
    async (req, res) => {

        try {

            const {

                text,
                mediaUrl,
                mediaType

            } = req.body;


            const cleanText =
                String(
                    text || ""
                ).trim();


            const cleanMediaUrl =
                String(
                    mediaUrl || ""
                ).trim();


            const cleanMediaType =
                String(
                    mediaType || ""
                ).trim()
                .toLowerCase();


            if (
                !cleanText &&
                !cleanMediaUrl
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A post must contain text or media."

                });

            }


            if (
                cleanMediaType &&
                ![
                    "image",
                    "video"
                ].includes(
                    cleanMediaType
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid media type."

                });

            }


            const post =
                new Post({

                    text:
                        cleanText,

                    mediaUrl:
                        cleanMediaUrl,

                    mediaType:
                        cleanMediaType,

                    author:
                        req.userId

                });


            await post.save();


            await post.populate(
                "author",
                "firstName secondName email"
            );


            console.log(
                "✅ POST CREATED:",
                post._id
            );


            return res.status(201).json({

                success: true,

                message:
                    "Post created successfully.",

                post

            });

        }

        catch (error) {

            console.error(
                "❌ CREATE POST ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to create post."

            });

        }

    }
);


// ======================================================
// LIKE / UNLIKE POST
// ======================================================

app.post(
    "/posts/:id/like",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid post ID."

                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Post not found."

                });

            }


            const userId =
                String(req.userId);


            const existingIndex =
                post.likes.findIndex(
                    id =>
                        String(id) ===
                        userId
                );


            let liked;


            if (
                existingIndex === -1
            ) {

                post.likes.push(
                    req.userId
                );

                liked = true;

            }

            else {

                post.likes.splice(
                    existingIndex,
                    1
                );

                liked = false;

            }


            await post.save();


            return res.json({

                success: true,

                liked,

                likeCount:
                    post.likes.length

            });

        }

        catch (error) {

            console.error(
                "❌ LIKE ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to update like."

            });

        }

    }
);


// ======================================================
// ADD COMMENT
// ======================================================

app.post(
    "/posts/:id/comments",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid post ID."

                });

            }


            const text =
                String(
                    req.body.text || ""
                ).trim();


            if (!text) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Comment cannot be empty."

                });

            }


            if (text.length > 1000) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Comment is too long."

                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Post not found."

                });

            }


            post.comments.push({

                user:
                    req.userId,

                text,

                createdAt:
                    new Date()

            });


            await post.save();


            await post.populate(
                "comments.user",
                "firstName secondName email"
            );


            const newComment =
                post.comments[
                    post.comments.length - 1
                ];


            return res.status(201).json({

                success: true,

                message:
                    "Comment added.",

                comment: {

                    _id:
                        newComment._id,

                    user:
                        newComment.user,

                    text:
                        newComment.text,

                    createdAt:
                        newComment.createdAt

                },

                commentCount:
                    post.comments.length

            });

        }

        catch (error) {

            console.error(
                "❌ COMMENT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to add comment."

            });

        }

    }
);


// ======================================================
// SHARE POST
// ======================================================

app.post(
    "/posts/:id/share",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid post ID."

                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Post not found."

                });

            }


            post.shareCount += 1;


            await post.save();


            return res.json({

                success: true,

                shareCount:
                    post.shareCount

            });

        }

        catch (error) {

            console.error(
                "❌ SHARE ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to share post."

            });

        }

    }
);


// ======================================================
// DELETE POST
// ======================================================

app.delete(
    "/posts/:id",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid post ID."

                });

            }


            const post =
                await Post.findById(
                    req.params.id
                );


            if (!post) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Post not found."

                });

            }


            if (
                String(post.author) !==
                String(req.userId)
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You can only delete your own posts."

                });

            }


            await Post.findByIdAndDelete(
                req.params.id
            );


            return res.json({

                success: true,

                message:
                    "Post deleted successfully."

            });

        }

        catch (error) {

            console.error(
                "❌ DELETE POST ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete post."

            });

        }

    }
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
    "/api/health",
    async (req, res) => {

        const database =
            mongoose.connection.readyState;


        return res.json({

            success: true,

            server:
                "online",

            database:
                database === 1
                    ? "connected"
                    : "disconnected"

        });

    }
);



// ======================================
// GET VIRTUAL TOURS
// ======================================

app.get("/api/virtual-tours", async (req, res) => {

    try {

        const tours =
            await VirtualTour
                .find({})
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.json({

            success: true,

            tours: tours

        });

    }

    catch (error) {

        console.error(
            "❌ VIRTUAL TOURS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load virtual tours."

        });

    }

});
// ======================================
// ======================================
// CREATE VIRTUAL TOUR
// ======================================

app.post("/api/virtual-tours", async (req, res) => {

    try {

        const {
            title,
            location,
            description,
            image,
            image360,
            panoramaUrl,
            category,
            country
        } = req.body;


        if (
            !title ||
            !location
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Title and location are required."

            });

        }


        const tour =
            await VirtualTour.create({

                title:
                    String(title).trim(),

                location:
                    String(location).trim(),

                description:
                    String(
                        description || ""
                    ).trim(),

                image:
                    String(
                        image || ""
                    ).trim(),

                image360:
                    String(
                        image360 || ""
                    ).trim(),

                panoramaUrl:
                    String(
                        panoramaUrl || ""
                    ).trim(),

                category:
                    String(
                        category || "Other"
                    ).trim(),

                country:
                    String(
                        country || ""
                    ).trim()

            });


        return res.status(201).json({

            success: true,

            message:
                "Virtual tour created successfully.",

            tour:
                tour

        });

    }

    catch (error) {

        console.error(
            "❌ CREATE VIRTUAL TOUR ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to create virtual tour."

        });

    }

});
// ======================================
// GET ALL GALLERY ITEMS
// ======================================

app.get("/api/gallery", async (req, res) => {

    try {

        const gallery =
            await Gallery
                .find({})
                .sort({
                    createdAt: -1
                })
                .lean();

        return res.json({
            success: true,
            gallery: gallery
        });

    }

    catch (error) {

        console.error(
            "❌ GET GALLERY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load gallery."
        });

    }

});
// ======================================
// GET ONE GALLERY ITEM
// =====================================

app.get("/api/gallery/:id", async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid gallery ID."

            });

        }


        const galleryItem =
            await Gallery.findById(
                req.params.id
            ).lean();


        if (!galleryItem) {

            return res.status(404).json({

                success: false,

                message:
                    "Gallery item not found."

            });

        }


        return res.json({

            success: true,

            gallery:
                galleryItem

        });

    }

    catch (error) {

        console.error(
            "❌ GET GALLERY ITEM ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load gallery item."

        });

    }

});


// ======================================
// UPDATE GALLERY ITEM
// ======================================

app.put("/api/gallery/:id", async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid gallery ID."

            });

        }


        const {
            title,
            description,
            image,
            location,
            category,
            country
        } = req.body;


        const galleryItem =
            await Gallery.findByIdAndUpdate(

                req.params.id,

                {
                    title:
                        title !== undefined
                            ? String(title).trim()
                            : undefined,

                    description:
                        description !== undefined
                            ? String(description).trim()
                            : undefined,

                    image:
                        image !== undefined
                            ? String(image).trim()
                            : undefined,

                    location:
                        location !== undefined
                            ? String(location).trim()
                            : undefined,

                    category:
                        category !== undefined
                            ? String(category).trim()
                            : undefined,

                    country:
                        country !== undefined
                            ? String(country).trim()
                            : undefined
                },

                {
                    new: true,
                    runValidators: true
                }
            );


        if (!galleryItem) {

            return res.status(404).json({

                success: false,

                message:
                    "Gallery item not found."

            });

        }


        return res.json({

            success: true,

            message:
                "Gallery item updated successfully.",

            gallery:
                galleryItem

        });

    }

    catch (error) {

        console.error(
            "❌ UPDATE GALLERY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to update gallery item."

        });

    }

});


// ======================================
// DELETE GALLERY ITEM
// ======================================

app.delete("/api/gallery/:id", async (req, res) => {

    try {

        if (
            !mongoose.Types.ObjectId.isValid(
                req.params.id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid gallery ID."

            });

        }


        const galleryItem =
            await Gallery.findByIdAndDelete(
                req.params.id
            );


        if (!galleryItem) {

            return res.status(404).json({

                success: false,

                message:
                    "Gallery item not found."

            });

        }


        return res.json({

            success: true,

            message:
                "Gallery item deleted successfully."

        });

    }

    catch (error) {

        console.error(
            "❌ DELETE GALLERY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to delete gallery item."

        });

    }

});
// ======================================
// GET USER WISHLIST
// ======================================

app.get(
    "/api/wishlist",
    requireLogin,
    async (req, res) => {

        try {

            const wishlist =
                await Wishlist
                    .find({
                        user: req.userId
                    })
                    .sort({
                        createdAt: -1
                    })
                    .lean();


            return res.json({

                success: true,

                wishlist

            });

        }

        catch (error) {

            console.error(
                "❌ GET WISHLIST ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load wishlist."

            });

        }

    }
);


// ======================================
// ADD TO WISHLIST
// ======================================

app.post(
    "/api/wishlist",
    requireLogin,
    async (req, res) => {

        try {

            const {
                title,
                description,
                image,
                location,
                category,
                country,
                virtualTourId
            } = req.body;


            if (!title) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Title is required."

                });

            }


            // If a virtual tour ID is supplied,
            // make sure it is valid.
            if (
                virtualTourId &&
                !mongoose.Types.ObjectId.isValid(
                    virtualTourId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid virtual tour ID."

                });

            }


            // Prevent duplicate wishlist entries.
            if (virtualTourId) {

                const existing =
                    await Wishlist.findOne({

                        user:
                            req.userId,

                        virtualTourId

                    });


                if (existing) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "This destination is already in your wishlist.",

                        wishlist:
                            existing

                    });

                }

            }


            const wishlistItem =
                await Wishlist.create({

                    user:
                        req.userId,

                    title:
                        String(title)
                            .trim(),

                    description:
                        String(
                            description || ""
                        ).trim(),

                    image:
                        String(
                            image || ""
                        ).trim(),

                    location:
                        String(
                            location || ""
                        ).trim(),

                    category:
                        String(
                            category || "Other"
                        ).trim(),

                    country:
                        String(
                            country || ""
                        ).trim(),

                    virtualTourId:
                        virtualTourId || null

                });


            return res.status(201).json({

                success: true,

                message:
                    "Added to wishlist.",

                wishlist:
                    wishlistItem

            });

        }

        catch (error) {

            console.error(
                "❌ ADD WISHLIST ERROR:",
                error
            );


            // Handle MongoDB duplicate-key error.
            if (
                error.code === 11000
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This destination is already in your wishlist."

                });

            }


            return res.status(500).json({

                success: false,

                message:
                    "Unable to add destination to wishlist."

            });

        }

    }
);


// ======================================
// GET ONE WISHLIST ITEM
// ======================================

app.get(
    "/api/wishlist/:id",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid wishlist ID."

                });

            }


            const wishlistItem =
                await Wishlist.findOne({

                    _id:
                        req.params.id,

                    user:
                        req.userId

                }).lean();


            if (!wishlistItem) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Wishlist item not found."

                });

            }


            return res.json({

                success: true,

                wishlist:
                    wishlistItem

            });

        }

        catch (error) {

            console.error(
                "❌ GET WISHLIST ITEM ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to load wishlist item."

            });

        }

    }
);


// ======================================
// REMOVE FROM WISHLIST
// ======================================

app.delete(
    "/api/wishlist/:id",
    requireLogin,
    async (req, res) => {

        try {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.params.id
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid wishlist ID."

                });

            }


            const wishlistItem =
                await Wishlist.findOneAndDelete({

                    _id:
                        req.params.id,

                    user:
                        req.userId

                });


            if (!wishlistItem) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Wishlist item not found."

                });

            }


            return res.json({

                success: true,

                message:
                    "Removed from wishlist."

            });

        }

        catch (error) {

            console.error(
                "❌ DELETE WISHLIST ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to remove wishlist item."

            });

        }

    }
);
// ======================================================
// 404
// ======================================================

app.use(
    (req, res) => {

        /*
         * Return JSON for API requests.
         */

        if (
            req.path.startsWith(
                "/posts"
            ) ||
            req.path.startsWith(
                "/trips"
            ) ||
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "API endpoint not found."

            });

        }


        res.status(404).send(
            "Page not found."
        );

    }
);


// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "❌ UNHANDLED SERVER ERROR:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(error);

        }


        res.status(500).json({

            success: false,

            message:
                "Internal server error."

        });

    }
);
// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 Tourismo Server running on port ${PORT}`
        );

        console.log(
            `🌍 Server listening on port ${PORT}`
        );

    }
);