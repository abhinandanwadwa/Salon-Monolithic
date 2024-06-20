import jwt from "jsonwebtoken";

const generateToken = (res, user) => {
  const token = jwt.sign({ 
    _id: user._id,
    role: user.role,
   }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.cookie("jwt", token, {
    httpOnly: false,
    secure: true,
    sameSite: "None",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export default generateToken;
