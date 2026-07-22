// ======================================
// TOURISMO SERVER
// ======================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const path = require("path");

const app = express();


// ======================================
// MIDDLEWARE
// ======================================

app.use(express.json());

app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(express.static(__dirname));


// ======================================
// DATABASE
// ======================================

mongoose.connect(process.env.MONGO_URI)

.then(()=>{

    console.log("✅ MongoDB connected");

})

.catch(err=>{

    console.error("❌ MongoDB Error:",err);

});


// ======================================
// SESSION
// ======================================

app.use(
session({

    secret: process.env.SESSION_SECRET || "tourismo_secret",

    resave:false,

    saveUninitialized:false,


    store:MongoStore.create({

        mongoUrl:process.env.MONGO_URI

    }),


    cookie:{

        httpOnly:true,

        maxAge:1000*60*60*24,

        secure:false,

        sameSite:"lax"

    }


})
);



// ======================================
// USER MODEL
// ======================================

const userSchema = new mongoose.Schema({

    firstName:{
        type:String,
        required:true
    },


    secondName:{
        type:String,
        required:true
    },


    email:{
        type:String,
        required:true,
        unique:true
    },


    phone:{
        type:String,
        required:true
    },


    dob:{
        type:String,
        required:true
    },


    nationality:{
        type:String,
        required:true
    },


    password:{
        type:String,
        required:true
    },


    verified:{
        type:Boolean,
        default:false
    },


    verificationToken:{
        type:String,
        default:""
    }


},

{
    timestamps:true
});


const User = mongoose.model(
    "User",
    userSchema
);



// ======================================
// EMAIL SETUP (WORKING VERSION)
// ======================================

const transporter = nodemailer.createTransport({

    service:"gmail",

    auth:{

        user:process.env.EMAIL_USER,

        pass:process.env.EMAIL_PASS

    }

});


transporter.verify((error)=>{

    if(error){

        console.log("❌ SMTP ERROR:",error);

    }

    else{

        console.log("✅ Email server ready");

    }

});



// ======================================
// LOGIN CHECK
// ======================================

function requireLogin(req,res,next){


    if(!req.session.userId){


        return res.status(401).json({

            success:false,

            message:"Please login first"

        });

    }


    next();

}



// ======================================
// PAGES
// ======================================


app.get("/",(req,res)=>{


    if(req.session.userId){

        return res.redirect("/home");

    }


    res.sendFile(
        path.join(__dirname,"login.html")
    );


});



app.get("/login",(req,res)=>{


    res.sendFile(
        path.join(__dirname,"login.html")
    );

});



app.get("/signup",(req,res)=>{


    res.sendFile(
        path.join(__dirname,"signup.html")
    );

});



app.get("/home",
requireLogin,
(req,res)=>{


    res.sendFile(
        path.join(__dirname,"home.html")
    );


});



// ======================================
// SIGNUP
// ======================================


app.post("/signup",async(req,res)=>{


console.log("📥 SIGNUP REQUEST RECEIVED");


try{


const {

firstName,

secondName,

email,

phone,

dob,

nationality,

password


}=req.body;



if(
!firstName ||
!secondName ||
!email ||
!phone ||
!dob ||
!nationality ||
!password

){


return res.status(400).json({

success:false,

message:"All fields are required"

});


}



const existingUser =
await User.findOne({email});



if(existingUser){


return res.status(400).json({

success:false,

message:"Email already exists"

});


}



const hashedPassword =
await bcrypt.hash(password,12);



const verificationToken =
crypto.randomBytes(32)
.toString("hex");



const user = new User({

firstName,

secondName,

email,

phone,

dob,

nationality,

password:hashedPassword,

verified:false,

verificationToken


});



await user.save();



console.log(
"✅ USER SAVED:",
email
);



const verificationLink =

`${process.env.SERVER_URL}/verify/${verificationToken}`;



const mailOptions={


from:process.env.EMAIL_USER,


to:email,


subject:"Verify your Tourismo Account",


html:`

<h2>Welcome to Tourismo</h2>

<p>Hello ${firstName}</p>

<p>Click the link below to verify your account:</p>

<a href="${verificationLink}">
${verificationLink}
</a>

`

};



transporter.sendMail(
mailOptions,
(err)=>{


if(err){

console.log(
"❌ EMAIL ERROR:",
err
);


return res.status(500).json({

success:false,

message:"Failed to send verification email"

});


}



res.json({

success:true,

message:"Verification email sent. Check your inbox."

});


});


}


catch(err){


console.error(
"❌ SIGNUP ERROR:",
err
);



res.status(500).json({

success:false,

message:"Server Error"

});


}


});
// ======================================
// VERIFY EMAIL
// ======================================


app.get("/verify/:token", async(req,res)=>{


try{


const user = await User.findOne({

verificationToken:req.params.token

});



if(!user){


return res.send(`

<h2>Invalid or expired verification link.</h2>

`);

}



user.verified=true;

user.verificationToken="";


await user.save();



res.redirect("/login.html?verified=true");



}


catch(err){


console.error(
"❌ VERIFY ERROR:",
err
);


res.status(500).send(

"Server Error"

);


}


});




// ======================================
// LOGIN
// ======================================


app.post("/login",async(req,res)=>{


try{


const {

email,

password

}=req.body;



console.log(
"🔑 LOGIN:",
email
);



const user =
await User.findOne({email});



if(!user){


return res.status(404).json({

success:false,

message:"Account not found"

});


}



if(!user.verified){


return res.status(403).json({

success:false,

message:"Please verify your email first"

});


}



const passwordCorrect =

await bcrypt.compare(

password,

user.password

);



if(!passwordCorrect){


return res.status(401).json({

success:false,

message:"Incorrect email or password"

});


}




req.session.userId=user._id;

req.session.userName=user.firstName;

req.session.email=user.email;



res.json({

success:true,

message:"Login successful",

redirect:"/home"

});


}



catch(err){


console.error(
"❌ LOGIN ERROR:",
err
);



res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// CURRENT USER
// ======================================


app.get("/me",
requireLogin,
async(req,res)=>{


try{


const user = await User.findById(

req.session.userId

)

.select("-password -verificationToken");



if(!user){


return res.status(404).json({

success:false,

message:"User not found"

});


}



res.json(user);



}



catch(err){


console.error(err);


res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// LOGOUT
// ======================================


app.post("/logout",
(req,res)=>{


req.session.destroy(err=>{


if(err){


return res.status(500).json({

success:false,

message:"Logout failed"

});


}



res.clearCookie(
"connect.sid"
);



res.json({

success:true,

message:"Logged out"

});


});


});





// ======================================
// PROFILE
// ======================================


app.get("/profile",
requireLogin,
async(req,res)=>{


try{


const user =
await User.findById(

req.session.userId

)

.select("-password -verificationToken");



res.json({

success:true,

user

});


}



catch(err){


console.error(err);


res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// UPDATE PROFILE
// ======================================


app.put("/profile",
requireLogin,
async(req,res)=>{


try{


const {

firstName,

secondName,

phone,

dob,

nationality


}=req.body;



const user =
await User.findById(

req.session.userId

);



if(!user){


return res.status(404).json({

success:false,

message:"User not found"

});


}



user.firstName=firstName;

user.secondName=secondName;

user.phone=phone;

user.dob=dob;

user.nationality=nationality;



await user.save();



res.json({

success:true,

message:"Profile updated",

user

});


}



catch(err){


console.error(err);


res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// PROTECTED PAGES
// ======================================


app.get("/explore",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"explore.html"
)

);


});



app.get("/messages",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"messages.html"
)

);


});



app.get("/bookings",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"bookings.html"
)

);


});



app.get("/profile-page",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"profile.html"
)

);


});





// ======================================
// 404
// ======================================


app.use((req,res)=>{


res.status(404).send(

"<h2>404 - Page Not Found</h2>"

);


});





// ======================================
// START SERVER
// ======================================


const PORT =
process.env.PORT || 3000;



app.listen(PORT,()=>{


console.log(

`✅ Tourismo Server running on port ${PORT}`

);


});// ======================================
// VERIFY EMAIL
// ======================================


app.get("/verify/:token", async(req,res)=>{


try{


const user = await User.findOne({

verificationToken:req.params.token

});



if(!user){


return res.send(`

<h2>Invalid or expired verification link.</h2>

`);

}



user.verified=true;

user.verificationToken="";


await user.save();



res.redirect("/login.html?verified=true");



}


catch(err){


console.error(
"❌ VERIFY ERROR:",
err
);


res.status(500).send(

"Server Error"

);


}


});




// ======================================
// LOGIN
// ======================================


app.post("/login",async(req,res)=>{


try{


const {

email,

password

}=req.body;



console.log(
"🔑 LOGIN:",
email
);



const user =
await User.findOne({email});



if(!user){


return res.status(404).json({

success:false,

message:"Account not found"

});


}



if(!user.verified){


return res.status(403).json({

success:false,

message:"Please verify your email first"

});


}



const passwordCorrect =

await bcrypt.compare(

password,

user.password

);



if(!passwordCorrect){


return res.status(401).json({

success:false,

message:"Incorrect email or password"

});


}




req.session.userId=user._id;

req.session.userName=user.firstName;

req.session.email=user.email;



res.json({

success:true,

message:"Login successful",

redirect:"/home"

});


}



catch(err){


console.error(
"❌ LOGIN ERROR:",
err
);



res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// CURRENT USER
// ======================================


app.get("/me",
requireLogin,
async(req,res)=>{


try{


const user = await User.findById(

req.session.userId

)

.select("-password -verificationToken");



if(!user){


return res.status(404).json({

success:false,

message:"User not found"

});


}



res.json(user);



}



catch(err){


console.error(err);


res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// LOGOUT
// ======================================


app.post("/logout",
(req,res)=>{


req.session.destroy(err=>{


if(err){


return res.status(500).json({

success:false,

message:"Logout failed"

});


}



res.clearCookie(
"connect.sid"
);



res.json({

success:true,

message:"Logged out"

});


});


});





// ======================================
// PROFILE
// ======================================


app.get("/profile",
requireLogin,
async(req,res)=>{


try{


const user =
await User.findById(

req.session.userId

)

.select("-password -verificationToken");



res.json({

success:true,

user

});


}



catch(err){


console.error(err);


res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// UPDATE PROFILE
// ======================================


app.put("/profile",
requireLogin,
async(req,res)=>{


try{


const {

firstName,

secondName,

phone,

dob,

nationality


}=req.body;



const user =
await User.findById(

req.session.userId

);



if(!user){


return res.status(404).json({

success:false,

message:"User not found"

});


}



user.firstName=firstName;

user.secondName=secondName;

user.phone=phone;

user.dob=dob;

user.nationality=nationality;



await user.save();



res.json({

success:true,

message:"Profile updated",

user

});


}



catch(err){


console.error(err);


res.status(500).json({

success:false,

message:"Server Error"

});


}


});





// ======================================
// PROTECTED PAGES
// ======================================


app.get("/explore",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"explore.html"
)

);


});



app.get("/messages",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"messages.html"
)

);


});



app.get("/bookings",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"bookings.html"
)

);


});



app.get("/profile-page",
requireLogin,
(req,res)=>{


res.sendFile(

path.join(
__dirname,
"profile.html"
)

);


});





// ======================================
// 404
// ======================================


app.use((req,res)=>{


res.status(404).send(

"<h2>404 - Page Not Found</h2>"

);


});





// ======================================
